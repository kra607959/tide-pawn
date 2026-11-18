// 用无头 Edge / Chrome 按真实时钟开页、点按钮、截图，不靠应用里的浏览器面板。
//   node tools/shots.mjs                       全部场景，桌面和手机两种尺寸
//   node tools/shots.mjs --only day0,late      只截某几个场景
//   node tools/shots.mjs --sizes 390x844       只截某种尺寸
//   node tools/shots.mjs --out 目录             截图放哪（默认 shots/）
//   node tools/shots.mjs --url https://kra607959.github.io/tide-pawn/  检查线上版本
// 后几天的场景先用机器人把一局玩到那天早上，再把存档塞进页面。
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { playGame } from './bot.mjs';
import { SAVE_KEY } from '../src/logic/state.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const only = option('--only')?.split(',');
const out = path.resolve(option('--out') || path.join(root, 'shots'));
const sizes = (option('--sizes') || '1280x720,390x844').split(',').map(s => s.split('x').map(Number));
const browser = process.env.TIDE_BROWSER || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));
if (!browser) throw new Error('找不到浏览器：设置 TIDE_BROWSER 指向 Chrome / Edge');

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => err ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = option('--url') || `http://127.0.0.1:${server.address().port}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'tide-shots-'));
const proc = spawn(browser, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore', windowsHide: true });
fs.mkdirSync(out, { recursive: true });

// 页面里的小助手：像个不动脑子的玩家，一步一步点下去，直到 stop() 成立
const HELPER = `
window.__step = async function (n, ms, stop) {
  const sleep = t => new Promise(r => setTimeout(r, t));
  for (let i = 0; i < n; i++) {
    await sleep(ms);
    if (stop && stop()) return 'stop';
    const sh = document.querySelector('#sheet:not([hidden])');
    if (sh) {
      const b = [...sh.querySelectorAll('.btn.primary')].pop() || [...sh.querySelectorAll('.foot .btn')].pop();
      if (b) { b.click(); continue; }
    }
    const tb = document.querySelector('.title-box .btn.primary'); if (tb) { tb.click(); continue; }
    if (!document.querySelector('#beach').hidden) {
      const b = [...document.querySelectorAll('#beach .btn.primary')].pop() || [...document.querySelectorAll('#beach .btn')].pop();
      if (b) b.click();
      continue;
    }
    const c = window.__tide && window.__tide.counter; if (!c) continue;
    const ch = document.querySelectorAll('#act .choices button'); if (ch.length) { ch[0].click(); continue; }
    if (c.deal_) { const b = [...document.querySelectorAll('#act .deal .btn')]; if (b[1]) b[1].click(); await sleep(1000); continue; }
    const pk = document.querySelector('#act .pick button:not([disabled])'); if (pk) { pk.click(); continue; }
    const look = [...document.querySelectorAll('#act .btn.primary')].find(b => b.textContent === '看好了'); if (look) { look.click(); continue; }
    c.advance();
  }
  return 'done';
};`;

let ws, seq = 0;
const waiting = new Map();
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++seq; waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function openPage(w, h, save) {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const mobile = h > w;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }, sessionId);
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  let src = HELPER;
  if (save) src += `\nif (!sessionStorage.getItem('shots.once')) { sessionStorage.setItem('shots.once', '1'); localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))}); }`;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: src }, sessionId);
  return {
    w, h, mobile, sessionId,
    async go() {
      await send('Page.navigate', { url }, sessionId);
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if (await this.ev(`!!(window.__tide && document.querySelector('.title-box .btn.primary'))`)) { await sleep(200); return; }
        await sleep(100);
      }
      throw new Error('30 秒内游戏未就绪：' + await this.ev(`document.querySelector('#boot-err')?.textContent || location.href`));
    },
    async ev(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(name) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const file = path.join(out, `${name}-${w}x${h}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log('  截图', path.relative(root, file));
    },
    async move(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId); },
    async click(x, y) {
      if (mobile) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }, sessionId); await sleep(60); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId); return; }
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }, sessionId);
    },
    async drag(points) { // 依次拖过这些点（手机按住拖，桌面直接移动）
      if (!mobile) { for (const [x, y] of points) { await this.move(x, y); await sleep(110); } return; }
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0][0], y: points[0][1] }] }, sessionId);
      for (const [x, y] of points.slice(1)) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }, sessionId); await sleep(110); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    async close() { await send('Target.closeTarget', { targetId }); await send('Target.disposeBrowserContext', { browserContextId }); },
  };
}

