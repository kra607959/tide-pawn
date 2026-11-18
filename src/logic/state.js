// 一局的全部状态都在这一个可以 JSON 存档的对象里。
import { ITEMS } from '../data/items.js';
import { DAYS, LAST_DAY } from '../data/plan.js';
import { CLUES, LEDGER, QUESTIONS } from '../data/text.js';
import { rng, hash, weighted } from './rng.js';
import { DEBT, START_CASH, DAILY_COST, allDetails, trueValue } from './econ.js';

export const SAVE_KEY = 'tidepawn.save.v1';
export const VERSION = '0.1.0';

export function newGame(seed = (Math.random() * 2 ** 31) | 0) {
  return {
    ver: VERSION, seed, day: 0, phase: 'morning',
    cash: START_CASH, debt: DEBT, rep: 50,
    items: [], uid: 1, clues: {}, clueOrder: [], flags: {}, goods: {},
    queue: [], qi: 0, early: false, beachDone: false,
    ledgerRead: 0, met: {}, log: [], answers: null, ending: null,
    stats: { bought: 0, pawned: 0, sold: 0, spent: 0, earned: 0, redeemed: 0, forfeits: 0, scammed: 0, beachTrips: 0, finds: 0 },
  };
}

export const today = S => DAYS[S.day];
export const isLast = S => S.day === LAST_DAY;

// —— 物件 ——
export function makeItem(S, t, opts = {}) {
  const T = ITEMS[t];
  if (!T) throw new Error('没有这种东西：' + t);
  const r = opts.r || rng(hash(S.seed, 'item', S.uid));
  let v = opts.v || T.v || null;
  if (!v && T.variants) v = weighted(r, Object.entries(T.variants).map(([k, x]) => [k, x.w || 1]));
  let d;
  if (T.fixed) d = T.fixed.map(x => x.id);
  else d = rollDetails(T, v, r, opts);
  const it = { uid: 'i' + S.uid++, t, v, d, f: [], cov: 0, w: false, own: 'shop', day: S.day };
  if (opts.name) it.name = opts.name;
  if (opts.from) it.from = opts.from;
  if (T.hands) it.hands = T.hands;
  else if (T.draw === 'watch') it.hands = [Math.floor(r() * 12) + 1, Math.floor(r() * 12) * 5];
  it.seed = Math.floor(r() * 1e9);
  return it;
}

function rollDetails(T, v, r, opts) {
  const d = [];
  const excl = new Set();
  const pool = T.pool || [];
  for (const x of pool) {
    if (x.req) continue;
    if (x.only && !x.only.includes(v)) continue;
    if (x.excl && excl.has(x.excl)) continue;
    if (x.not && d.includes(x.not)) continue;
    let p = x.p ?? 0;
    if (opts.force && opts.force.includes(x.id)) p = 1;
    else if (x.fake && opts.noFake) p = 0;
    else if (opts.clean && x.mod != null && x.mod < 1) p = 0;
    if (r() < p) { d.push(x.id); if (x.excl) excl.add(x.excl); }
  }
  for (const x of pool) if (x.req && d.includes(x.req) && (!x.only || x.only.includes(v))) d.push(x.id);
  return d;
}

export const own = (S, kind) => S.items.filter(it => it.own === kind);
export const findItem = (S, uid) => S.items.find(it => it.uid === uid);
export const hasItem = (S, t) => S.items.some(it => it.t === t && (it.own === 'shop' || it.own === 'pawn'));
export const shopItem = (S, t) => S.items.find(it => it.t === t && it.own === 'shop');

// 发现一处细节；返回新记下的线索 id（若有）
export function discover(S, it, detailId) {
  if (it.f.includes(detailId)) return null;
  it.f.push(detailId);
  const det = allDetails(ITEMS[it.t]).find(x => x.id === detailId);
  if (det && det.clue) return addClue(S, det.clue) ? det.clue : null;
  return null;
}

export function addClue(S, id) {
  if (!CLUES[id]) throw new Error('没有这条线索：' + id);
  if (S.clues[id]) return false;
  S.clues[id] = { day: S.day };
  S.clueOrder.push(id);
  if (S.clues.stub && S.clues.ledger_serial && !S.clues.serial_match) {
    S.clues.serial_match = { day: S.day };
    S.clueOrder.push('serial_match');
  }
  return true;
}

export function changeRep(S, n) { S.rep = Math.max(0, Math.min(100, S.rep + n)); }
export function changeCash(S, n) {
  S.cash += n;
  if (n < 0) S.stats.spent -= n; else S.stats.earned += n;
}

// —— 一天 ——
export function startDay(S) {
  S.phase = 'morning';
  S.early = false;
  S.beachDone = false;
  S.queue = [];
  S.qi = 0;
}

export function openShop(S, early) {
  S.early = !!early;
  S.phase = 'shop';
  S.queue = buildQueue(S);
  S.qi = 0;
}

