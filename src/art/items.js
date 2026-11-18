// 物件的画法：每一面画在 [-1,1] 的方框里（y 向下）。细节的痕迹画在模板给的位置上，
// 放大镜下看得清，平常只是一点点不起眼的东西。
import { ITEMS } from '../data/items.js';
import { allDetails } from '../logic/econ.js';
import { rng } from '../logic/rng.js';

const INK = '#2b1d12';
const MET = {
  gold: ['#fff4c2', '#eac25a', '#a8781c', '#f7da80'],
  silver: ['#ffffff', '#d5dae0', '#8a919a', '#eef1f4'],
  brass: ['#f7e6a6', '#cfa64c', '#7b5b1f', '#ead283'],
  copper: ['#f6c39a', '#c46d3c', '#6c3317', '#e8a070'],
  tin: ['#f0f0ea', '#b9bab2', '#6d6f69', '#dcddd6'],
  iron: ['#9a8f86', '#5b524b', '#2f2925', '#7a7068'],
};

function metal(g, kind, x0, y0, x1, y1) {
  const c = MET[kind] || MET.silver;
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c[0]); gr.addColorStop(0.35, c[1]); gr.addColorStop(0.7, c[2]); gr.addColorStop(1, c[3]);
  return gr;
}
function radial(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}
function line(g, w = 0.014, c = INK) { g.lineWidth = w; g.strokeStyle = c; g.lineJoin = 'round'; g.lineCap = 'round'; }
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function shine(g, x, y, rx, ry, a = 0.6, rot = -0.5) {
  g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; ellipse(g, x, y, rx, ry, rot); g.fill(); g.restore();
}
function text(g, s, x, y, size, color = INK) {
  g.save(); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.translate(x, y); g.scale(size / 64, size / 64);
  g.font = '64px "Songti SC","STSong","SimSun","Noto Serif SC",serif';
  g.fillText(s, 0, 0); g.restore();
}
function speckle(g, R, n, x0, y0, w, h, color, size = 0.006, alpha = 0.25) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = color;
  for (let i = 0; i < n; i++) { g.fillRect(x0 + R() * w, y0 + R() * h, size * (0.5 + R()), size * (0.5 + R())); }
  g.restore();
}
const has = (it, id) => it.d.includes(id);

