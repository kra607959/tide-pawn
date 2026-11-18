// 铺子里：背后的窗外是海湾和灯塔，潮水按时辰涨落；门帘上一个「当」字。
import { drawPerson } from './people.js';

const lerp = (a, b, k) => a + (b - a) * k;
function mix(c1, c2, k) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, k)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
  return `rgb(${r},${g},${bl})`;
}

// 一天里（0 清早 – 1 入夜）的天色
export function skyColors(tod, weather) {
  const keys = [
    [0, '#f3d9b0', '#bcd3dc'], [0.2, '#cfe3ee', '#8fb6cf'], [0.6, '#bcd9ea', '#6f9fbf'],
    [0.85, '#f2b47a', '#c97a5a'], [1, '#3a3f66', '#1d2240'],
  ];
  let i = 0; while (i < keys.length - 2 && tod > keys[i + 1][0]) i++;
  const [t0, a0, b0] = keys[i], [t1, a1, b1] = keys[i + 1];
  const k = Math.min(1, Math.max(0, (tod - t0) / (t1 - t0)));
  let top = mix(a0, a1, k), bot = mix(b0, b1, k);
  if (weather === '风雨') { top = '#7d8790'; bot = '#5c666f'; }
  else if (weather === '雨后' || weather === '多云') { top = mix(top.startsWith('#') ? top : '#cfd8de', '#cfd6da', 0); }
  return { top, bot };
}

// 潮高（-1 最低 – 1 最高），hours 为一天中的钟点
export function tideAt(hours, lowStr, amp) {
  const [h, m] = lowStr.split(':').map(Number);
  const low = h + m / 60;
  return -Math.cos((hours - low) / 12.42 * Math.PI * 2) * (0.35 + 0.65 * amp);
}

export function drawShop(g, W, H, st) {
  const { t = 0, tod = 0.3, plan, person, enter = 1 } = st;
  const weather = plan ? plan.weather : '晴';
  const night = st.night || false;
  // —— 墙 ——
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#5a3a22'); wall.addColorStop(1, '#3a2414');
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.18;
  for (let x = 0; x < W; x += Math.max(18, W / 26)) { g.fillStyle = (Math.floor(x / 7) % 2) ? '#000' : '#7a5232'; g.fillRect(x, 0, 2, H); }
  g.restore();
  // 灯光
  const lamp = g.createRadialGradient(W * 0.52, H * 0.05, 10, W * 0.52, H * 0.3, Math.max(W, H) * 0.7);
  lamp.addColorStop(0, night ? 'rgba(255,200,120,.45)' : 'rgba(255,220,160,.22)'); lamp.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);

  // —— 窗 ——
  const wx = W * 0.05, wy = H * 0.1, ww = W * 0.4, wh = H * 0.52;
  drawWindow(g, wx, wy, ww, wh, { t, tod, plan, weather, night });
  // —— 门与门帘 ——
  const dx = W * 0.7, dy = H * 0.06, dw = W * 0.24, dh = H * 0.8;
  g.save();
  g.beginPath(); g.rect(dx, dy, dw, dh); g.clip();
  drawOutside(g, dx, dy, dw, dh, { t, tod, plan, weather, night, door: true });
  g.restore();
  g.fillStyle = '#2a180c'; g.fillRect(dx - 8, dy - 8, dw + 16, 10); g.fillRect(dx - 8, dy, 8, dh); g.fillRect(dx + dw, dy, 8, dh);
  // 门帘
  const sway = Math.sin(t * 0.8) * (weather === '风雨' ? 10 : 3);
  g.beginPath(); g.moveTo(dx, dy + 2); g.lineTo(dx + dw, dy + 2); g.lineTo(dx + dw + sway * 0.3, dy + dh * 0.42); g.quadraticCurveTo(dx + dw / 2 + sway, dy + dh * 0.46, dx + sway * 0.3, dy + dh * 0.42); g.closePath();
  g.fillStyle = '#2d4a5c'; g.fill(); g.strokeStyle = '#1a2a34'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#efe3c4'; g.beginPath(); g.arc(dx + dw / 2 + sway * 0.4, dy + dh * 0.21, Math.min(dw, dh) * 0.13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2d4a5c'; g.font = `bold ${Math.round(Math.min(dw, dh) * 0.17)}px "Songti SC","STSong","SimSun",serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('當', dx + dw / 2 + sway * 0.4, dy + dh * 0.215);

  // —— 架子 ——
  const sx = W * 0.47, sy = H * 0.12;
  g.fillStyle = '#2e1c10';
  for (let i = 0; i < 2; i++) g.fillRect(sx, sy + i * H * 0.17, W * 0.2, 5);
  const jars = ['#6a7a5a', '#8a5a3a', '#4a5a6a', '#9a8a6a', '#5a4a3a'];
  for (let i = 0; i < 5; i++) { const jx = sx + 10 + i * W * 0.038, jh = H * (0.06 + (i % 3) * 0.02); g.fillStyle = jars[i]; g.fillRect(jx, sy - jh, W * 0.028, jh); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(jx + 3, sy - jh + 3, 3, jh - 6); }
  for (let i = 0; i < 3; i++) { const bx = sx + 6 + i * W * 0.065; g.fillStyle = ['#7a2a20', '#3a4a5a', '#6a5a2a'][i]; g.fillRect(bx, sy + H * 0.17 - H * 0.07, W * 0.055, H * 0.07); }

  // —— 客人 ——
  if (person) {
    const k = Math.min(H * 1.02, W * 0.95);
    const px = W * 0.5 + (1 - enter) * W * 0.35;
    g.save(); g.globalAlpha = Math.min(1, enter * 1.4);
    g.translate(px, H * 0.98); g.scale(k, k);
    drawPerson(g, person.look, { mood: person.mood, t, blink: person.blink, talk: person.talk });
    g.restore();
  }

  // —— 柜台 ——
  const cy = H * 0.84;
  const ct = g.createLinearGradient(0, cy, 0, H);
  ct.addColorStop(0, '#7a4a26'); ct.addColorStop(0.15, '#5a3218'); ct.addColorStop(1, '#2e1a0c');
  g.fillStyle = ct; g.fillRect(0, cy, W, H - cy);
  g.fillStyle = 'rgba(255,220,170,.25)'; g.fillRect(0, cy, W, 3);
  // 吊灯
  g.strokeStyle = '#1a1008'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.52, 0); g.lineTo(W * 0.52, H * 0.06); g.stroke();
  g.fillStyle = night ? '#ffd98a' : '#e8c070'; g.beginPath(); g.ellipse(W * 0.52, H * 0.075, W * 0.025, H * 0.025, 0, 0, Math.PI * 2); g.fill();
}

