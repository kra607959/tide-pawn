// 一位客人：按队列里的条目分派到剧情、街坊或赎当。
import { SCRIPTS } from './scripts.js';
import { randomVisit, redeemVisit } from './randoms.js';

export async function runVisit(c, entry) {
  if (entry.k === 's') return SCRIPTS[entry.id](c);
  if (entry.k === 'r') return randomVisit(c, entry.seed);
  if (entry.k === 'redeem') return redeemVisit(c, entry.uid);
  throw new Error('不认识的客人：' + JSON.stringify(entry));
}
