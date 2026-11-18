// 赶海：落潮的滩涂上点记号走过去挖，潮水一点点涨回来。
import { genBeach, waterline, digSpot, WALK, DIG, BEACH_TIME } from '../logic/beach.js';
import { GOODS } from '../logic/state.js';
import { nameOf } from '../logic/econ.js';
import { DAYS } from '../data/plan.js';
import { sfx, ambience } from '../audio.js';
import { $, el } from './dom.js';

export function runBeach(app) {
  const S = app.S, plan = DAYS[S.day];
  const B = genBeach(S);
  const root = $('#beach'), cv = $('#beach-c'), ui = $('#beach-ui');
  root.hidden = false;
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const me = { x: 0.5, y: 0.0, tx: 0.5, ty: 0.0, target: null, dig: 0, face: 1 };
  let t = 0, started = false, over = false, last = performance.now();
  const pops = [];
  const got = { goods: {}, items: [] };
  ambience(0.18, false);

  const top = () => 54, bottom = () => 40;
  const sy = y => H - bottom() - y * (H - top() - bottom());
  const sx = x => 24 + x * (W - 48);
  const fromScreen = (px, py) => [(px - 24) / (W - 48), (H - bottom() - py) / (H - top() - bottom())];

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  return new Promise(resolve => {
    ui.innerHTML = '';
    const timeBar = el('div', { class: 'bar2' }, el('i', { style: 'width:100%' }));
    const count = el('span', { text: '篓里：0' });
    const leaveBtn = el('button', { class: 'btn small', text: '上岸', onclick: () => end('上岸了。') });
    ui.append(el('b', { text: `${plan.date} · 赶海` }), timeBar, count, leaveBtn);
    const tipText = `退潮了，今天的潮能落到${plan.amp >= .85 ? '黑礁跟前' : plan.amp >= .6 ? '滩的深处' : plan.amp >= .4 ? '滩的中段' : '近岸一小片'}。点滩上的记号，走过去挖：\n· 一串小孔——蛤蜊、蛏子　· 冒泡的——蟹、章鱼\n· 闪光的——玻璃、铜钱、小物件　· 鼓包——底下埋着大件\n潮水会一点点涨回来，越远的地方越早淹。被水追上就得往回跑。`;
    const tip = el('div', { id: 'beach-tip' }, el('div', { style: 'white-space:pre-wrap', text: (S.flags.shitouFair && !S.flags.beachOnce ? '小石头蹲在堤上冲你喊：\n' : '') + tipText }),
      el('div', { style: 'text-align:right;margin-top:8px' }, el('button', { class: 'btn primary small', text: '下滩', onclick: () => { tip.remove(); started = true; last = performance.now(); } })));
    root.append(tip);
    S.flags.beachOnce = true;

    cv.onpointerdown = e => {
      if (!started || over) return;
      const r = cv.getBoundingClientRect();
      const [x, y] = fromScreen(e.clientX - r.left, e.clientY - r.top);
      let best = null, bd = 1e9;
      for (const s of B.spots) {
        if (s.dug || s.y > waterline(B.amp, t)) continue;
        const d = Math.hypot(sx(s.x) - (e.clientX - r.left), sy(s.y) - (e.clientY - r.top));
        if (d < 34 && d < bd) { bd = d; best = s; }
      }
      me.target = best; me.dig = 0;
      me.tx = best ? best.x : Math.min(1, Math.max(0, x));
      me.ty = best ? best.y : Math.min(1, Math.max(0, y));
    };

    function end(msg) {
      if (over) return; over = true;
      root.querySelector('#beach-tip')?.remove();
      const lines = [];
      for (const [k, n] of Object.entries(got.goods)) lines.push(`${GOODS[k].name} ×${n}`);
      for (const it of got.items) lines.push(nameOf(it));
      const box = el('div', { id: 'beach-tip' }, el('b', { text: msg }),
        el('div', { style: 'margin-top:6px;white-space:pre-wrap', text: lines.length ? '篓里：' + lines.join('、') + (Object.keys(got.goods).length ? '\n海货傍晚鱼贩来收，东西进了库房。' : '\n东西进了库房，回铺子再细看。') : '空手回来了。' }),
        el('div', { style: 'text-align:right;margin-top:8px' }, el('button', { class: 'btn primary small', text: '回铺子开门', onclick: () => { root.hidden = true; root.querySelector('#beach-tip')?.remove(); window.removeEventListener('resize', resize); cancelAnimationFrame(raf); resolve(got); } })));
      root.append(box);
    }

    let raf = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (started && !over) step(dt);
      draw(now / 1000);
    }
    function step(dt) {
      t += dt;
      const wl = waterline(B.amp, t);
      timeBar.firstChild.style.width = Math.max(0, 100 - t / BEACH_TIME * 100) + '%';
      if (t >= BEACH_TIME || wl < 0.015) { sfx.splash(); end('潮水涨回岸边了。'); return; }
      if (me.y > wl - 0.01) { sfx.splash(); me.target = null; me.tx = me.x; me.ty = Math.max(0, wl - 0.08); if (!pops.some(p => p.chase)) pops.push({ x: me.x, y: me.y, text: '水追上来了！', t: 1.5, chase: true }); }
      const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy);
      if (d > 0.004) { const s = Math.min(d, WALK * dt); me.x += dx / d * s; me.y += dy / d * s; if (dx) me.face = dx > 0 ? 1 : -1; me.dig = 0; }
      else if (me.target && !me.target.dug) {
        me.dig += dt;
        if (me.dig >= DIG) {
          if (me.target.y > waterline(B.amp, t)) { me.target = null; return; }
          const res = digSpot(S, B, me.target);
          sfx.dig();
          if (res.goods) { got.goods[res.goods] = (got.goods[res.goods] || 0) + 1; pops.push({ x: me.target.x, y: me.target.y, text: '+' + GOODS[res.goods].name, t: 1.2 }); }
          else { got.items.push(res.item); pops.push({ x: me.target.x, y: me.target.y, text: '+' + nameOf(res.item), t: 1.8, big: true }); sfx.find(); }
          count.textContent = `篓里：${Object.values(got.goods).reduce((a, b) => a + b, 0) + got.items.length}`;
          me.target = null; me.dig = 0;
        }
      }
    }
    function draw(T) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 滩
      const sand = g.createLinearGradient(0, H, 0, 0);
      sand.addColorStop(0, '#c9ae82'); sand.addColorStop(0.5, '#9a8260'); sand.addColorStop(1, '#6a5a44');
      g.fillStyle = sand; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const yy = top() + i * (H - top()) / 26; g.beginPath(); for (let x = 0; x <= W; x += 16) g.lineTo(x, yy + Math.sin(x * 0.03 + i) * 3); g.stroke(); }
      // 黑礁
      g.fillStyle = '#2a2622';
      for (const [x, y, r] of [[0.82, 0.9, 0.09], [0.9, 0.82, 0.06], [0.12, 0.95, 0.07], [0.7, 0.97, 0.05]]) { g.beginPath(); g.ellipse(sx(x), sy(y), r * W * 0.6, r * H * 0.25, 0, 0, 7); g.fill(); }
      // 堤岸
      g.fillStyle = '#6a5a4a'; g.fillRect(0, H - bottom() + 6, W, bottom());
      g.fillStyle = '#4a3e32'; for (let x = 0; x < W; x += 34) g.fillRect(x, H - bottom() + 6, 32, 14);
      // 记号
      const wl = waterline(B.amp, started ? t : 0);
      for (const s of B.spots) {
        const X = sx(s.x), Y = sy(s.y);
        if (s.dug) { g.fillStyle = 'rgba(40,30,20,.45)'; g.beginPath(); g.ellipse(X, Y, 10, 5, 0, 0, 7); g.fill(); continue; }
        drawSign(g, s, X, Y, T);
      }
      // 海
      const WY = sy(wl);
      const sea = g.createLinearGradient(0, 0, 0, WY);
      sea.addColorStop(0, '#24505e'); sea.addColorStop(1, '#3f7f8f');
      g.fillStyle = sea; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
      for (let x = W; x >= 0; x -= 10) g.lineTo(x, WY + Math.sin(x * 0.02 + T * 1.8) * 5 + Math.sin(x * 0.05 - T) * 2);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= W; x += 10) g.lineTo(x, WY + Math.sin(x * 0.02 + T * 1.8) * 5 + Math.sin(x * 0.05 - T) * 2);
      g.stroke();
      // 人
      drawMe(g, sx(me.x), sy(me.y), me, T);
      // 飘字
      for (const p of pops) {
        p.t -= 1 / 60;
        if (p.t <= 0) continue;
        g.save(); g.globalAlpha = Math.min(1, p.t); g.fillStyle = p.big ? '#fff3c0' : '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3;
        g.font = `${p.big ? 18 : 15}px "Songti SC","STSong","SimSun",serif`; g.textAlign = 'center';
        const yy = sy(p.y) - 30 - (1.8 - p.t) * 20; g.strokeText(p.text, sx(p.x), yy); g.fillText(p.text, sx(p.x), yy); g.restore();
      }
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t <= 0) pops.splice(i, 1);
    }
    raf = requestAnimationFrame(frame);
  });
}