function drawWindow(g, x, y, w, h, o) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  drawOutside(g, x, y, w, h, o);
  g.restore();
  // 窗框
  g.strokeStyle = '#2a180c'; g.lineWidth = Math.max(4, w * 0.025);
  g.strokeRect(x, y, w, h);
  g.lineWidth = Math.max(2, w * 0.012);
  g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.42); g.lineTo(x + w, y + h * 0.42); g.stroke();
  g.fillStyle = '#4a2c16'; g.fillRect(x - 6, y + h, w + 12, Math.max(6, h * 0.05));
}

// 窗外/门外：天、海、灯塔、船
export function drawOutside(g, x, y, w, h, o) {
  const { t, tod, plan, weather, night } = o;
  const sky = skyColors(night ? 1 : tod, weather);
  const sg = g.createLinearGradient(0, y, 0, y + h);
  sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bot);
  g.fillStyle = sg; g.fillRect(x, y, w, h);
  const horizon = y + h * 0.45;
  // 远山
  g.fillStyle = night ? '#1e2238' : weather === '风雨' ? '#5a646c' : '#7a90a0';
  g.beginPath(); g.moveTo(x, horizon); for (let i = 0; i <= 10; i++) g.lineTo(x + w * i / 10, horizon - h * (0.04 + 0.05 * Math.abs(Math.sin(i * 1.7)))); g.lineTo(x + w, horizon); g.fill();
  // 海
  const hours = 9 + (tod || 0) * 10;
  const tide = plan ? tideAt(hours, plan.low, plan.amp) : 0;
  const sea = horizon;
  const seaG = g.createLinearGradient(0, sea, 0, y + h);
  seaG.addColorStop(0, night ? '#20284a' : weather === '风雨' ? '#4a5a62' : '#4f8aa0'); seaG.addColorStop(1, night ? '#101830' : weather === '风雨' ? '#2e3a40' : '#2d5a6e');
  g.fillStyle = seaG; g.fillRect(x, sea, w, y + h - sea);
  // 滩涂：潮低时露出来
  const shoreTop = y + h * (0.78 - tide * 0.14);
  g.fillStyle = night ? '#2a2420' : '#8a7458';
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, shoreTop + h * 0.04);
  for (let i = 0; i <= 12; i++) g.lineTo(x + w * i / 12, shoreTop + Math.sin(i * 1.3 + t * 0.6) * 2 + (i / 12) * h * 0.05);
  g.lineTo(x + w, y + h); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i <= 24; i++) { const xx = x + w * i / 24, yy = shoreTop + Math.sin(i * 0.65 + t * 0.6) * 2 + (i / 24) * h * 0.05 - 1; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
  g.stroke();
  // 浪
  g.strokeStyle = weather === '风雨' ? 'rgba(230,240,240,.5)' : 'rgba(255,255,255,.25)'; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const yy = sea + (shoreTop - sea) * (0.2 + i * 0.13); const off = (t * (10 + i * 3)) % w; g.beginPath(); g.moveTo(x + off, yy); g.lineTo(x + off + w * 0.12, yy); g.stroke(); g.beginPath(); g.moveTo(x + off - w * 0.55, yy + 3); g.lineTo(x + off - w * 0.45, yy + 3); g.stroke(); }
  // 黑礁与灯塔
  const lx = x + w * (o.door ? 0.3 : 0.76), ly = sea + h * 0.02;
  g.fillStyle = night ? '#0e0e14' : '#2a2a2a';
  g.beginPath(); g.moveTo(lx - w * 0.12, ly + h * 0.04); g.quadraticCurveTo(lx, ly - h * 0.03, lx + w * 0.12, ly + h * 0.04); g.fill();
  g.fillStyle = '#efe8dc'; g.beginPath(); g.moveTo(lx - w * 0.025, ly); g.lineTo(lx - w * 0.016, ly - h * 0.22); g.lineTo(lx + w * 0.016, ly - h * 0.22); g.lineTo(lx + w * 0.025, ly); g.fill();
  g.fillStyle = '#b0302a'; g.fillRect(lx - w * 0.021, ly - h * 0.12, w * 0.042, h * 0.03);
  g.fillStyle = '#2a2a2a'; g.fillRect(lx - w * 0.02, ly - h * 0.26, w * 0.04, h * 0.04);
  if (night) {
    const a = t * 0.9;
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffe9a8';
    g.beginPath(); g.moveTo(lx, ly - h * 0.24); g.lineTo(lx + Math.cos(a) * w, ly - h * 0.24 + Math.sin(a) * h * 0.12 - h * 0.05); g.lineTo(lx + Math.cos(a) * w, ly - h * 0.24 + Math.sin(a) * h * 0.12 + h * 0.05); g.fill();
    g.restore();
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(lx, ly - h * 0.24, 3, 0, 7); g.fill();
  }
  // 船
  if (!night && weather !== '风雨') {
    const bx = x + ((t * 4 + 30) % (w + 60)) - 30, by = sea + h * 0.05;
    g.fillStyle = '#3a2a1e'; g.beginPath(); g.moveTo(bx - 10, by); g.lineTo(bx + 10, by); g.lineTo(bx + 7, by + 4); g.lineTo(bx - 7, by + 4); g.fill();
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.moveTo(bx, by - 1); g.lineTo(bx, by - 14); g.lineTo(bx + 8, by - 2); g.fill();
    if (plan && plan.boat && tod > 0.5) {
      const sx = x + w * (o.door ? 0.65 : 0.2), sy2 = sea + h * 0.02;
      g.fillStyle = '#2a2a30'; g.fillRect(sx - 22, sy2 - 6, 44, 8); g.fillStyle = '#e8e2d8'; g.fillRect(sx - 12, sy2 - 12, 20, 6); g.fillStyle = '#9a3a2a'; g.fillRect(sx - 2, sy2 - 20, 5, 8);
      g.fillStyle = 'rgba(220,220,220,.5)'; g.beginPath(); g.arc(sx + 2 + Math.sin(t) * 2, sy2 - 26, 4, 0, 7); g.fill();
    }
  }
  // 雨
  if (weather === '风雨') {
    g.strokeStyle = 'rgba(220,230,240,.45)'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const rx = x + ((i * 53 + t * 300) % w), ry = y + ((i * 97 + t * 500) % h); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 4, ry + 12); g.stroke(); }
  }
  // 海鸥
  if (!night && weather !== '风雨') {
    g.strokeStyle = 'rgba(40,40,50,.6)'; g.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) { const gx = x + ((t * (8 + i * 5) + i * 70) % (w + 40)) - 20, gy = y + h * (0.15 + i * 0.1) + Math.sin(t * 2 + i) * 3; g.beginPath(); g.moveTo(gx - 5, gy); g.quadraticCurveTo(gx - 2, gy - 3, gx, gy); g.quadraticCurveTo(gx + 2, gy - 3, gx + 5, gy); g.stroke(); }
  }
}