const RECT = sel => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`;
const SKILL = { eye: .8, greed: .3, beach: true };
const toEvening = `__step(260, 110, () => __tide.S.phase === 'evening' && !!document.querySelector('#sheet:not([hidden])'))`;

// 在盘子上来回扫放大镜
async function sweep(p, steps = 16) {
  const [x, y, w, h] = await p.ev(RECT('#tray'));
  const pts = [];
  for (let i = 0; i < steps; i++) pts.push([x + w * (0.3 + 0.4 * (i / steps)), y + h * (0.42 + 0.12 * Math.sin(i * 0.8))]);
  pts.push(pts[pts.length - 1], pts[pts.length - 1]);
  await p.drag(pts);
}

const SCENES = {
  title: { async run(p) { await p.go(); await sleep(800); await p.shot('title'); } },
  day0: {
    async run(p) {
      await p.go();
      await p.ev(`__step(60, 150, () => !!(__tide.counter && __tide.counter.deal_))`);
      await sleep(500); await p.shot('deal-start');
      await sweep(p);
      await sleep(400); await p.shot('deal-lens');
      await p.ev(toEvening);
      await sleep(500); await p.shot('evening-0');
    },
  },
  boat: { // 初六傍晚：何先生来收货、当簿
    save: () => playGame(4242, SKILL, {}, false, 3),
    async run(p) {
      await p.go();
      await p.ev(`document.querySelector('.title-box .btn.primary').click()`); await sleep(800);
      await p.shot('morning-3');
      await p.ev(toEvening);
      await sleep(500); await p.shot('evening-boat');
    },
  },
  beach: { // 十五的大潮：能走到沉船那里
    save: () => playGame(4242, SKILL, {}, false, 9),
    async run(p) {
      await p.go();
      await p.ev(`document.querySelector('.title-box .btn.primary').click()`); await sleep(800);
      await p.shot('morning-15');
      await p.ev(`[...document.querySelectorAll('#sheet .btn')].find(b => b.textContent.includes('下滩')).click()`); await sleep(900);
      await p.shot('beach-intro');
      await p.ev(`(() => { const b = [...document.querySelectorAll('#beach .btn.primary')].pop(); if (b) b.click(); })()`); await sleep(600);
      const [x, y, w, h] = await p.ev(RECT('#beach-c'));
      await p.click(x + w * 0.55, y + h * 0.3); await sleep(3500);
      await p.shot('beach-walk');
      await p.ev(`__step(400, 120, () => !document.querySelector('#beach').hidden && !!document.querySelector('#beach .btn.primary'))`);
      await sleep(300); await p.shot('beach-end');
    },
  },
  late: { // 十二：洪伯回来、库房、笔记
    save: () => playGame(4242, SKILL, {}, false, 7),
    async run(p) {
      await p.go();
      await p.ev(`document.querySelector('.title-box .btn.primary').click()`); await sleep(600);
      await p.ev(`__step(80, 140, () => __tide.S.phase === 'shop' && __tide.counter.cur === 'hong')`);
      await p.ev(`__step(6, 300)`);
      await sleep(300); await p.shot('hong');
      await p.ev(toEvening);
      await p.ev(`document.querySelector('#sheet').hidden = true; __tide.openPanel('notes')`); await sleep(500); await p.shot('notes');
      await p.ev(`__tide.openPanel('store')`); await sleep(500); await p.shot('store');
      await p.ev(`document.querySelector('#sheet .item-card').click()`); await sleep(700);
      const [x, y, w, h] = await p.ev(RECT('#sheet canvas'));
      await p.drag([[x + w * .4, y + h * .4], [x + w * .5, y + h * .45], [x + w * .55, y + h * .5], [x + w * .55, y + h * .5]]);
      await sleep(500); await p.shot('examine');
    },
  },
  finale: { // 十五夜：收账、对质、结局
    save: () => playGame(4242, { eye: .95, greed: .3, beach: true }, {}, false, 9),
    async run(p) {
      await p.go();
      await p.ev(`__step(500, 100, () => !!document.querySelector('#sheet:not([hidden]) select'))`);
      await sleep(400); await p.shot('deduction');
      await p.ev(`(async () => {
        const { CLUES, QUESTIONS } = await import('./src/data/text.js');
        const sels = [...document.querySelectorAll('#sheet select')];
        QUESTIONS.forEach((Q, i) => { const s = sels[i]; const o = [...s.options].find(o => o.value && (CLUES[o.value].q || []).includes(Q.id)); if (o) s.value = o.value; });
      })()`);
      await sleep(200); await p.shot('deduction-filled');
      await p.ev(`[...document.querySelectorAll('#sheet .btn.primary')].pop().click()`); await sleep(600);
      await p.shot('verdict');
      await p.ev(`__step(10, 300, () => __tide.S.phase === 'end')`);
      await sleep(600); await p.shot('ending');
    },
  },
};

try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').split('\n');
  ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('连不上浏览器')); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') { console.log('  页面出错：', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); process.exitCode = 1; }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { console.log('  控制台：', m.params.args.map(a => a.value ?? a.description).join(' ')); process.exitCode = 1; }
  };
  for (const [name, sc] of Object.entries(SCENES)) {
    if (only && !only.includes(name)) continue;
    const save = sc.save ? (await sc.save()).S : null;
    for (const [w, h] of sizes) {
      console.log(`${name} ${w}×${h}`);
      const p = await openPage(w, h, save);
      const t0 = Date.now();
      try { await sc.run(p); } catch (e) { console.log('  ✗', e.message); process.exitCode = 1; }
      console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
      await p.close();
    }
  }
  await send('Browser.close').catch(() => {});
} finally {
  ws?.close(); proc.kill(); server.close();
  await sleep(400);
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch {}
}