function drawSign(g, s, X, Y, T) {
  g.save();
  switch (s.sign) {
    case 'holes': g.fillStyle = 'rgba(30,22,14,.8)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X + (i % 3 - 1) * 6, Y + Math.floor(i / 3) * 5 - 2, 2, 0, 7); g.fill(); } break;
    case 'bubbles': g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const k = (T * 0.8 + i / 3) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.arc(X + (i - 1) * 6, Y - k * 10, 2 + k * 3, 0, 7); g.stroke(); } break;
    case 'shell': g.fillStyle = '#e8d8c0'; g.beginPath(); g.moveTo(X - 7, Y + 3); g.quadraticCurveTo(X, Y - 10, X + 7, Y + 3); g.closePath(); g.fill(); g.strokeStyle = '#8a6a4a'; g.stroke(); break;
    case 'glint': { const k = (Math.sin(T * 3 + s.i) + 1) / 2; g.fillStyle = `rgba(255,250,220,${0.4 + k * 0.6})`; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 2 : 6 + k * 4; g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); } g.fill(); break; }
    case 'shard': g.fillStyle = '#eef2f4'; g.beginPath(); g.moveTo(X - 6, Y); g.lineTo(X, Y - 5); g.lineTo(X + 7, Y - 1); g.lineTo(X + 2, Y + 4); g.fill(); g.fillStyle = '#3a5a9a'; g.fillRect(X - 2, Y - 2, 4, 2); break;
    case 'mound': g.fillStyle = 'rgba(60,45,30,.5)'; g.beginPath(); g.ellipse(X + 3, Y + 4, 16, 6, 0, 0, 7); g.fill(); g.fillStyle = '#b09670'; g.beginPath(); g.ellipse(X, Y, 15, 7, 0, Math.PI, 0); g.fill(); break;
    case 'wreck':
      g.strokeStyle = '#2a1e14'; g.lineWidth = 5;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(X + i * 14, Y + 10); g.quadraticCurveTo(X + i * 16, Y - 14, X + i * 10, Y - 26); g.stroke(); }
      g.lineWidth = 6; g.beginPath(); g.moveTo(X - 50, Y + 10); g.lineTo(X + 50, Y + 10); g.stroke();
      { const k = (Math.sin(T * 3) + 1) / 2; g.fillStyle = `rgba(255,250,220,${0.4 + k * 0.6})`; g.beginPath(); g.arc(X, Y, 4 + k * 3, 0, 7); g.fill(); }
      break;
  }
  if (s.story && s.sign !== 'wreck') { g.strokeStyle = 'rgba(255,240,200,.5)'; g.setLineDash([3, 3]); g.beginPath(); g.arc(X, Y, 18, 0, 7); g.stroke(); }
  g.restore();
}