// —— 各种东西 ——
const DRAW = {
  seaglass(g, it, face, R) {
    const col = { green: ['#cfe8c4', '#7fb27a', '#3d6b3e'], brown: ['#f0cf9a', '#b07a3a', '#5e3b18'], white: ['#f4f6f2', '#cfd8d2', '#94a39a'], blue: ['#bcd3f5', '#3b64b8', '#1c2f6a'] }[it.v] || ['#cfe8c4', '#7fb27a', '#3d6b3e'];
    const n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, rr = 0.42 + 0.1 * Math.sin(i * 2.3 + (it.seed % 7));
      pts.push([Math.cos(a) * rr * 1.2, Math.sin(a) * rr * 0.85]);
    }
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      i ? g.quadraticCurveTo(p[0], p[1], m[0], m[1]) : g.moveTo(m[0], m[1]);
    }
    const p0 = pts[0], m0 = [(p0[0] + pts[1][0]) / 2, (p0[1] + pts[1][1]) / 2];
    g.quadraticCurveTo(p0[0], p0[1], m0[0], m0[1]);
    g.closePath();
    g.fillStyle = radial(g, 0, 0, 0.6, col); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
    line(g, 0.012, 'rgba(30,30,30,.3)'); g.stroke();
    g.save(); g.clip(); speckle(g, R, 220, -0.6, -0.5, 1.2, 1.0, '#fff', 0.01, 0.35); g.restore();
    shine(g, -0.18, -0.16, 0.18, 0.06, 0.55);
  },
  button(g, it, face) {
    circle(g, 0, 0, 0.55); g.fillStyle = metal(g, 'brass', -0.5, -0.5, 0.5, 0.5); g.fill(); line(g); g.stroke();
    circle(g, 0, 0, 0.45); line(g, 0.01, 'rgba(60,40,10,.5)'); g.stroke();
    if (face === 'back') {
      circle(g, 0, 0, 0.12); g.fillStyle = '#8a6a2a'; g.fill();
      if (!has(it, 'shank')) { ellipse(g, 0, -0.02, 0.1, 0.16); line(g, 0.04, '#6a4a1a'); g.stroke(); }
    } else {
      if (!has(it, 'anchor')) { for (const [x, y] of [[-.12, -.12], [.12, -.12], [-.12, .12], [.12, .12]]) { circle(g, x, y, 0.05); g.fillStyle = '#5a3d12'; g.fill(); } }
      g.save(); g.globalAlpha = 0.35; g.fillStyle = '#3a5a3a'; circle(g, 0.3, 0.25, 0.1); g.fill(); g.restore();
    }
    shine(g, -0.2, -0.25, 0.15, 0.05, 0.5);
  },
  dollar(g, it, face, R) {
    circle(g, 0, 0, 0.76); g.fillStyle = metal(g, 'silver', -0.7, -0.7, 0.7, 0.7); g.fill(); line(g); g.stroke();
    // 边齿
    g.save(); line(g, 0.008, 'rgba(60,60,70,.5)');
    for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 0.7, Math.sin(a) * 0.7); g.lineTo(Math.cos(a) * 0.76, Math.sin(a) * 0.76); g.stroke(); }
    g.restore();
    circle(g, 0, 0, 0.66); line(g, 0.008, 'rgba(60,60,70,.45)'); g.stroke();
    if (face === 'front') {
      // 侧面头像
      g.save(); g.fillStyle = 'rgba(120,125,135,.45)';
      g.beginPath(); g.moveTo(-0.05, -0.45); g.bezierCurveTo(0.25, -0.45, 0.3, -0.15, 0.22, 0.02); g.lineTo(0.3, 0.1); g.lineTo(0.2, 0.15);
      g.bezierCurveTo(0.22, 0.3, 0.1, 0.35, 0.0, 0.32); g.lineTo(0.05, 0.5); g.lineTo(-0.35, 0.5); g.bezierCurveTo(-0.3, 0.2, -0.4, -0.45, -0.05, -0.45); g.fill();
      g.restore();
      text(g, '中华民国', 0, -0.55, 0.09, 'rgba(70,72,80,.75)');
    } else {
      g.save(); line(g, 0.02, 'rgba(110,115,125,.6)');
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0.45); g.quadraticCurveTo(s * 0.55, 0.25, s * 0.45, -0.2); g.stroke(); for (let i = 0; i < 6; i++) { ellipse(g, s * (0.2 + i * 0.05), 0.32 - i * 0.1, 0.05, 0.025, s * 0.8); g.stroke(); } }
      g.restore();
      text(g, '壹圆', 0, 0.05, 0.22, 'rgba(70,72,80,.8)');
    }
    speckle(g, R, 120, -0.6, -0.6, 1.2, 1.2, '#555', 0.006, 0.15);
    shine(g, -0.3, -0.35, 0.22, 0.07, 0.45);
  },
  cash(g, it, face, R) {
    circle(g, 0, 0, 0.7); g.fillStyle = radial(g, 0, 0, 0.75, ['#c9a46a', '#8e6a36', '#5a4020']); g.fill(); line(g); g.stroke();
    circle(g, 0, 0, 0.62); line(g, 0.012, 'rgba(50,35,15,.6)'); g.stroke();
    g.fillStyle = '#1e1a16'; g.fillRect(-0.16, -0.16, 0.32, 0.32); line(g, 0.012, 'rgba(50,35,15,.6)'); g.strokeRect(-0.22, -0.22, 0.44, 0.44);
    const chars = face === 'front' ? (has(it, 'xianfeng') ? '咸豐重寶' : '乾隆通寶') : (has(it, 'xianfeng') ? '當百' : '');
    const c = 'rgba(60,40,15,.85)';
    if (face === 'front') {
      text(g, chars[0], 0, -0.4, 0.2, c); text(g, chars[1], 0, 0.4, 0.2, c); text(g, chars[2], 0.4, 0, 0.2, c); text(g, chars[3], -0.4, 0, 0.2, c);
    } else if (chars) { text(g, chars[0], 0, -0.4, 0.2, c); text(g, chars[1], 0, 0.4, 0.2, c); }
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#3f7a5a';
    for (let i = 0; i < 9; i++) { circle(g, (R() - 0.5) * 1.1, (R() - 0.5) * 1.1, 0.03 + R() * 0.06); g.fill(); }
    g.restore();
  },
  ring(g, it, face) {
    const kind = it.v === 'gold' ? 'gold' : 'silver';
    if (face === 'inside') {
      // 里圈展开看
      rrect(g, -0.85, -0.32, 1.7, 0.64, 0.3); g.fillStyle = metal(g, kind, 0, -0.35, 0, 0.35); g.fill(); line(g); g.stroke();
      rrect(g, -0.78, -0.2, 1.56, 0.4, 0.18); line(g, 0.008, 'rgba(80,60,20,.35)'); g.stroke();
      shine(g, 0, -0.22, 0.6, 0.03, 0.5, 0);
      return;
    }
    ellipse(g, 0, 0.12, 0.62, 0.46); g.fillStyle = metal(g, kind, -0.6, -0.4, 0.6, 0.5); g.fill(); line(g); g.stroke();
    g.save(); g.globalCompositeOperation = 'destination-out'; ellipse(g, 0, 0.16, 0.44, 0.3); g.fill(); g.restore();
    ellipse(g, 0, 0.16, 0.44, 0.3); line(g); g.stroke();
    // 戒面
    ellipse(g, 0, -0.28, 0.24, 0.12); g.fillStyle = metal(g, kind, -0.2, -0.4, 0.2, -0.15); g.fill(); line(g); g.stroke();
    shine(g, -0.35, -0.05, 0.12, 0.04, 0.6);
    shine(g, 0.05, -0.32, 0.08, 0.03, 0.7, 0);
  },
  hairpin(g, it, face) {
    const kind = it.v === 'brass' ? 'brass' : 'silver';
    g.save(); g.rotate(-0.72);
    const bent = has(it, 'bent');
    g.beginPath(); g.moveTo(-0.95, 0); g.quadraticCurveTo(-0.2, bent ? 0.12 : 0, 0.5, 0); g.lineTo(0.5, 0.05); g.quadraticCurveTo(-0.2, bent ? 0.17 : 0.05, -0.95, 0.01); g.closePath();
    g.fillStyle = metal(g, kind, 0, -0.05, 0, 0.08); g.fill(); line(g, 0.01); g.stroke();
    // 簪头
    if (face === 'front' || face === 'back') {
      if (it.v === 'jade') {
        circle(g, 0.62, 0.02, 0.17); g.fillStyle = radial(g, 0.62, 0.02, 0.2, ['#d9f2dc', '#6fb38a', '#2e6b4a']); g.fill(); line(g); g.stroke();
        shine(g, 0.57, -0.05, 0.06, 0.03, 0.6);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          circle(g, 0.62 + Math.cos(a) * 0.1, 0.02 + Math.sin(a) * 0.1, 0.085); g.fillStyle = metal(g, kind, 0.5, -0.1, 0.75, 0.15); g.fill(); line(g, 0.01); g.stroke();
        }
        circle(g, 0.62, 0.02, 0.05); g.fillStyle = face === 'back' ? '#9aa0a8' : '#c0484a'; g.fill(); line(g, 0.008); g.stroke();
      }
    }
    g.restore();
  },
  bracelet(g, it, face, R) {
    const k = it.v;
    g.save();
    circle(g, 0, 0, 0.72); circle(g, 0, 0, 0.46); // 圆环
    g.beginPath(); g.arc(0, 0, 0.72, 0, Math.PI * 2); g.arc(0, 0, 0.46, 0, Math.PI * 2, true);
    g.fillStyle = k === 'jade' ? radial(g, 0, 0, 0.8, ['#e4f5e0', '#8fcf9c', '#3f8a5c', '#2a5a40']) : metal(g, k === 'gold' ? 'gold' : 'silver', -0.7, -0.7, 0.7, 0.7);
    g.fill('evenodd'); line(g); g.beginPath(); g.arc(0, 0, 0.72, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 0.46, 0, Math.PI * 2); g.stroke();
    if (k === 'jade') {
      g.globalAlpha = 0.3; line(g, 0.01, '#f4fff4');
      for (let i = 0; i < 6; i++) { const a = R() * 6.28; g.beginPath(); g.arc(0, 0, 0.5 + R() * 0.2, a, a + 0.4 + R() * 0.6); g.stroke(); }
      g.globalAlpha = 1;
    } else {
      g.globalAlpha = 0.35; line(g, 0.008, '#5a4a2a');
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5); g.lineTo(Math.cos(a + 0.1) * 0.68, Math.sin(a + 0.1) * 0.68); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.restore();
    shine(g, -0.4, -0.45, 0.16, 0.05, 0.6, -0.8);
  },
  jade(g, it, face, R) {
    // 红绳
    line(g, 0.035, '#a8322a'); g.beginPath(); g.moveTo(0, -0.62); g.bezierCurveTo(-0.15, -0.9, 0.15, -0.95, 0.05, -1.05); g.stroke();
    ellipse(g, 0, 0.1, 0.56, 0.72); g.fillStyle = radial(g, 0, 0.05, 0.8, it.t === 'hu_jade' ? ['#f2e9d0', '#c9b98a', '#8a6a3a', '#6a4a2a'] : ['#f2fbe8', '#bfe0b4', '#7fb08a', '#4a7a5a']); g.fill(); line(g); g.stroke();
    circle(g, 0, -0.5, 0.07); g.fillStyle = '#efe3c8'; g.fill(); line(g, 0.01); g.stroke();
    if (it.t === 'hu_jade' || has(it, 'dyed')) {
      g.save(); g.globalAlpha = 0.4; g.fillStyle = '#b5532f'; ellipse(g, 0.25, 0.4, 0.3, 0.25, 0.4); g.fill(); g.restore();
    }
    // 鱼
    g.save(); line(g, face === 'back' ? 0.008 : 0.014, face === 'back' ? 'rgba(40,70,50,.45)' : 'rgba(40,70,50,.6)');
    if (face === 'front') {
      g.beginPath(); g.moveTo(-0.3, 0.1); g.bezierCurveTo(-0.1, -0.2, 0.25, -0.15, 0.3, 0.12); g.bezierCurveTo(0.2, 0.32, -0.1, 0.35, -0.3, 0.1); g.stroke();
      g.beginPath(); g.moveTo(0.3, 0.12); g.lineTo(0.45, -0.05); g.lineTo(0.45, 0.3); g.closePath(); g.stroke();
      circle(g, -0.18, 0.06, 0.025); g.stroke();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-0.02 + i * 0.07, 0.1, 0.05, -1, 1); g.stroke(); }
    } else {
      for (let i = 0; i < 7; i++) { g.beginPath(); for (let x = -0.4; x <= 0.4; x += 0.04) { const y = -0.25 + i * 0.09 + Math.sin(x * 12 + i) * 0.025; x === -0.4 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    }
    g.restore();
    shine(g, -0.22, -0.25, 0.14, 0.06, 0.5);
  },
  bowl(g, it, face, R) {
    if (face === 'bottom') {
      circle(g, 0, 0, 0.82); g.fillStyle = radial(g, 0, 0, 0.85, ['#ffffff', '#eef2f4', '#cdd6dc']); g.fill(); line(g); g.stroke();
      circle(g, 0, 0, 0.56); g.fillStyle = has(it, 'qianlong') ? '#d8b48a' : '#e9e2d6'; g.fill(); line(g); g.stroke();
      circle(g, 0, 0, 0.44); g.fillStyle = radial(g, 0, 0, 0.45, ['#ffffff', '#f2f5f7']); g.fill(); line(g, 0.01, 'rgba(40,40,80,.4)'); g.stroke();
      return;
    }
    g.beginPath(); g.moveTo(-0.85, -0.38); g.bezierCurveTo(-0.8, 0.25, -0.4, 0.45, -0.25, 0.48); g.lineTo(-0.27, 0.6); g.lineTo(0.27, 0.6); g.lineTo(0.25, 0.48);
    g.bezierCurveTo(0.4, 0.45, 0.8, 0.25, 0.85, -0.38); g.closePath();
    g.fillStyle = metal(g, 'tin', -0.8, 0, 0.8, 0); g.fillStyle = (() => { const gr = g.createLinearGradient(-0.85, 0, 0.85, 0); gr.addColorStop(0, '#dfe6ea'); gr.addColorStop(0.4, '#ffffff'); gr.addColorStop(1, '#c6d0d6'); return gr; })();
    g.fill(); line(g); g.stroke();
    ellipse(g, 0, -0.38, 0.85, 0.12); g.fillStyle = '#f7f9fa'; g.fill(); line(g); g.stroke();
    ellipse(g, 0, -0.37, 0.78, 0.09); g.fillStyle = '#e4eaee'; g.fill();
    // 缠枝莲
    g.save(); line(g, 0.018, has(it, 'fakereign') ? '#3a5ad0' : '#24407a');
    g.beginPath(); for (let x = -0.72; x <= 0.72; x += 0.03) { const y = 0.02 + Math.sin(x * 9) * 0.08; x === -0.72 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    g.fillStyle = has(it, 'fakereign') ? 'rgba(58,90,208,.85)' : 'rgba(36,64,122,.85)';
    for (let i = -2; i <= 2; i++) { const x = i * 0.3; ellipse(g, x, 0.02 + Math.sin(x * 9) * 0.08, 0.07, 0.05); g.fill(); for (const s of [-1, 1]) { ellipse(g, x + s * 0.08, -0.05 + Math.sin(x * 9) * 0.08, 0.05, 0.025, s * 0.6); g.fill(); } }
    line(g, 0.012); g.beginPath(); g.moveTo(-0.8, -0.24); g.lineTo(0.8, -0.24); g.stroke(); g.beginPath(); g.moveTo(-0.5, 0.36); g.lineTo(0.5, 0.36); g.stroke();
    g.restore();
    shine(g, -0.45, -0.12, 0.08, 0.2, 0.55, 0.2);
  },
  watch(g, it, face, R) {
    const kind = it.v === 'gold' ? 'gold' : it.v === 'brass' ? 'brass' : 'silver';
    if (face === 'inside') {
      // 左：表盖里；右：机芯
      circle(g, -0.45, 0, 0.42); g.fillStyle = metal(g, kind, -0.8, -0.4, -0.1, 0.4); g.fill(); line(g); g.stroke();
      circle(g, -0.45, 0, 0.34); line(g, 0.008, 'rgba(60,50,30,.5)'); g.stroke();
      circle(g, 0.45, 0, 0.44); g.fillStyle = metal(g, kind, 0.1, -0.4, 0.8, 0.4); g.fill(); line(g); g.stroke();
      circle(g, 0.45, 0, 0.36); g.fillStyle = metal(g, 'brass', 0.2, -0.3, 0.7, 0.3); g.fill(); line(g, 0.01); g.stroke();
      // 齿轮与宝石
      for (const [x, y, r] of [[0.38, -0.08, 0.14], [0.56, 0.08, 0.1], [0.4, 0.16, 0.07]]) {
        circle(g, x, y, r); g.fillStyle = metal(g, 'brass', x - r, y - r, x + r, y + r); g.fill(); line(g, 0.006, 'rgba(60,40,10,.7)'); g.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
      }
      for (const [x, y] of [[0.38, -0.08], [0.56, 0.08], [0.6, -0.2]]) { circle(g, x, y, 0.022); g.fillStyle = '#b0222a'; g.fill(); }
      line(g, 0.006, 'rgba(40,30,10,.6)'); g.beginPath(); g.arc(0.45, 0, 0.36, 0, 6.28); g.stroke();
      // 铰链
      g.fillStyle = metal(g, kind, -0.05, -0.05, 0.05, 0.05); g.fillRect(-0.06, -0.06, 0.12, 0.12); line(g, 0.008); g.strokeRect(-0.06, -0.06, 0.12, 0.12);
      return;
    }
    // 表冠和挂环
    ellipse(g, 0, -0.82, 0.12, 0.1); line(g, 0.03, metal(g, kind, -0.1, -0.9, 0.1, -0.7)); g.stroke(); line(g, 0.01); ellipse(g, 0, -0.82, 0.135, 0.115); g.stroke();
    rrect(g, -0.07, -0.74, 0.14, 0.12, 0.03); g.fillStyle = metal(g, kind, -0.07, -0.74, 0.07, -0.62); g.fill(); line(g, 0.01); g.stroke();
    circle(g, 0, 0.08, 0.66); g.fillStyle = metal(g, kind, -0.6, -0.5, 0.6, 0.7); g.fill(); line(g); g.stroke();
    if (face === 'back') {
      circle(g, 0, 0.08, 0.56); line(g, 0.008, 'rgba(70,60,40,.45)'); g.stroke();
      g.save(); g.globalAlpha = 0.25; line(g, 0.006, '#3a3020');
      for (let i = 0; i < 36; i++) { const a = i / 36 * 6.28; g.beginPath(); g.moveTo(Math.cos(a) * 0.15, 0.08 + Math.sin(a) * 0.15); g.lineTo(Math.cos(a) * 0.5, 0.08 + Math.sin(a) * 0.5); g.stroke(); }
      g.restore();
      shine(g, -0.28, -0.22, 0.2, 0.06, 0.5);
      return;
    }
    circle(g, 0, 0.08, 0.56); g.fillStyle = radial(g, 0, 0.08, 0.6, ['#fffdf5', '#f3ead4', '#e2d4b0']); g.fill(); line(g, 0.01); g.stroke();
    for (let i = 1; i <= 12; i++) {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      text(g, ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i % 12], Math.cos(a) * 0.44, 0.08 + Math.sin(a) * 0.44, 0.075, '#2a2018');
    }
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.28; line(g, i % 5 ? 0.004 : 0.008, '#3a3020'); g.beginPath(); g.moveTo(Math.cos(a) * 0.52, 0.08 + Math.sin(a) * 0.52); g.lineTo(Math.cos(a) * 0.55, 0.08 + Math.sin(a) * 0.55); g.stroke(); }
    circle(g, 0, 0.3, 0.09); line(g, 0.005, '#3a3020'); g.stroke();
    const [hh, mm] = it.hands || [10, 10];
    const am = mm / 60 * 6.28 - Math.PI / 2, ah = ((hh % 12) + mm / 60) / 12 * 6.28 - Math.PI / 2;
    line(g, 0.028, '#1a1410'); g.beginPath(); g.moveTo(0, 0.08); g.lineTo(Math.cos(ah) * 0.28, 0.08 + Math.sin(ah) * 0.28); g.stroke();
    line(g, 0.018, '#1a1410'); g.beginPath(); g.moveTo(0, 0.08); g.lineTo(Math.cos(am) * 0.42, 0.08 + Math.sin(am) * 0.42); g.stroke();
    circle(g, 0, 0.08, 0.03); g.fillStyle = '#1a1410'; g.fill();
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#c9a050'; circle(g, 0, 0.08, 0.56); g.fill(); g.restore();
    shine(g, -0.25, -0.2, 0.25, 0.08, 0.35);
  },
  compass(g, it) {
    rrect(g, -0.85, -0.85, 1.7, 1.7, 0.08); g.fillStyle = (() => { const gr = g.createLinearGradient(-0.8, -0.8, 0.8, 0.8); gr.addColorStop(0, '#9a6a3c'); gr.addColorStop(1, '#5a3a1e'); return gr; })(); g.fill(); line(g); g.stroke();
    rrect(g, -0.78, -0.78, 1.56, 1.56, 0.05); line(g, 0.008, 'rgba(255,220,170,.25)'); g.stroke();
    circle(g, 0, -0.05, 0.62); g.fillStyle = metal(g, 'brass', -0.6, -0.6, 0.6, 0.6); g.fill(); line(g); g.stroke();
    circle(g, 0, -0.05, 0.52); g.fillStyle = '#f2ead6'; g.fill(); line(g, 0.01); g.stroke();
    for (let i = 0; i < 32; i++) { const a = i / 32 * 6.28; line(g, i % 8 ? 0.004 : 0.01, '#3a3020'); g.beginPath(); g.moveTo(Math.cos(a) * 0.44, -0.05 + Math.sin(a) * 0.44); g.lineTo(Math.cos(a) * 0.5, -0.05 + Math.sin(a) * 0.5); g.stroke(); }
    text(g, 'N', 0, -0.42, 0.09); text(g, 'S', 0, 0.32, 0.09); text(g, 'E', 0.37, -0.05, 0.09); text(g, 'W', -0.37, -0.05, 0.09);
    g.save(); g.translate(0, -0.05); g.rotate(0.3); g.beginPath(); g.moveTo(0, -0.35); g.lineTo(0.05, 0); g.lineTo(-0.05, 0); g.closePath(); g.fillStyle = '#b0302a'; g.fill();
    g.beginPath(); g.moveTo(0, 0.35); g.lineTo(0.05, 0); g.lineTo(-0.05, 0); g.closePath(); g.fillStyle = '#2a3040'; g.fill(); g.restore();
    rrect(g, -0.24, 0.62, 0.48, 0.14, 0.02); g.fillStyle = metal(g, 'brass', -0.2, 0.6, 0.2, 0.78); g.fill(); line(g, 0.008); g.stroke();
    shine(g, -0.25, -0.35, 0.2, 0.06, 0.35);
  },
  spyglass(g, it) {
    const segs = [[-0.92, -0.3, 0.13], [-0.3, 0.25, 0.15], [0.25, 0.85, 0.18]];
    for (const [a, b, r] of segs) {
      g.fillStyle = metal(g, 'brass', 0, -r, 0, r); g.fillRect(a, -r, b - a, r * 2); line(g); g.strokeRect(a, -r, b - a, r * 2);
      g.fillStyle = metal(g, 'brass', 0, -r - 0.02, 0, r + 0.02); g.fillRect(b - 0.05, -r - 0.02, 0.05, r * 2 + 0.04); line(g, 0.01); g.strokeRect(b - 0.05, -r - 0.02, 0.05, r * 2 + 0.04);
    }
    g.fillStyle = '#5a3a24'; g.fillRect(0.3, -0.18, 0.4, 0.36); line(g, 0.01); g.strokeRect(0.3, -0.18, 0.4, 0.36);
    ellipse(g, 0.86, 0, 0.04, 0.18); g.fillStyle = '#7fa0b0'; g.fill(); line(g, 0.01); g.stroke();
    shine(g, 0, -0.08, 0.6, 0.02, 0.45, 0);
  },
  fan(g, it, face, R) {
    const cx = 0, cy = 0.62, R1 = 0.95, R0 = 0.32, a0 = Math.PI * 1.12, a1 = Math.PI * 1.88;
    g.beginPath(); g.arc(cx, cy, R1, a0, a1); g.arc(cx, cy, R0, a1, a0, true); g.closePath();
    g.fillStyle = face === 'back' ? '#efe4c6' : '#f2e8cc'; g.fill(); line(g); g.stroke();
    for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; line(g, 0.005, 'rgba(90,70,40,.35)'); g.beginPath(); g.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); g.lineTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1); g.stroke(); }
    if (face === 'front') {
      g.save(); g.beginPath(); g.arc(cx, cy, R1 - 0.02, a0, a1); g.arc(cx, cy, R0 + 0.02, a1, a0, true); g.clip();
      g.fillStyle = 'rgba(60,70,60,.55)';
      g.beginPath(); g.moveTo(-0.9, 0); g.lineTo(-0.5, -0.45); g.lineTo(-0.3, -0.2); g.lineTo(-0.05, -0.55); g.lineTo(0.3, -0.1); g.lineTo(0.55, -0.35); g.lineTo(0.9, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(60,70,60,.25)'; g.beginPath(); g.moveTo(-0.9, 0.05); g.lineTo(-0.2, -0.25); g.lineTo(0.2, 0); g.lineTo(0.9, 0.05); g.fill();
      g.restore();
    } else {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const a = a0 + 0.35 + i * 0.12, rr = 0.85 - j * 0.12; g.fillStyle = 'rgba(30,25,20,.7)'; g.fillRect(cx + Math.cos(a) * rr - 0.025, cy + Math.sin(a) * rr - 0.025, 0.05, 0.05); }
    }
    // 扇骨
    for (const a of [a0, a1]) { line(g, 0.04, '#8a6a3a'); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1); g.stroke(); }
    circle(g, cx, cy, 0.05); g.fillStyle = '#4a3420'; g.fill();
  },
  pipe(g, it) {
    g.beginPath(); g.moveTo(-0.62, -0.35); g.lineTo(-0.28, -0.35); g.quadraticCurveTo(-0.24, 0.3, -0.45, 0.3); g.quadraticCurveTo(-0.66, 0.3, -0.62, -0.35); g.closePath();
    g.fillStyle = (() => { const gr = g.createLinearGradient(-0.65, 0, -0.25, 0); gr.addColorStop(0, '#5a2e18'); gr.addColorStop(0.5, '#9a5a30'); gr.addColorStop(1, '#4a2410'); return gr; })(); g.fill(); line(g); g.stroke();
    ellipse(g, -0.45, -0.35, 0.17, 0.05); g.fillStyle = '#1e140e'; g.fill(); line(g, 0.01); g.stroke();
    g.beginPath(); g.moveTo(-0.3, 0.05); g.quadraticCurveTo(0.2, 0.0, 0.7, -0.1); g.lineTo(0.7, -0.02); g.quadraticCurveTo(0.2, 0.08, -0.3, 0.14); g.closePath(); g.fillStyle = '#6a3a1e'; g.fill(); line(g, 0.012); g.stroke();
    rrect(g, 0.68, -0.12, 0.3, 0.1, 0.04); g.fillStyle = has(it, 'amber') ? 'rgba(220,140,40,.9)' : '#1e1a18'; g.fill(); line(g, 0.01); g.stroke();
    shine(g, -0.5, -0.15, 0.04, 0.12, 0.35, 0);
  },
  lantern(g, it) {
    line(g, 0.025, '#3a3a36'); g.beginPath(); g.arc(0, -0.62, 0.32, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(-0.3, -0.5); g.lineTo(0.3, -0.5); g.lineTo(0.22, -0.32); g.lineTo(-0.22, -0.32); g.closePath(); g.fillStyle = metal(g, 'iron', -0.3, -0.5, 0.3, -0.3); g.fill(); line(g); g.stroke();
    ellipse(g, 0, 0.08, 0.32, 0.42); g.fillStyle = 'rgba(200,215,210,.45)'; g.fill(); line(g); g.stroke();
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#2a2620'; ellipse(g, 0, -0.18, 0.22, 0.12); g.fill(); g.restore();
    for (const s of [-1, 1]) { line(g, 0.02, '#4a4842'); g.beginPath(); g.moveTo(s * 0.34, -0.32); g.lineTo(s * 0.34, 0.6); g.stroke(); }
    rrect(g, -0.42, 0.5, 0.84, 0.3, 0.06); g.fillStyle = metal(g, 'iron', -0.4, 0.5, 0.4, 0.8); g.fill(); line(g); g.stroke();
    ellipse(g, 0, 0.18, 0.03, 0.07); g.fillStyle = '#e8a040'; g.fill();
    shine(g, -0.15, -0.02, 0.05, 0.2, 0.5, 0);
  },
  musicbox(g, it, face) {
    if (face === 'inside') {
      rrect(g, -0.85, -0.55, 1.7, 1.1, 0.06); g.fillStyle = '#6a3a1e'; g.fill(); line(g); g.stroke();
      rrect(g, -0.75, -0.45, 1.5, 0.9, 0.03); g.fillStyle = '#2e4a3a'; g.fill();
      rrect(g, -0.55, -0.25, 0.8, 0.3, 0.12); g.fillStyle = metal(g, 'brass', 0, -0.25, 0, 0.05); g.fill(); line(g, 0.01); g.stroke();
      g.fillStyle = '#5a4020'; for (let i = 0; i < 40; i++) g.fillRect(-0.5 + (i * 0.37 % 0.75), -0.22 + (i * 0.13 % 0.24), 0.012, 0.012);
      g.fillStyle = metal(g, 'silver', 0.05, 0.1, 0.5, 0.2); g.fillRect(-0.4, 0.12, 0.7, 0.14);
      line(g, 0.006, 'rgba(40,40,40,.6)'); for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(-0.38 + i * 0.038, 0.12); g.lineTo(-0.38 + i * 0.038, 0.26); g.stroke(); }
      return;
    }
    rrect(g, -0.85, -0.5, 1.7, 1.0, 0.08); g.fillStyle = (() => { const gr = g.createLinearGradient(0, -0.5, 0, 0.5); gr.addColorStop(0, '#8a4a24'); gr.addColorStop(1, '#4a2410'); return gr; })(); g.fill(); line(g); g.stroke();
    line(g, 0.01, 'rgba(0,0,0,.4)'); g.beginPath(); g.moveTo(-0.85, -0.18); g.lineTo(0.85, -0.18); g.stroke();
    // 贝壳嵌
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ellipse(g, Math.cos(a) * 0.16, 0.18 + Math.sin(a) * 0.12, 0.08, 0.04, a); g.fillStyle = 'rgba(230,240,250,.8)'; g.fill(); }
    circle(g, 0, 0.18, 0.05); g.fillStyle = '#f4d9e4'; g.fill();
    rrect(g, -0.06, -0.24, 0.12, 0.08, 0.02); g.fillStyle = metal(g, 'brass', 0, -0.24, 0, -0.16); g.fill();
  },
  lock(g, it, face) {
    const kind = 'silver';
    line(g, 0.03, '#9aa0a8'); g.beginPath(); g.arc(0, -0.42, 0.42, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.beginPath(); g.moveTo(-0.7, -0.35); g.quadraticCurveTo(0, -0.6, 0.7, -0.35); g.quadraticCurveTo(0.8, 0.2, 0.3, 0.5); g.quadraticCurveTo(0, 0.62, -0.3, 0.5); g.quadraticCurveTo(-0.8, 0.2, -0.7, -0.35); g.closePath();
    g.fillStyle = metal(g, kind, -0.7, -0.5, 0.7, 0.6); g.fill(); line(g); g.stroke();
    if (face === 'front') { text(g, '長命', 0, -0.12, 0.2, 'rgba(60,60,70,.8)'); text(g, '百歲', 0, 0.16, 0.2, 'rgba(60,60,70,.8)'); }
    else { g.save(); g.globalAlpha = 0.35; line(g, 0.01, '#3a3a40'); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(0, 0.05, 0.1 + i * 0.07, 0.3, 2.8); g.stroke(); } g.restore(); }
    for (let i = -2; i <= 2; i++) { line(g, 0.008, '#8a9098'); g.beginPath(); g.moveTo(i * 0.15, 0.52); g.lineTo(i * 0.15, 0.72); g.stroke(); circle(g, i * 0.15, 0.75, 0.035); g.fillStyle = metal(g, kind, 0, 0.7, 0, 0.8); g.fill(); }
    shine(g, -0.35, -0.25, 0.14, 0.05, 0.6);
  },
  snuff(g, it) {
    g.beginPath(); g.moveTo(-0.12, -0.6); g.lineTo(0.12, -0.6); g.lineTo(0.14, -0.45); g.quadraticCurveTo(0.55, -0.35, 0.5, 0.15); g.quadraticCurveTo(0.45, 0.6, 0, 0.62); g.quadraticCurveTo(-0.45, 0.6, -0.5, 0.15); g.quadraticCurveTo(-0.55, -0.35, -0.14, -0.45); g.closePath();
    g.fillStyle = 'rgba(225,235,240,.55)'; g.fill(); line(g); g.stroke();
    circle(g, 0, -0.7, 0.12); g.fillStyle = radial(g, 0, -0.7, 0.14, ['#ff9a8a', '#c0302a', '#7a1a14']); g.fill(); line(g, 0.01); g.stroke();
    shine(g, -0.28, -0.1, 0.05, 0.22, 0.5, 0.1);
  },
  cigcase(g, it, face, R) {
    const kind = it.v === 'tin' ? 'tin' : 'silver';
    if (face === 'inside') {
      rrect(g, -0.88, -0.55, 0.84, 1.1, 0.06); g.fillStyle = metal(g, kind, -0.88, -0.55, 0, 0.55); g.fill(); line(g); g.stroke();
      rrect(g, 0.04, -0.55, 0.84, 1.1, 0.06); g.fillStyle = metal(g, kind, 0, -0.55, 0.88, 0.55); g.fill(); line(g); g.stroke();
      // 烟卷
      for (let i = 0; i < 6; i++) { rrect(g, 0.12 + i * 0.12, -0.45, 0.1, 0.62, 0.04); g.fillStyle = '#f6f1e6'; g.fill(); line(g, 0.006, 'rgba(0,0,0,.3)'); g.stroke(); g.fillStyle = '#d6a050'; g.fillRect(0.12 + i * 0.12, 0.05, 0.1, 0.12); }
      line(g, 0.02, 'rgba(120,120,120,.8)'); g.beginPath(); g.moveTo(0.1, -0.1); g.lineTo(0.84, -0.1); g.stroke();
      return;
    }
    rrect(g, -0.75, -0.55, 1.5, 1.1, 0.12); g.fillStyle = metal(g, kind, -0.7, -0.6, 0.7, 0.6); g.fill(); line(g); g.stroke();
    if (kind === 'silver') {
      g.save(); g.globalAlpha = 0.4; line(g, 0.01, '#4a4a52');
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 0.65, -0.4 + i * 0.35); g.bezierCurveTo(s * 0.4, -0.5 + i * 0.35, s * 0.4, -0.2 + i * 0.35, s * 0.25, -0.3 + i * 0.35); g.stroke(); }
      g.restore();
    } else { text(g, '大前門', 0, 0, 0.18, 'rgba(160,40,30,.8)'); }
    shine(g, -0.4, -0.38, 0.25, 0.05, 0.55, -0.1);
  },
  seal(g, it, face) {
    const col = has(it, 'good') ? ['#f4d6a8', '#d99a5a', '#9a5a2a'] : has(it, 'dyed') ? ['#f2c08a', '#c26a3a', '#7a3a1a'] : ['#e8dcc4', '#bfa98a', '#7a6a52'];
    if (face === 'bottom') {
      rrect(g, -0.6, -0.6, 1.2, 1.2, 0.06); g.fillStyle = radial(g, 0, 0, 0.9, col); g.fill(); line(g); g.stroke();
      g.save(); g.fillStyle = 'rgba(150,40,30,.85)'; rrect(g, -0.45, -0.45, 0.9, 0.9, 0.04); g.fill(); g.restore();
      text(g, '海', 0.2, -0.2, 0.36, col[0]); text(g, '月', 0.2, 0.2, 0.36, col[0]); text(g, '山', -0.2, -0.2, 0.36, col[0]); text(g, '房', -0.2, 0.2, 0.36, col[0]);
      return;
    }
    rrect(g, -0.32, -0.25, 0.64, 1.05, 0.04); g.fillStyle = radial(g, 0, 0.3, 0.9, col); g.fill(); line(g); g.stroke();
    // 钮：一只蹲兽
    g.beginPath(); g.moveTo(-0.3, -0.25); g.quadraticCurveTo(-0.32, -0.55, -0.12, -0.6); g.quadraticCurveTo(-0.05, -0.8, 0.12, -0.7); g.quadraticCurveTo(0.32, -0.6, 0.3, -0.25); g.closePath();
    g.fillStyle = radial(g, 0, -0.45, 0.4, col); g.fill(); line(g); g.stroke();
    circle(g, 0.1, -0.6, 0.02); g.fillStyle = INK; g.fill();
    shine(g, -0.18, 0.1, 0.04, 0.3, 0.3, 0);
  },
  book(g, it, face, R) {
    if (face === 'inside') {
      rrect(g, -0.85, -0.7, 1.7, 1.4, 0.02); g.fillStyle = '#efe3c4'; g.fill(); line(g); g.stroke();
      line(g, 0.008, 'rgba(90,60,30,.4)'); g.beginPath(); g.moveTo(0, -0.7); g.lineTo(0, 0.7); g.stroke();
      for (const s of [-1, 1]) for (let c = 0; c < 6; c++) for (let r = 0; r < 9; r++) { if (R() < 0.15) continue; g.fillStyle = 'rgba(30,25,20,.75)'; g.fillRect(s * (0.12 + c * 0.11) - 0.03, -0.55 + r * 0.13, 0.06, 0.06); }
      return;
    }
    rrect(g, -0.62, -0.8, 1.24, 1.6, 0.02); g.fillStyle = '#5a6a7a'; g.fill(); line(g); g.stroke();
    speckle(g, R, 200, -0.6, -0.78, 1.2, 1.56, '#2a3440', 0.01, 0.25);
    g.fillStyle = '#efe3c4'; g.fillRect(0.12, -0.7, 0.3, 0.9); line(g, 0.008); g.strokeRect(0.12, -0.7, 0.3, 0.9);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(30,25,20,.7)'; g.fillRect(0.22, -0.6 + i * 0.18, 0.1, 0.1); }
    for (let i = 0; i < 5; i++) { line(g, 0.012, '#e8e0d0'); g.beginPath(); g.moveTo(-0.62, -0.7 + i * 0.35); g.lineTo(-0.48, -0.7 + i * 0.35); g.stroke(); }
  },
  shard(g, it, face, R) {
    g.beginPath(); g.moveTo(-0.6, -0.3); g.lineTo(-0.1, -0.6); g.lineTo(0.55, -0.4); g.lineTo(0.65, 0.2); g.lineTo(0.1, 0.55); g.lineTo(-0.5, 0.35); g.closePath();
    g.fillStyle = has(it, 'guan') ? radial(g, 0, 0, 0.8, ['#d6e2d6', '#a9bfb0', '#7a9484']) : radial(g, 0, 0, 0.8, ['#ffffff', '#e8eef0', '#c8d2d6']); g.fill(); line(g); g.stroke();
    if (!has(it, 'guan')) { g.save(); g.clip(); line(g, 0.03, '#2a4a8a'); g.beginPath(); g.moveTo(-0.6, 0.1); g.quadraticCurveTo(0, -0.3, 0.7, 0.05); g.stroke(); g.fillStyle = 'rgba(42,74,138,.8)'; ellipse(g, 0.1, -0.05, 0.12, 0.07); g.fill(); g.restore(); }
    line(g, 0.04, has(it, 'guan') ? '#2a2420' : '#d8ccb8'); g.beginPath(); g.moveTo(0.65, 0.2); g.lineTo(0.1, 0.55); g.stroke();
  },
  junk(g, it, face, R) {
    if (it.v === 'cap') { circle(g, 0, 0, 0.4); g.fillStyle = metal(g, 'iron', -0.4, -0.4, 0.4, 0.4); g.fill(); line(g); g.stroke(); for (let i = 0; i < 21; i++) { const a = i / 21 * 6.28; circle(g, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.04); g.fill(); } }
    else if (it.v === 'nail') { g.save(); g.rotate(0.6); g.fillStyle = metal(g, 'iron', 0, -0.06, 0, 0.06); g.fillRect(-0.7, -0.05, 1.3, 0.1); line(g); g.strokeRect(-0.7, -0.05, 1.3, 0.1); g.fillRect(-0.75, -0.14, 0.08, 0.28); g.strokeRect(-0.75, -0.14, 0.08, 0.28); g.restore(); }
    else { ellipse(g, 0, 0, 0.22, 0.42); g.fillStyle = metal(g, 'tin', -0.2, -0.4, 0.2, 0.4); g.fill(); line(g); g.stroke(); circle(g, 0, -0.38, 0.06); line(g, 0.02); g.stroke(); }
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#8a4a1a'; for (let i = 0; i < 12; i++) { circle(g, (R() - 0.5) * 0.8, (R() - 0.5) * 0.8, 0.03 + R() * 0.05); g.fill(); } g.restore();
  },
  bottle(g, it, face, R) {
    if (face === 'inside') { DRAW.paper(g, it, face, R); return; }
    g.save(); g.rotate(-0.15);
    g.beginPath(); g.moveTo(-0.75, -0.25); g.lineTo(0.35, -0.25); g.quadraticCurveTo(0.5, -0.25, 0.55, -0.1); g.lineTo(0.85, -0.08); g.lineTo(0.85, 0.08); g.lineTo(0.55, 0.1); g.quadraticCurveTo(0.5, 0.25, 0.35, 0.25); g.lineTo(-0.75, 0.25); g.quadraticCurveTo(-0.82, 0, -0.75, -0.25); g.closePath();
    g.fillStyle = 'rgba(110,150,110,.55)'; g.fill(); line(g); g.stroke();
    if (it.t === 'bottle_letter') { rrect(g, -0.6, -0.12, 0.9, 0.22, 0.1); g.fillStyle = 'rgba(240,226,190,.8)'; g.fill(); circle(g, 0.86, 0, 0.09); g.fillStyle = '#9a2a20'; g.fill(); }
    g.fillStyle = 'rgba(230,225,210,.9)';
    for (let i = 0; i < 9; i++) { const x = -0.7 + R() * 1.1, y = (R() - 0.5) * 0.4; circle(g, x, y, 0.025 + R() * 0.03); g.fill(); line(g, 0.005, 'rgba(0,0,0,.35)'); g.stroke(); }
    shine(g, -0.1, -0.15, 0.4, 0.03, 0.5, 0);
    g.restore();
  },
  porthole(g, it) {
    circle(g, 0, 0, 0.82); g.fillStyle = metal(g, 'brass', -0.8, -0.8, 0.8, 0.8); g.fill(); line(g); g.stroke();
    circle(g, 0, 0, 0.58); g.fillStyle = radial(g, 0, 0, 0.6, ['#a6c0c4', '#5f7f86', '#2e454a']); g.fill(); line(g); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.2; circle(g, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.04); g.fillStyle = metal(g, 'brass', 0, -0.05, 0, 0.05); g.fill(); line(g, 0.008); g.stroke(); }
    g.save(); g.globalAlpha = 0.45; g.fillStyle = '#3f7a5a'; circle(g, -0.5, 0.45, 0.15); g.fill(); circle(g, 0.55, -0.4, 0.1); g.fill(); g.restore();
    shine(g, -0.2, -0.25, 0.18, 0.06, 0.4);
  },
  bell(g, it, face, R) {
    line(g, 0.05, '#6a5a3a'); g.beginPath(); g.arc(0, -0.72, 0.12, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(-0.28, -0.62); g.quadraticCurveTo(-0.38, -0.1, -0.5, 0.45); g.quadraticCurveTo(-0.7, 0.6, -0.68, 0.68); g.lineTo(0.68, 0.68); g.quadraticCurveTo(0.7, 0.6, 0.5, 0.45); g.quadraticCurveTo(0.38, -0.1, 0.28, -0.62); g.closePath();
    g.fillStyle = metal(g, 'brass', -0.6, 0, 0.6, 0); g.fill(); line(g); g.stroke();
    g.save(); g.globalAlpha = 0.55; g.fillStyle = '#3f8a6a'; for (let i = 0; i < 14; i++) { circle(g, (R() - 0.5) * 1.0, -0.4 + R() * 1.0, 0.03 + R() * 0.07); g.fill(); } g.restore();
    g.fillStyle = 'rgba(235,230,215,.9)'; for (let i = 0; i < 6; i++) { circle(g, (R() - 0.5) * 1.1, 0.3 + R() * 0.35, 0.03 + R() * 0.03); g.fill(); }
    line(g, 0.012, 'rgba(60,40,10,.5)'); g.beginPath(); g.moveTo(-0.45, 0.35); g.lineTo(0.45, 0.35); g.stroke();
    circle(g, 0, 0.78, 0.07); g.fillStyle = metal(g, 'brass', 0, 0.7, 0, 0.85); g.fill(); line(g, 0.01); g.stroke();
    shine(g, -0.2, -0.1, 0.05, 0.3, 0.35, 0.15);
  },
  logbook(g, it, face, R) {
    if (face === 'inside') {
      rrect(g, -0.85, -0.75, 1.7, 1.5, 0.03); g.fillStyle = '#ece0bf'; g.fill(); line(g); g.stroke();
      line(g, 0.008, 'rgba(90,60,30,.4)'); g.beginPath(); g.moveTo(0, -0.75); g.lineTo(0, 0.75); g.stroke();
      for (const s of [-1, 1]) for (let r = 0; r < 10; r++) { const len = 0.25 + R() * 0.45; line(g, 0.012, 'rgba(30,40,70,.55)'); g.beginPath(); g.moveTo(s < 0 ? -0.78 : 0.08, -0.6 + r * 0.12); for (let x = 0; x < len; x += 0.03) g.lineTo((s < 0 ? -0.78 : 0.08) + x, -0.6 + r * 0.12 + Math.sin(x * 60 + r) * 0.008); g.stroke(); }
      g.save(); g.globalAlpha = 0.35; g.fillStyle = '#7a6a4a'; ellipse(g, 0.5, 0.45, 0.35, 0.25); g.fill(); ellipse(g, -0.6, -0.5, 0.25, 0.2); g.fill(); g.restore();
      return;
    }
    rrect(g, -0.65, -0.82, 1.3, 1.64, 0.05); g.fillStyle = '#4a2e1e'; g.fill(); line(g); g.stroke();
    speckle(g, R, 220, -0.6, -0.8, 1.2, 1.6, '#1a100a', 0.012, 0.3);
    rrect(g, -0.4, -0.55, 0.8, 0.3, 0.02); line(g, 0.01, 'rgba(220,190,120,.7)'); g.stroke();
    text(g, '望舒號', 0, -0.45, 0.1, 'rgba(220,190,120,.85)'); text(g, '航海日誌', 0, -0.32, 0.08, 'rgba(220,190,120,.85)');
    g.save(); g.globalAlpha = 0.45; g.fillStyle = '#c8b890'; ellipse(g, 0.3, 0.5, 0.35, 0.25); g.fill(); g.restore();
  },
  photo(g, it, face, R) {
    rrect(g, -0.85, -0.62, 1.7, 1.24, 0.02); g.fillStyle = face === 'back' ? '#e8dcc0' : '#f0e6d0'; g.fill(); line(g); g.stroke();
    if (face === 'back') {
      for (let r = 0; r < 5; r++) { line(g, 0.012, 'rgba(40,40,60,.55)'); g.beginPath(); g.moveTo(-0.7, -0.35 + r * 0.16); for (let x = 0; x < 1.4; x += 0.03) g.lineTo(-0.7 + x, -0.35 + r * 0.16 + Math.sin(x * 50 + r) * 0.01); g.stroke(); }
      line(g, 0.01, 'rgba(60,60,60,.8)'); g.beginPath(); g.moveTo(0.1, 0.3); g.lineTo(0.55, 0.28); g.stroke();
      return;
    }
    rrect(g, -0.75, -0.52, 1.5, 1.04, 0.01); g.fillStyle = radial(g, 0, 0, 1.0, ['#c9b08a', '#a08460', '#6a5038']); g.fill();
    g.fillStyle = 'rgba(80,60,40,.5)'; g.fillRect(-0.75, 0.15, 1.5, 0.37);
    for (let i = 0; i < 7; i++) {
      const x = -0.54 + i * 0.18, h = i === 3 ? 0.04 : 0;
      g.fillStyle = 'rgba(40,28,18,.85)';
      circle(g, x, -0.2 - h, 0.055); g.fill();
      rrect(g, x - 0.07, -0.14 - h, 0.14, 0.34 + h, 0.04); g.fill();
      if (i === 3) { g.fillRect(x - 0.07, -0.29, 0.14, 0.04); }
    }
    speckle(g, R, 200, -0.75, -0.52, 1.5, 1.04, '#fff', 0.008, 0.2);
  },
  paper(g, it, face, R) {
    g.save(); g.rotate(-0.04);
    rrect(g, -0.7, -0.82, 1.4, 1.64, 0.01); g.fillStyle = '#eee2c2'; g.fill(); line(g, 0.01); g.stroke();
    for (let r = 0; r < 12; r++) { const len = 0.9 + R() * 0.3; line(g, 0.013, 'rgba(30,25,40,.6)'); g.beginPath(); g.moveTo(-0.58, -0.65 + r * 0.11); for (let x = 0; x < len; x += 0.025) g.lineTo(-0.58 + x, -0.65 + r * 0.11 + Math.sin(x * 70 + r * 3) * 0.008); g.stroke(); }
    if (it.t === 'iou') { g.fillStyle = 'rgba(170,40,30,.75)'; ellipse(g, 0.4, 0.6, 0.08, 0.1); g.fill(); }
    g.save(); g.globalAlpha = 0.25; g.fillStyle = '#a08050'; ellipse(g, -0.3, 0.5, 0.3, 0.2); g.fill(); g.restore();
    g.restore();
  },
};

