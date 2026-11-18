// 机器人掌柜：在 node 里把整局走一遍，用来调数值、查结局走不走得到。
// skill.eye   看出每处细节的概率        skill.greed  压价的狠劲（0 厚道 – 1 黑心）
// skill.beach 是否下滩                   policy       剧情选项：{ 剧情id: 选项下标 }
import { rng, hash } from '../src/logic/rng.js';
import { estimate, newHaggle, offer, detailsOf, trueValue, buyerTerms, heOffer, catOf, redeemPrice } from '../src/logic/econ.js';
import {
  newGame, startDay, openShop, closeDay, nextDay, readLedger, applyDeal, applySale, applyRedeem, gainItem, dropItem,
  discover, addClue, changeRep, changeCash, own, heBuy, settleDebt, judge, bestAnswers, endingOf, isLast, today,
} from '../src/logic/state.js';
import { runVisit } from '../src/story/index.js';
import { genBeach, waterline, digSpot, WALK, DIG, BEACH_TIME, SIGN_HOPE } from '../src/logic/beach.js';
import { DAYS } from '../src/data/plan.js';
import { ITEMS } from '../src/data/items.js';

export class Bot {
  constructor(S, skill, policy = {}) {
    this.S = S; this.skill = skill; this.policy = policy; this.r = rng(hash(S.seed, 'bot', skill.eye, skill.greed));
    this.cur = null; this.log = [];
  }
  examine(it) {
    for (const d of detailsOf(it)) {
      if (it.f.includes(d.id)) continue;
      if (this.r() < this.skill.eye) {
        const clue = discover(this.S, it, d.id);
        if (clue) this.log.push(`  线索 ${clue}`);
      }
    }
    it.cov = this.skill.eye; it.w = true;
  }
  async enter(pid) { this.cur = pid; }
  async leave() { this.cur = null; }
  async say() {}
  mood() {}
  tip() {}
  async hints() {}
  async choose(labels) {
    const id = this.scriptId;
    const k = this.policy[id] ?? 0;
    return Math.min(k, labels.length - 1);
  }
  async show(it) { this.examine(it); }
  async deal(spec) {
    const S = this.S, it = spec.item;
    this.examine(it);
    const est = estimate(it).mid;
    const g = this.skill.greed;
    const cap = est * (spec.kind === 'pawn' ? 0.62 : 0.68) * (1 - g * 0.25);
    const h = newHaggle({ side: 'pay', ask: spec.ask, limit: spec.limit, patience: spec.patience });
    if (S.cash <= 0) return { ok: false };
    // 不识货的人：厚道的机器人给公道价
    if (spec.persona?.naive && g < 0.5) {
      const p = Math.max(spec.ask, Math.round(est * 0.5));
      if (p > S.cash) return { ok: false };
      applyDeal(S, spec, p); return { ok: true, price: p };
    }
    if (spec.ask <= cap * 0.6 || (spec.persona?.dear && g < 0.5 && spec.ask <= est * 0.8)) {
      if (spec.ask > S.cash) return { ok: false };
      applyDeal(S, spec, spec.ask); return { ok: true, price: spec.ask };
    }
    let x = Math.max(1, Math.round(Math.min(spec.ask, est * (0.35 - g * 0.1))));
    for (let i = 0; i < 8 && !h.over; i++) {
      if (x > cap || x > S.cash) break;
      const res = offer(h, x);
      if (res.res === 'deal') { applyDeal(S, spec, res.price); return { ok: true, price: res.price }; }
      if (res.res === 'leave') return { ok: false, left: true };
      if (res.res === 'counter' && h.ask <= cap && h.ask <= S.cash) { const r2 = offer(h, h.ask); if (r2.res === 'deal') { applyDeal(S, spec, r2.price); return { ok: true, price: r2.price }; } }
      x = Math.round(x + Math.max(1, (Math.min(h.ask, cap) - x) * 0.5));
    }
    return { ok: false };
  }
  async sell(spec) {
    const S = this.S;
    const cands = own(S, 'shop').filter(it => spec.want.includes(catOf(it)) && !ITEMS[it.t].letter && !this.keep(it));
    if (!cands.length) return { ok: false };
    cands.forEach(it => this.examine(it));
    const it = cands.sort((a, b) => estimate(b).mid - estimate(a).mid)[0];
    const est = estimate(it).mid;
    const t = buyerTerms(it, spec.persona || {}, S.rep, this.r);
    const h = newHaggle({ side: 'get', ...t });
    let x = Math.round(est * 1.35);
    const floor = Math.max(heOffer(it), est * 0.85);
    for (let i = 0; i < 8 && !h.over; i++) {
      if (x < floor) break;
      const res = offer(h, x);
      if (res.res === 'deal') { applySale(S, it, res.price); return { ok: true, item: it, price: res.price }; }
      if (res.res === 'leave') return { ok: false };
      if (res.res === 'counter' && h.ask >= floor) { const r2 = offer(h, h.ask); if (r2.res === 'deal') { applySale(S, it, r2.price); return { ok: true, item: it, price: r2.price }; } }
      x = Math.round(x - Math.max(1, (x - Math.max(h.ask, floor)) * 0.5));
    }
    return { ok: false };
  }
  keep(it) { return it.t === 'hong_watch' || it.t === 'logbook'; }
  gain(it) { gainItem(this.S, it); }
  drop(it) { dropItem(this.S, it); }
  redeem(it) { return applyRedeem(this.S, it); }
  clue(id) { addClue(this.S, id); }
  rep(n) { changeRep(this.S, n); }
  cash(n) { changeCash(this.S, n); }
  flag(k) { return this.S.flags[k]; }
  set(k, v = true) { this.S.flags[k] = v; }

