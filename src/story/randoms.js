// 街坊：随机来当、来卖、来买、来赎的客人。同一局同一天同一位，重开也一样。
import { PEOPLE, TOWNSFOLK } from '../data/people.js';
import { ITEMS, ITEM_POOLS, SCAMS, SCAM_VARIANT } from '../data/items.js';
import { DAYS, LAST_DAY } from '../data/plan.js';
import { rng, pick, weighted } from '../logic/rng.js';
import { makeItem, own, findItem } from '../logic/state.js';
import { sellerTerms, trueValue, nameOf, fairness, catOf, detailsOf } from '../logic/econ.js';

export const CAT_WORD = { 首饰: '首饰', 表: '怀表', 玉: '玉器', 瓷: '瓷器', 钱: '老钱', 船具: '船上的家什', 文玩: '文玩', 杂: '稀罕玩意儿' };

const OPEN = {
  pawn: ['掌柜的，这东西押几天，手头紧。', '家里等米下锅，先当几天，过两天准来赎。', '船回来就有钱了，先押在您这儿。', '孩子要交束脩，这个先当了。'],
  sell: ['这东西家里用不上了，您给个价。', '收不收？换几个钱。', '老家翻出来的，您掌掌眼。', '搬家清出来的，占地方。'],
  scam: ['小掌柜，有缘！这可是好东西，要不是急着赶路……', '祖上传下来的，您识货，一看就知道。', '实话说，这东西在城里能卖大价钱，我是急用钱才拿到镇上来。'],
  naive: ['也不知道值不值钱，您看着给点就行。', '我男人留下的，我也不懂，您给个公道价。'],
  dear: ['这是我娘留下的……要不是实在没法子，我不会拿出来。', '这东西跟了我半辈子了。您仔细着点。'],
  storm: ['船困在港里，走不了，盘缠不够了。', '这雨下得，船出不去，先当点钱吃饭。'],
};
const BUY_OPEN = ['掌柜的，有没有{cat}？想挑一样。', '听说潮生当换了新掌柜，我来看看有什么{cat}。', '想买件{cat}送人，您这儿有吗？'];

function persona(r, pid, motive, it) {
  const p = {};
  const plain = ['xiaomei', 'agui', 'wang', 'majie'].includes(pid);
  if (motive !== 'buy' && r() < (plain ? 0.35 : 0.08)) p.naive = true;
  else if (motive === 'pawn' && r() < 0.3) p.dear = true;
  if (PEOPLE[pid].rich) p.rich = true;
  return p;
}

export async function randomVisit(c, seed) {
  const S = c.S;
  const r = rng(seed);
  const plan = DAYS[S.day];
  const key = 'd' + S.day;
  const seen = S.met[key] || [];
  let pool = TOWNSFOLK.filter(p => !seen.includes(p));
  if (plan.storm) pool = pool.filter(p => ['liu', 'agui', 'wang', 'zhao', 'kexiang'].includes(p)).concat(pool).slice(0, 6);
  const pid = pick(r, pool.length ? pool : TOWNSFOLK);
  S.met[key] = [...seen, pid];
  const P = PEOPLE[pid];

  const sellable = own(S, 'shop').filter(it => trueValue(it) >= 3 && !ITEMS[it.t].letter && !ITEMS[it.t].keep);
  const buyW = S.day === 0 || !sellable.length ? 0 : 2 + Math.min(4, sellable.length);
  const motive = weighted(r, [['pawn', plan.storm ? 6 : 4], ['sell', 4], ['buy', buyW]]);
  if (motive === 'buy') return buyer(c, r, pid, sellable);

  // 拿什么来
  const scamming = motive === 'sell' && r() < (['zhao', 'kexiang'].includes(pid) ? 0.4 : 0.15);
  let it;
  const per = persona(r, pid, motive);
  if (scamming) {
    const choices = Object.keys(SCAMS).filter(t => ITEM_POOLS[P.pool].includes(t) || ITEM_POOLS.any.includes(t));
    const t = pick(r, choices);
    it = makeItem(S, t, { r, v: SCAM_VARIANT[t], force: [SCAMS[t]] });
    per.scam = true; delete per.naive; delete per.dear;
  } else {
    const t = pick(r, ITEM_POOLS[P.pool]);
    it = makeItem(S, t, { r, noFake: r() < 0.75 });
    if (detailsOf(it).some(d => d.fake)) per.fooled = true;
  }

  await c.enter(pid, per.dear ? 'sad' : per.scam ? 'happy' : null);
  let open = per.scam ? OPEN.scam : per.naive ? OPEN.naive : per.dear ? OPEN.dear : plan.storm && motive === 'pawn' ? OPEN.storm : OPEN[motive];
  await c.say(pid, pick(r, open));

  const terms = sellerTerms(it, motive === 'pawn' ? 'pawn' : 'buy', per, r);
  const spec = { kind: motive === 'pawn' ? 'pawn' : 'buy', item: it, who: pid, persona: per, ...terms };
  if (motive === 'pawn') {
    spec.term = 3;
    const chance = per.dear ? 0.85 : S.day >= 6 ? 0.75 : 0.6;
    spec.rd = r() < chance ? Math.min(LAST_DAY, S.day + 1 + Math.floor(r() * 3)) : -1;
    if (spec.rd > S.day + spec.term) spec.rd = S.day + spec.term;
  }
  const res = await c.deal(spec);
  if (res.ok) {
    if (per.naive) {
      const f = fairness(res.price, it);
      if (f === 'fair') { c.rep(2); await c.say(pid, '您是个厚道人。', 'happy'); }
      else if (f === 'gouge') { c.rep(-3); await c.say('me', '这价钱……他要是知道了，怕是要骂人。'); }
    } else if (per.scam && res.price > trueValue(it) * 2 + 2) {
      S.stats.scammed++;
    }
  }
  await c.leave();
}

async function buyer(c, r, pid, sellable) {
  const P = PEOPLE[pid];
  const cats = [...new Set(sellable.map(catOf))];
  const want = pick(r, cats);
  await c.enter(pid);
  await c.say(pid, pick(r, BUY_OPEN).replace('{cat}', CAT_WORD[want]));
  const res = await c.sell({ who: pid, want: [want], persona: { rich: !!P.rich } });
  if (res.ok) await c.say(pid, pick(r, ['东西不错。', '包好了，谢谢掌柜。', '就它了。']), 'happy');
  await c.leave();
}

export async function redeemVisit(c, uid) {
  const it = findItem(c.S, uid);
  if (!it || it.own !== 'pawn') return;
  await c.enter(it.owner, 'happy');
  await c.say(it.owner, `我来赎${nameOf(it)}，当票在这儿。`);
  const pay = c.redeem(it);
  await c.say('nar', `连本带利，${pay} 块。`);
  await c.leave();
}
