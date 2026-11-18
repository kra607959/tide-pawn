// 赶海：落潮时滩涂露出来，潮水一点点涨回去。
// 坐标：x 0–1 从左到右；y 0–1 从岸边往海里（越大越远、越深）。
import { DAYS } from '../data/plan.js';
import { rng, hash, weighted } from './rng.js';
import { makeItem, gainItem } from './state.js';

export const BEACH_TIME = 46;     // 秒：从最低潮到淹回岸边
export const WALK = 0.24;         // 每秒走多远
export const DIG = 1.4;           // 挖一处要多久

const SHALLOW = [['clam', 5], ['razor', 4], ['crab', 2], ['seaglass', 2], ['junk', 2], ['button', .7], ['cash', .7]];
const MID = [['crab', 3], ['conch', 3], ['octopus', 1], ['razor', 2], ['seaglass', 2], ['cash', 1.5], ['dollar', .6], ['shard', 2], ['bottle', 1], ['junk', 3], ['ring', .3]];
const DEEP = [['octopus', 2], ['conch', 3], ['crab', 2], ['shard', 3], ['dollar', .8], ['cash', 2], ['junk', 3], ['compass', .3], ['spyglass', .25], ['watch', .2], ['lantern', .4]];
export const GOODS_KINDS = ['clam', 'razor', 'crab', 'conch', 'octopus'];

const SIGN = {
  clam: 'holes', razor: 'holes', crab: 'bubbles', octopus: 'bubbles', conch: 'shell',
  seaglass: 'glint', button: 'glint', cash: 'glint', dollar: 'glint', ring: 'glint', junk: 'glint', bottle: 'glint',
  shard: 'shard', compass: 'mound', spyglass: 'mound', watch: 'glint', lantern: 'mound',
};

const STORY = {
  3: [{ t: 'bottle_letter', x: .74, y: .29, sign: 'glint' }],
  6: [{ t: 'porthole_ws', x: .3, y: .56, sign: 'mound' }],
  8: [{ t: 'bell_ws', x: .62, y: .79, sign: 'mound' }],
  9: [{ t: 'logbook', x: .5, y: .9, sign: 'wreck' }, { t: 'compass', x: .2, y: .8, sign: 'mound' }],
};

export function genBeach(S) {
  const plan = DAYS[S.day];
  const r = rng(hash(S.seed, 'beach', S.day));
  const amp = plan.amp;
  const spots = [];
  const n = Math.round(7 + 12 * amp);
  for (let i = 0; i < n; i++) {
    const y = 0.05 + r() * Math.max(0.05, amp - 0.07);
    let x = 0.06 + r() * 0.88;
    const zone = y < 0.3 ? SHALLOW : y < 0.6 ? MID : DEEP;
    const k = weighted(r, zone);
    const goods = GOODS_KINDS.includes(k);
    spots.push({ i, x, y, sign: SIGN[k], kind: goods ? 'goods' : 'item', k, story: false });
  }
  for (const s of STORY[S.day] || []) {
    if (s.y > amp + 0.01) continue;
    spots.push({ i: spots.length, x: s.x, y: s.y, sign: s.sign, kind: 'item', k: s.t, story: true });
  }
  // 互相让开一点
  for (const a of spots) for (const b of spots) {
    if (a === b) continue;
    const dx = a.x - b.x, dy = a.y - b.y;
    if (dx * dx + dy * dy < 0.0025 && !a.story) a.x = Math.min(0.95, Math.max(0.05, a.x + (dx >= 0 ? 0.06 : -0.06)));
  }
  return { amp, spots, seed: hash(S.seed, 'beachItems', S.day) };
}

// t 秒时，水边在哪（y 大于它的地方都淹着）
export function waterline(amp, t) {
  const k = Math.min(1, Math.max(0, t / BEACH_TIME));
  return amp * (1 - Math.pow(k, 1.5));
}

// 挖开一处：海货记进篓子，物件进库房
export function digSpot(S, beach, spot) {
  spot.dug = true;
  S.stats.finds++;
  if (spot.kind === 'goods') {
    S.goods[spot.k] = (S.goods[spot.k] || 0) + 1;
    return { goods: spot.k };
  }
  const it = makeItem(S, spot.k, { r: rng(hash(beach.seed, spot.i)), noFake: true });
  it.from = 'beach';
  gainItem(S, it);
  return { item: it };
}

// 不知道底下是什么时，看记号大概能值多少（机器人用）
export const SIGN_HOPE = { holes: 1, bubbles: 3, shell: 2, glint: 4, shard: 3, mound: 14, wreck: 60 };
