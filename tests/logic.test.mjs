// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, hash } from '../src/logic/rng.js';
import { newHaggle, offer, estimate, trueValue, allDetails, detailsOf } from '../src/logic/econ.js';
import { newGame, makeItem, discover, buildQueue, startDay, openShop, save, load, SAVE_KEY, judge, bestAnswers, addClue } from '../src/logic/state.js';
import { ITEMS } from '../src/data/items.js';
import { DAYS, LAST_DAY } from '../src/data/plan.js';
import { CLUES, QUESTIONS, LEDGER, ENDINGS } from '../src/data/text.js';
import { PEOPLE } from '../src/data/people.js';
import { SCRIPTS } from '../src/story/scripts.js';
import { playGame } from '../tools/bot.mjs';

test('随机数按种子可复现', () => {
  const a = rng(hash(42, 'x', 3)), b = rng(hash(42, 'x', 3)), c = rng(hash(42, 'x', 4));
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('数据互相对得上：剧情、人、线索、当簿', () => {
  assert.equal(DAYS.length, LAST_DAY + 1);
  for (const d of DAYS) for (const e of d.events) assert.ok(SCRIPTS[e], '缺剧情 ' + e);
  for (const [k, T] of Object.entries(ITEMS)) {
    for (const det of allDetails(T)) if (det.clue) assert.ok(CLUES[det.clue], `${k} 的细节指向不存在的线索 ${det.clue}`);
    assert.ok(T.faces && T.faces.length, k + ' 没有面');
  }
  for (const p of LEDGER) if (p.key) assert.ok(CLUES[p.key], '当簿线索 ' + p.key);
  for (const Q of QUESTIONS.filter(q => q.need)) assert.ok(Object.values(CLUES).some(c => (c.q || []).includes(Q.id)), '没有线索能回答 ' + Q.id);
  for (const k of ['dawn', 'lamp', 'calm', 'ebb', 'silence']) assert.ok(ENDINGS[k], '缺结局 ' + k);
  for (const P of Object.values(PEOPLE)) assert.ok(P.name && P.look);
});

test('讨价还价：照价成交，压得太狠客人会走', () => {
  const h = newHaggle({ side: 'pay', ask: 20, limit: 12, patience: 3 });
  assert.equal(offer(h, 20).res, 'deal');
  const h2 = newHaggle({ side: 'pay', ask: 20, limit: 12, patience: 2 });
  let r;
  for (let i = 0; i < 5 && (!r || r.res !== 'leave'); i++) r = offer(h2, 3);
  assert.equal(r.res, 'leave');
  assert.ok(r.insult);
  // 在底线以上还价，客人会让一步
  const h3 = newHaggle({ side: 'pay', ask: 20, limit: 12, patience: 3 });
  const c = offer(h3, 14);
  assert.equal(c.res, 'counter');
  assert.ok(c.ask < 20 && c.ask > 14);
  // 卖东西那一头反过来
  const g = newHaggle({ side: 'get', ask: 10, limit: 18, patience: 3 });
  assert.equal(offer(g, 10).res, 'deal');
  assert.notEqual(offer(newHaggle({ side: 'get', ask: 10, limit: 18, patience: 3 }), 40).res, 'deal');
});

test('看得越全，估价越窄，真价落在区间里', () => {
  const S = newGame(7);
  let checked = 0;
  for (const t of Object.keys(ITEMS)) {
    if (ITEMS[t].letter) continue;
    const it = makeItem(S, t);
    const e0 = estimate(it);
    for (const d of detailsOf(it)) discover(S, it, d.id);
    it.cov = 1; it.w = true;
    const e1 = estimate(it);
    assert.ok(e1.spread < e0.spread, t);
    const v = trueValue(it);
    assert.ok(v >= e1.lo - 1e-9 && v <= e1.hi + 1e-9, `${t}: 真价 ${v} 不在 ${e1.lo}–${e1.hi}`);
    checked++;
  }
  assert.ok(checked > 20);
});

test('同一局同一天的客人顺序固定（读档能重放）', () => {
  for (const day of [0, 3, 8]) {
    const a = newGame(99), b = newGame(99);
    a.day = b.day = day;
    startDay(a); startDay(b);
    openShop(a, false); openShop(b, false);
    assert.deepEqual(a.queue, b.queue);
    assert.deepEqual(buildQueue(a), a.queue);
    if (DAYS[day].events.includes('zheng_final')) assert.equal(a.queue[a.queue.length - 1].id, 'zheng_final');
  }
});

test('存档读档；大版本不同的存档不认', () => {
  const mem = new Map();
  const store = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  const S = newGame(5);
  S.cash = 123; makeItem(S, 'ring');
  save(S, store);
  const L = load(store);
  assert.equal(L.cash, 123);
  assert.equal(L.seed, 5);
  mem.set(SAVE_KEY, JSON.stringify({ ...S, ver: '9.0.0' }));
  assert.equal(load(store), null);
  mem.set(SAVE_KEY, '{坏了');
  assert.equal(load(store), null);
});

test('对质：凭据够三条才算翻案', () => {
  const S = newGame(1);
  for (const id of ['bottle_letter', 'stub', 'ledger_serial']) addClue(S, id);
  assert.ok(S.clues.serial_match, '存根和当簿对上票号');
  const j = judge(S, bestAnswers(S));
  assert.equal(j.truth, true);
  assert.equal(judge(S, { light: 'bottle_letter' }).truth, false);
  // 没拿到的线索不能拿来说
  assert.equal(judge(newGame(2), { light: 'logbook', who: 'stub', drunk: 'logbook' }).truth, false);
});

test('整局：各种玩法都能玩完，结局都走得到', async () => {
  const seen = new Set();
  const runs = [
    [{ eye: .9, greed: .3, beach: true }, {}],
    [{ eye: .6, greed: .4, beach: true }, {}],
    [{ eye: .3, greed: .3, beach: false }, {}],
    [{ eye: .6, greed: .4, beach: true }, { zheng_final: 1 }],
  ];
  for (const [skill, policy] of runs) {
    for (let i = 1; i <= 12; i++) {
      const g = await playGame(i * 7919, skill, policy);
      assert.ok(ENDINGS[g.end], '结局 ' + g.end);
      assert.equal(g.S.day, LAST_DAY);
      assert.ok(Number.isFinite(g.cash));
      seen.add(g.end);
    }
  }
  for (const k of ['dawn', 'calm', 'silence']) assert.ok(seen.has(k), '没走到结局 ' + k + '，走到的：' + [...seen]);
});

test('经济：会下滩的寻常掌柜大多还得上债，不下滩的眼拙掌柜还不上', async () => {
  let paid = 0, poor = 0;
  for (let i = 1; i <= 20; i++) {
    const g = await playGame(i * 104729, { eye: .6, greed: .4, beach: true });
    if (g.debt === 'paid' || g.debt === 'clear') paid++;
    const p = await playGame(i * 104729, { eye: .3, greed: .3, beach: false });
    if (p.debt !== 'paid' && p.debt !== 'clear') poor++;
  }
  assert.ok(paid >= 14, `寻常掌柜 20 局只还上 ${paid} 局`);
  assert.ok(poor >= 14, `眼拙不下滩 20 局有 ${20 - poor} 局还上了`);
});
