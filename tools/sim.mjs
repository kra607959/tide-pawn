// 让几种掌柜各玩一百局，看钱够不够、各个结局走不走得到。
//   node tools/sim.mjs            汇总
//   node tools/sim.mjs --one 7    看第 7 局逐日账目
import { playGame } from './bot.mjs';

const SKILLS = {
  '眼拙不下滩': { eye: 0.3, greed: 0.3, beach: false },
  '眼拙下滩': { eye: 0.3, greed: 0.3, beach: true },
  '寻常': { eye: 0.6, greed: 0.4, beach: true },
  '老练': { eye: 0.9, greed: 0.5, beach: true },
  '老练厚道': { eye: 0.9, greed: 0.1, beach: true },
  '老练黑心': { eye: 0.9, greed: 0.9, beach: true },
};
const POLICIES = {
  默认: {},
  卖当簿: { zheng_ledger: 1 },
  卖日志: { zheng_final: 1 },
  洪伯卖回: { hong_return: 1 },
};

const args = process.argv.slice(2);
if (args[0] === '--one') {
  const seed = Number(args[1] || 1);
  const sk = SKILLS[args[2] || '寻常'];
  const g = await playGame(seed, sk, {}, true);
  console.log(g.log.join('\n'));
  console.log('结局', g.end, '还账', g.debt, '现钱', g.cash, '线索', g.S.clueOrder.join(' '));
  process.exit(0);
}

const N = Number(args[0]) || 100;
for (const [pname, policy] of Object.entries(POLICIES)) {
  console.log(`\n== 剧情选择：${pname}`);
  for (const [name, sk] of Object.entries(SKILLS)) {
    const ends = {}; let cash = 0, paid = 0, rep = 0, clues = 0, minCash = 1e9, maxCash = -1e9;
    for (let i = 1; i <= N; i++) {
      const g = await playGame(i * 7919, sk, policy);
      ends[g.end] = (ends[g.end] || 0) + 1;
      const c = g.cash + (g.debt === 'paid' ? 300 : 0);
      cash += c; minCash = Math.min(minCash, c); maxCash = Math.max(maxCash, c);
      if (g.debt === 'paid' || g.debt === 'clear') paid++;
      rep += g.rep; clues += g.clues;
    }
    const e = Object.entries(ends).map(([k, v]) => `${k}${Math.round(v * 100 / N)}%`).join(' ');
    console.log(`${name.padEnd(6, '　')} 十五夜可用钱 均${Math.round(cash / N)}（${minCash}–${maxCash}） 还上${Math.round(paid * 100 / N)}% 口碑${Math.round(rep / N)} 线索${(clues / N).toFixed(1)} | ${e}`);
  }
}