// —— 痕迹 ——
function drawMark(g, it, d, R) {
  const x = d.x * 2 - 1, y = d.y * 2 - 1, s = d.r * 2;
  g.save();
  switch (d.mark) {
    case 'stamp': {
      const w = Math.max(0.1, (d.mt || '').length * 0.045 + 0.04), h = 0.07;
      rrect(g, x - w / 2, y - h / 2, w, h, 0.01); g.fillStyle = 'rgba(0,0,0,.12)'; g.fill(); line(g, 0.005, 'rgba(40,30,20,.6)'); g.stroke();
      text(g, d.mt || '', x, y + 0.002, 0.042, 'rgba(30,25,20,.85)'); break;
    }
    case 'engrave': {
      const n = (d.mt || '').length, sz = Math.min(0.07, 0.95 / Math.max(1, n));
      text(g, d.mt, x + 0.004, y + 0.004, sz, 'rgba(255,255,255,.45)');
      text(g, d.mt, x, y, sz, 'rgba(40,30,20,.7)'); break;
    }
    case 'crack': {
      line(g, 0.008, 'rgba(30,25,20,.75)'); g.beginPath();
      let px = x - s * 0.5, py = y - s * 0.4; g.moveTo(px, py);
      for (let i = 1; i <= 6; i++) { px = x - s * 0.5 + s * i / 6; py = y - s * 0.4 + s * 0.8 * i / 6 + (R() - 0.5) * s * 0.25; g.lineTo(px, py); }
      g.stroke(); line(g, 0.004, 'rgba(255,255,255,.5)'); g.translate(0.006, 0); g.stroke(); break;
    }
    case 'chip': {
      g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.1); g.lineTo(x - s * 0.05, y + s * 0.25); g.lineTo(x + s * 0.25, y + s * 0.05); g.lineTo(x + s * 0.1, y - s * 0.25); g.closePath();
      g.fillStyle = 'rgba(210,190,160,.95)'; g.fill(); line(g, 0.006, 'rgba(60,40,20,.7)'); g.stroke(); break;
    }
    case 'bubble': {
      for (let i = 0; i < 7; i++) { const bx = x + (R() - 0.5) * s * 0.8, by = y + (R() - 0.5) * s * 0.8, br = 0.008 + R() * 0.012; circle(g, bx, by, br); line(g, 0.003, 'rgba(255,255,255,.85)'); g.stroke(); circle(g, bx - br * 0.3, by - br * 0.3, br * 0.3); g.fillStyle = '#fff'; g.fill(); }
      break;
    }
    case 'seam': { line(g, 0.006, 'rgba(255,255,255,.7)'); g.beginPath(); g.moveTo(x, y - s * 0.6); g.lineTo(x + 0.004, y + s * 0.6); g.stroke(); line(g, 0.004, 'rgba(40,40,40,.5)'); g.beginPath(); g.moveTo(x + 0.008, y - s * 0.6); g.lineTo(x + 0.012, y + s * 0.6); g.stroke(); break; }
    case 'wear': {
      g.fillStyle = 'rgba(190,100,50,.75)'; g.beginPath();
      for (let i = 0; i <= 10; i++) { const a = i / 10 * 6.28, rr = s * (0.22 + R() * 0.12); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
      g.closePath(); g.fill(); break;
    }
    case 'scratch': { line(g, 0.004, 'rgba(255,255,255,.7)'); for (let i = 0; i < 6; i++) { const a = R() * 3.14; g.beginPath(); g.moveTo(x + (R() - 0.5) * s * 0.6, y + (R() - 0.5) * s * 0.6); g.lineTo(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4); g.stroke(); } break; }
    case 'solder': { g.fillStyle = 'rgba(140,140,135,.95)'; ellipse(g, x, y, s * 0.18, s * 0.1, -0.7); g.fill(); line(g, 0.004, 'rgba(60,60,60,.7)'); g.stroke(); break; }
    case 'patina': { g.fillStyle = 'rgba(60,130,90,.7)'; for (let i = 0; i < 6; i++) { circle(g, x + (R() - 0.5) * s * 0.6, y + (R() - 0.5) * s * 0.6, 0.015 + R() * 0.02); g.fill(); } break; }
    case 'rust': { g.fillStyle = 'rgba(150,70,30,.8)'; for (let i = 0; i < 8; i++) { circle(g, x + (R() - 0.5) * s * 0.7, y + (R() - 0.5) * s * 0.7, 0.012 + R() * 0.025); g.fill(); } break; }
    case 'dent': { g.fillStyle = 'rgba(0,0,0,.3)'; ellipse(g, x, y, s * 0.3, s * 0.18, 0.4); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; ellipse(g, x + 0.01, y - 0.012, s * 0.24, s * 0.1, 0.4); g.fill(); break; }
    case 'dye': { line(g, 0.01, 'rgba(170,50,20,.9)'); g.beginPath(); g.moveTo(x - s * 0.4, y - s * 0.2); g.quadraticCurveTo(x, y + s * 0.1, x + s * 0.4, y + s * 0.3); g.stroke(); g.fillStyle = 'rgba(180,70,30,.35)'; ellipse(g, x, y, s * 0.35, s * 0.2, 0.5); g.fill(); break; }
    case 'carve': { line(g, 0.003, 'rgba(40,70,50,.7)'); for (let i = 0; i < 6; i++) { g.beginPath(); for (let t = -1; t <= 1; t += 0.1) { const xx = x + t * s * 0.5, yy = y - s * 0.3 + i * s * 0.12 + Math.sin(t * 9 + i) * 0.008; t === -1 ? g.moveTo(xx, yy) : g.lineTo(xx, yy); } g.stroke(); } break; }
    case 'reign': {
      line(g, 0.006, 'rgba(36,64,122,.85)'); g.strokeRect(x - 0.13, y - 0.13, 0.26, 0.26);
      const t = d.mt || '大清乾隆年制';
      for (let i = 0; i < 6; i++) { const col = 2 - Math.floor(i / 2), row = i % 2; text(g, t[i], x - 0.08 + col * 0.08 - 0.08 + 0.08, y - 0.05 + row * 0.09, 0.07, it.d.includes('fakereign') ? 'rgba(58,90,208,.95)' : 'rgba(36,64,122,.9)'); }
      break;
    }
    case 'anchor': {
      line(g, 0.012, 'rgba(70,50,15,.85)');
      g.beginPath(); g.moveTo(x, y - 0.1); g.lineTo(x, y + 0.1); g.stroke(); g.beginPath(); g.moveTo(x - 0.05, y - 0.06); g.lineTo(x + 0.05, y - 0.06); g.stroke();
      g.beginPath(); g.arc(x, y + 0.02, 0.08, 0.3, Math.PI - 0.3); g.stroke(); circle(g, x, y - 0.12, 0.02); g.stroke();
      const t = d.mt || ''; for (let i = 0; i < t.length; i++) { const a = -Math.PI / 2 - 0.9 + i * 0.6; text(g, t[i], x + Math.cos(a) * 0.17, y + Math.sin(a) * 0.17, 0.045, 'rgba(70,50,15,.85)'); }
      break;
    }
    case 'thread': { line(g, 0.006, 'rgba(255,255,255,.75)'); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + 0.12, y + 0.12, s * 0.5 + i * 0.022, Math.PI * 1.05, Math.PI * 1.45); g.stroke(); } break; }
    case 'staple': { line(g, 0.006, 'rgba(30,25,20,.6)'); g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.4); g.lineTo(x + s * 0.05, y + s * 0.4); g.stroke(); for (const t of [-0.2, 0.15]) { line(g, 0.016, 'rgba(160,100,50,.95)'); g.beginPath(); g.moveTo(x - s * 0.22 + t * s * 0.2, y + t * s); g.lineTo(x + s * 0.2 + t * s * 0.2, y + t * s); g.stroke(); } break; }
    case 'broken': { line(g, 0.008, 'rgba(30,25,20,.8)'); g.beginPath(); g.moveTo(x - s * 0.2, y - s * 0.2); g.lineTo(x + s * 0.2, y + s * 0.2); g.moveTo(x + s * 0.2, y - s * 0.2); g.lineTo(x - s * 0.2, y + s * 0.2); g.stroke(); break; }
    case 'tear': { g.fillStyle = 'rgba(60,50,40,.55)'; g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.3); g.lineTo(x, y - s * 0.05); g.lineTo(x + s * 0.05, y + s * 0.35); g.lineTo(x - s * 0.05, y); g.closePath(); g.fill(); break; }
    case 'seal': case 'seal2': {
      g.fillStyle = d.mark === 'seal' ? 'rgba(140,40,30,.9)' : 'rgba(235,40,40,.95)';
      g.fillRect(x - 0.05, y - 0.05, 0.1, 0.1); text(g, d.mt || '印', x, y, 0.07, '#f3e7cf'); break;
    }
    case 'photo': {
      ellipse(g, x, y, 0.16, 0.2); g.fillStyle = radial(g, x, y, 0.2, ['#d9c4a0', '#a88a64', '#6a5038']); g.fill(); line(g, 0.006); g.stroke();
      g.fillStyle = 'rgba(40,28,18,.85)'; circle(g, x, y - 0.04, 0.05); g.fill(); g.beginPath(); g.moveTo(x - 0.09, y + 0.16); g.quadraticCurveTo(x, y, x + 0.09, y + 0.16); g.fill();
      line(g, 0.012, 'rgba(40,28,18,.85)'); g.beginPath(); g.moveTo(x + 0.04, y - 0.02); g.quadraticCurveTo(x + 0.08, y + 0.06, x + 0.06, y + 0.12); g.stroke();
      break;
    }
    case 'paper': {
      g.save(); g.translate(x, y); g.rotate(-0.15);
      rrect(g, -0.16, -0.11, 0.32, 0.22, 0.01); g.fillStyle = '#e7d7ad'; g.fill(); line(g, 0.005, 'rgba(60,40,20,.6)'); g.stroke();
      for (let i = 0; i < 4; i++) { line(g, 0.006, 'rgba(30,25,40,.55)'); g.beginPath(); g.moveTo(-0.12, -0.06 + i * 0.04); g.lineTo(0.1 - (i % 2) * 0.05, -0.06 + i * 0.04); g.stroke(); }
      g.fillStyle = 'rgba(150,40,30,.7)'; g.fillRect(0.06, 0.04, 0.05, 0.05);
      g.restore(); break;
    }
    case 'holes': { g.fillStyle = 'rgba(30,25,20,.8)'; for (let i = 0; i < 7; i++) { circle(g, x + (R() - 0.5) * s * 0.7, y + (R() - 0.5) * s * 0.7, 0.008 + R() * 0.008); g.fill(); } break; }
    case 'grain': { line(g, 0.003, 'rgba(200,90,40,.55)'); for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x - s * 0.3 + i * s * 0.07, y - s * 0.4); g.quadraticCurveTo(x - s * 0.25 + i * s * 0.07, y, x - s * 0.3 + i * s * 0.07, y + s * 0.4); g.stroke(); } break; }
    case 'inner': {
      g.fillStyle = 'rgba(60,70,90,.7)'; g.beginPath(); g.moveTo(x - 0.1, y + 0.02); g.lineTo(x + 0.1, y + 0.02); g.lineTo(x + 0.07, y + 0.05); g.lineTo(x - 0.07, y + 0.05); g.fill();
      line(g, 0.004, 'rgba(60,70,90,.7)'); g.beginPath(); g.moveTo(x, y + 0.02); g.lineTo(x, y - 0.1); g.lineTo(x + 0.06, y - 0.01); g.stroke();
      line(g, 0.003, 'rgba(60,90,110,.5)'); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 0.15, y + 0.08 + i * 0.02); g.quadraticCurveTo(x, y + 0.06 + i * 0.02, x + 0.15, y + 0.08 + i * 0.02); g.stroke(); }
      break;
    }
    case 'crackle': { line(g, 0.004, 'rgba(40,40,30,.55)'); for (let i = 0; i < 12; i++) { const a = R() * 6.28, l = 0.05 + R() * 0.12; const bx = x + (R() - 0.5) * s, by = y + (R() - 0.5) * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * l, by + Math.sin(a) * l); g.lineTo(bx + Math.cos(a + 0.8) * l * 1.4, by + Math.sin(a + 0.8) * l * 1.4); g.stroke(); } break; }
    default: break;
  }
  g.restore();
}

// 把一件东西的一面画在 g 上，范围是 [0, S]
export function drawFace(g, it, face, S) {
  const T = ITEMS[it.t];
  const R = rng(it.seed + face.length * 977);
  g.save();
  g.translate(S / 2, S / 2); g.scale(S / 2.25, S / 2.25);
  // 影子
  g.save(); g.globalAlpha = 0.28; g.fillStyle = '#000'; g.filter = 'blur(6px)'; ellipse(g, 0.06, 0.12, 0.8, 0.75); g.restore();
  (DRAW[T.draw] || DRAW.paper)(g, it, face, R);
  for (const d of allDetails(T)) {
    if (!it.d.includes(d.id) || d.face !== face || !d.mark || d.mark === 'none') continue;
    drawMark(g, it, d, rng(it.seed + d.id.length * 131 + face.length));
  }
  g.restore();
}

// 离屏缓存：同一件东西同一面同一尺寸只画一次
const cache = new Map();
export function faceCanvas(it, face, px) {
  const key = `${it.uid}|${face}|${px}|${it.d.join(',')}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = px;
  drawFace(c.getContext('2d'), it, face, px);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}