  beach() {
    const S = this.S;
    const B = genBeach(S);
    S.stats.beachTrips++;
    let t = 0, x = 0.5, y = 0;
    const found = [];
    for (;;) {
      let best = null, bestScore = 0;
      for (const s of B.spots) {
        if (s.dug) continue;
        const d = Math.hypot(s.x - x, s.y - y);
        const arrive = t + d / WALK;
        if (s.y > waterline(B.amp, arrive + DIG) - 0.02) continue;
        const hope = s.sign === 'wreck' ? 150 : s.story ? 80 : SIGN_HOPE[s.sign];
        const score = hope / (d / WALK + DIG + 0.5);
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (!best) break;
      t += Math.hypot(best.x - x, best.y - y) / WALK + DIG;
      x = best.x; y = best.y;
      if (t > BEACH_TIME) break;
      const res = digSpot(S, B, best);
      found.push(res.goods || res.item.t);
    }
    return found;
  }
}

// 整局：返回结局与账目
export async function playGame(seed, skill, policy = {}, verbose = false, stopDay = -1) {
  const S = newGame(seed);
  const bot = new Bot(S, skill, policy);
  const trace = [];
  for (;;) {
    startDay(S);
    if (S.day === stopDay) return { S }; // 截图工具：停在这一天的早晨
    const plan = today(S);
    let beachFinds = [];
    if (!plan.noBeach && skill.beach) beachFinds = bot.beach();
    openShop(S, !skill.beach || plan.noBeach);
    for (const entry of S.queue) {
      bot.scriptId = entry.id || entry.k;
      await runVisit(bot, entry);
      S.qi++;
    }
    const sum = closeDay(S);
    if (plan.boat) {
      for (const it of own(S, 'shop')) {
        if (bot.keep(it) && !isLast(S)) continue;
        if (it.t === 'logbook' || it.t === 'crew_photo') continue;
        const p = heOffer(it);
        if (p > 0) heBuy(S, it, p);
      }
    }
    readLedger(S);
    trace.push(`${plan.date} 现钱${S.cash} 口碑${S.rep} 库房${own(S, 'shop').length} 当出${own(S, 'pawn').length} 滩${beachFinds.length}`);
    if (isLast(S)) break;
    nextDay(S);
  }
  const debt = settleDebt(S);
  if (!S.flags.soldLog) {
    const j = judge(S, bestAnswers(S));
    S.flags.truth = j.truth;
  }
  const end = endingOf(S);
  if (verbose) console.log(trace.join('\n'));
  return { S, end, debt, cash: S.cash, rep: S.rep, clues: S.clueOrder.length, trace, log: bot.log };
}