export function buildQueue(S) {
  const plan = DAYS[S.day];
  const r = rng(hash(S.seed, 'queue', S.day));
  const story = [], last = [];
  for (const e of plan.events) (e === 'zheng_final' ? last : story).push({ k: 's', id: e });
  const others = [];
  // 随机当户来赎当
  for (const it of S.items) if (it.own === 'pawn' && it.rd === S.day) others.push({ k: 'redeem', uid: it.uid });
  let n = plan.rand + (S.early ? 1 : 0) + (S.rep >= 65 ? 1 : 0) - (S.rep < 30 ? 1 : 0);
  for (let i = 0; i < n; i++) others.push({ k: 'r', seed: hash(S.seed, 'rand', S.day, i) });
  // 剧情客人打头，其余穿插
  const q = [];
  if (S.day === 0) { q.push(...story); q.push(...others); }
  else {
    const all = [...story];
    for (const o of others) all.splice(1 + Math.floor(r() * all.length), 0, o);
    q.push(...all);
  }
  q.push(...last);
  return q;
}

// 收市：死当、海货、开销
export function closeDay(S) {
  const sum = { forfeits: [], goods: [], goodsCash: 0, cost: DAILY_COST };
  for (const it of S.items) {
    if (it.own === 'pawn' && it.due <= S.day) {
      it.own = 'shop'; it.forfeit = true; it.owner = it.owner || null;
      sum.forfeits.push(it.uid);
      S.stats.forfeits++;
    }
  }
  for (const [k, n] of Object.entries(S.goods)) {
    if (!n) continue;
    const price = GOODS[k].price * n;
    sum.goods.push({ k, n, price });
    sum.goodsCash += price;
    S.goods[k] = 0;
  }
  changeCash(S, sum.goodsCash);
  changeCash(S, -DAILY_COST);
  S.phase = 'evening';
  return sum;
}

export function ledgerPage(S) {
  if (S.flags.ledgerSold) return null;
  if (S.ledgerRead >= LEDGER.length) return null;
  if (S.ledgerRead > S.day) return null;
  return LEDGER[S.ledgerRead];
}
export function readLedger(S) {
  const p = ledgerPage(S);
  if (!p) return null;
  S.ledgerRead++;
  const clue = p.key && addClue(S, p.key) ? p.key : null;
  return { page: p, clue };
}

export function nextDay(S) {
  S.day++;
  startDay(S);
}

// 海货：鱼贩傍晚按斤收
export const GOODS = {
  clam: { name: '花蛤', price: 1 },
  razor: { name: '蛏子', price: 1 },
  crab: { name: '青蟹', price: 3 },
  conch: { name: '海螺', price: 2 },
  octopus: { name: '章鱼', price: 4 },
};

// —— 十五夜 ——
export function clueAnswers(id) { return CLUES[id]?.q || []; }
export function judge(S, answers) {
  // answers: { questionId: clueId }
  let right = 0;
  const res = {};
  for (const Q of QUESTIONS) {
    const c = answers[Q.id];
    const ok = !!c && clueAnswers(c).includes(Q.id) && !!S.clues[c];
    res[Q.id] = ok;
    if (ok && Q.need) right++;
  }
  return { res, truth: right >= 3, right };
}

// 最好的一组答案（模拟和提示用）
export function bestAnswers(S) {
  const a = {};
  for (const Q of QUESTIONS) {
    const c = S.clueOrder.find(id => clueAnswers(id).includes(Q.id));
    if (c) a[Q.id] = c;
  }
  return a;
}

export function endingOf(S) {
  if (S.flags.soldLog) return 'silence';
  const truth = !!S.flags.truth;
  const paid = S.debt <= 0;
  return truth ? (paid ? 'dawn' : 'lamp') : (paid ? 'calm' : 'ebb');
}

// —— 成交 ——
export function applyDeal(S, spec, price) {
  const it = spec.item;
  if (!S.items.includes(it)) S.items.push(it);
  changeCash(S, -price);
  it.from = spec.who || it.from;
  if (spec.kind === 'pawn') {
    it.own = 'pawn'; it.loan = price; it.due = S.day + spec.term; it.owner = spec.who; it.rd = spec.rd ?? -1;
    S.stats.pawned++;
  } else {
    it.own = 'shop'; it.cost = price;
    S.stats.bought++;
  }
}
export function applySale(S, it, price) {
  it.own = 'sold'; it.price = price;
  changeCash(S, price);
  S.stats.sold++;
}
export function applyRedeem(S, it) {
  const pay = Math.ceil(it.loan * 1.2);
  it.own = 'gone';
  changeCash(S, pay);
  S.stats.redeemed++;
  return pay;
}
export function gainItem(S, it) {
  if (!S.items.includes(it)) S.items.push(it);
  it.own = 'shop';
}
export function dropItem(S, it) { it.own = 'gone'; }

export function shopWorth(S) {
  return own(S, 'shop').reduce((s, it) => s + trueValue(it), 0);
}

export function save(S, store) {
  try { store.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 存不了就算了 */ }
}
export function load(store) {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const S = JSON.parse(raw);
    if (!S || !S.ver || S.ver.split('.')[0] !== VERSION.split('.')[0]) return null;
    return S;
  } catch (e) { return null; }
}

// 何先生收货
export function heBuy(S, it, price) {
  applySale(S, it, price);
  it.soldTo = 'he';
}

// 十五夜还账
export function settleDebt(S) {
  if (S.debt <= 0) return 'clear';
  if (S.cash >= S.debt) { changeCash(S, -S.debt); S.debt = 0; return 'paid'; }
  return 'short';
}
