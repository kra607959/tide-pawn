// 估价、讨价还价、当票——不碰画面，浏览器和 node 模拟共用。
import { ITEMS } from '../data/items.js';

export const RATE = 0.2;          // 当期内赎回加二成利
export const HE_RATE = 0.9;       // 何先生收货按实价九折
export const DAILY_COST = 3;      // 每晚灯油饭钱
export const DEBT = 300;
export const START_CASH = 40;
export const FACE_NAMES = { front: '正面', back: '背面', inside: '里面', bottom: '底部' };

export const tplOf = it => ITEMS[it.t];
export const allDetails = T => [...(T.fixed || []), ...(T.pool || [])];
export function detailsOf(it) {
  const all = allDetails(tplOf(it));
  return it.d.map(id => all.find(x => x.id === id)).filter(Boolean);
}
export const variantOf = it => { const T = tplOf(it); return T.variants ? T.variants[it.v] : null; };
export const nameOf = it => it.name || variantOf(it)?.name || tplOf(it).name;
export const baseOf = it => it.base ?? variantOf(it)?.base ?? tplOf(it).base;
export const catOf = it => tplOf(it).cat;
export const facesOf = it => tplOf(it).faces;

// 同组细节只算一次
function product(list, pick) {
  const seen = new Set();
  let m = 1;
  for (const d of list) {
    const key = d.g || d.id;
    if (seen.has(key)) continue;
    const v = pick(d);
    if (v == null) continue;
    seen.add(key);
    m *= v;
  }
  return m;
}

export const trueValue = it => baseOf(it) * product(detailsOf(it), d => d.mod ?? null);
// 外行看上去值多少：假货按它冒充的东西算
export const looksValue = it => baseOf(it) * product(detailsOf(it), d => d.looks ?? (d.fake ? null : d.mod ?? null));
export const money = x => Math.max(0, Math.round(x));

// 你心里的估价：只认看出来的细节；看得越全，区间越窄
export function estimate(it) {
  const found = detailsOf(it).filter(d => it.f.includes(d.id));
  const mid = baseOf(it) * product(found, d => d.mod ?? null);
  const cov = Math.min(1, it.cov || 0);
  const spread = Math.max(0.1, 0.5 - 0.34 * cov - (it.w ? 0.06 : 0));
  return { mid, lo: mid * (1 - spread), hi: mid * (1 + spread), spread };
}

export const heOffer = it => money(trueValue(it) * HE_RATE);
export const redeemPrice = loan => Math.ceil(loan * (1 + RATE));

// —— 讨价还价 ——
// side 'pay'：你掏钱（收当、收购），客人有开价 ask 和底线 limit（不低于这个才肯）。
// side 'get'：你收钱（卖给客人），客人有出价 ask 和上限 limit（不高于这个才肯）。
export function newHaggle({ side, ask, limit, patience }) {
  return { side, ask, limit, patience, start: patience, counters: 0, tries: 0, over: false };
}

export function offer(h, x) {
  x = Math.round(x);
  h.tries++;
  const pay = h.side === 'pay';
  const better = pay ? x >= h.ask : x <= h.ask;        // 对客人来说不比他开的差
  const within = pay ? x >= h.limit : x <= h.limit;     // 在他能接受的范围里
  if (better) { h.over = true; return { res: 'deal', price: x, generous: pay ? x > h.ask * 1.15 + 1 : x < h.ask * 0.87 - 1 }; }
  if (within) {
    const gap = Math.abs(h.ask - x);
    if (h.counters < 2 && gap >= 2 && h.patience > 1) {
      h.counters++;
      h.patience -= 0.5;
      h.ask = Math.round(x + (h.ask - x) * 0.5);
      if (h.ask === x) { h.over = true; return { res: 'deal', price: x }; }
      return { res: 'counter', ask: h.ask };
    }
    h.over = true;
    return { res: 'deal', price: x };
  }
  const insult = pay ? x < h.limit * 0.6 : x > h.limit * 1.5;
  h.patience -= insult ? 2 : 1;
  if (h.patience <= 0) { h.over = true; return { res: 'leave', insult }; }
  // 客人松一点口
  h.ask = pay ? Math.max(h.limit, Math.round(h.ask - (h.ask - h.limit) * 0.3))
    : Math.min(h.limit, Math.round(h.ask + (h.limit - h.ask) * 0.3));
  return { res: 'no', insult, ask: h.ask };
}

// 客人对自己东西的估计 → 开价、底线
export function sellerTerms(it, kind, persona, r) {
  const V = trueValue(it), L = looksValue(it);
  let P;
  if (persona.naive) P = V * (0.3 + 0.2 * r());
  else if (persona.scam || persona.fooled) P = L * (0.9 + 0.2 * r());
  else if (persona.dear) P = V * (1.2 + 0.25 * r());
  else P = V * (0.85 + 0.3 * r());
  const ask = Math.max(1, Math.round(P * (kind === 'pawn' ? 0.5 : 0.65)));
  const des = persona.scam ? 0.45 + 0.15 * r() : 0.58 + 0.26 * r();
  const limit = Math.max(1, Math.min(ask, Math.round(ask * des)));
  return { ask, limit, patience: persona.patience ?? 3 + Math.floor(r() * 2) };
}

// 客人来买：先出低价，心里有个上限；口碑好的铺子客人肯多掏
export function buyerTerms(it, persona, rep, r) {
  const V = trueValue(it);
  const f = 0.9 + rep / 500;
  const limit = Math.max(1, Math.round(V * (1.1 + 0.3 * r() + (persona.rich ? 0.2 : 0)) * f));
  const ask = Math.max(1, Math.round(V * (0.62 + 0.1 * r()) * f));
  return { ask: Math.min(ask, limit), limit, patience: 3 };
}

// 公道与否：付给不识货的人多少
export function fairness(price, it) {
  const V = trueValue(it);
  if (V < 2) return 'fair';
  const k = price / V;
  return k >= 0.45 ? 'fair' : k < 0.25 ? 'gouge' : 'low';
}