function drawMe(g, X, Y, me, T) {
  const step = me.dig > 0 ? 0 : Math.sin(T * 12) * 2;
  g.save(); g.translate(X, Y);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 2, 12, 4, 0, 0, 7); g.fill();
  g.strokeStyle = '#2a1c14'; g.lineWidth = 3; g.beginPath(); g.moveTo(-3, -12); g.lineTo(-4 + step, 0); g.moveTo(3, -12); g.lineTo(4 - step, 0); g.stroke();
  g.fillStyle = '#3a5a6a'; g.fillRect(-7, -28, 14, 17);
  g.fillStyle = '#e2b994'; g.beginPath(); g.arc(0, -33, 6, 0, 7); g.fill();
  g.fillStyle = '#d6b060'; g.beginPath(); g.moveTo(-13, -35); g.lineTo(0, -45); g.lineTo(13, -35); g.closePath(); g.fill();
  // 篓
  g.fillStyle = '#8a6a3a'; g.fillRect(me.face * 7 - 4, -22, 9, 10);
  if (me.dig > 0) {
    const k = me.dig / DIG;
    g.strokeStyle = '#5a4020'; g.lineWidth = 2; g.beginPath(); g.moveTo(me.face * 8, -18); g.lineTo(me.face * (14 + Math.sin(k * 30) * 3), -2); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-14, -54, 28, 4); g.fillStyle = '#fff3c0'; g.fillRect(-14, -54, 28 * k, 4);
  }
  g.restore();
}
