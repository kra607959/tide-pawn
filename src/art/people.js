// 柜台对面的人：半身像，按 look 拼出来。坐标以人高为 1，脚底（画面底边）为 y=0，头顶约 y=-1。
const INK = '#2a1c14';

function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
function stroke(g, w = 0.008, c = INK) { g.lineWidth = w; g.strokeStyle = c; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(gg) << 8) | f(b)).toString(16).slice(1);
}

export function drawPerson(g, look, opt = {}) {
  const { mood = 'neutral', t = 0, blink = false, talk = false } = opt;
  const L = look;
  const wide = L.build === 'wide' ? 1.15 : L.build === 'thin' ? 0.88 : L.build === 'kid' ? 0.8 : 1;
  const kid = L.build === 'kid';
  const breathe = Math.sin(t * 1.6) * 0.004;
  g.save();
  if (kid) { g.translate(0, 0.0); g.scale(0.86, 0.86); }

  // —— 身子 ——
  g.save(); g.translate(0, breathe);
  const sw = 0.36 * wide;
  g.beginPath();
  g.moveTo(-sw - 0.03, 0.02); g.lineTo(-sw, -0.26); g.quadraticCurveTo(-sw + 0.02, -0.37, -0.1, -0.41);
  g.lineTo(0.1, -0.41); g.quadraticCurveTo(sw - 0.02, -0.37, sw, -0.26); g.lineTo(sw + 0.03, 0.02); g.closePath();
  const cg = g.createLinearGradient(-sw, 0, sw, 0); cg.addColorStop(0, shade(L.cloth, -0.25)); cg.addColorStop(0.45, L.cloth); cg.addColorStop(1, shade(L.cloth, -0.35));
  g.fillStyle = cg; g.fill(); stroke(g, 0.01);
  drawCollar(g, L, sw);
  g.restore();

  // —— 脖子与头 ——
  const hy = -0.6 + breathe * 0.6;
  g.fillStyle = shade(L.skin, -0.12); g.fillRect(-0.05, hy + 0.1, 0.1, 0.1);
  // 耳朵
  for (const s of [-1, 1]) { ellipse(g, s * 0.13, hy + 0.01, 0.025, 0.04); g.fillStyle = shade(L.skin, -0.05); g.fill(); stroke(g, 0.006); }
  if (L.earrings) for (const s of [-1, 1]) { ellipse(g, s * 0.135, hy + 0.06, 0.01, 0.016); g.fillStyle = '#e8d9a0'; g.fill(); }
  ellipse(g, 0, hy, 0.13, 0.155); g.fillStyle = L.skin; g.fill(); stroke(g, 0.009);
  if (L.cheeks) { g.save(); g.globalAlpha = 0.28; g.fillStyle = '#e2685a'; ellipse(g, -0.075, hy + 0.04, 0.03, 0.018); g.fill(); ellipse(g, 0.075, hy + 0.04, 0.03, 0.018); g.fill(); g.restore(); }
  if (L.age > 0.6) {
    g.save(); g.globalAlpha = 0.45;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.06, hy + 0.035); g.quadraticCurveTo(s * 0.075, hy + 0.07, s * 0.055, hy + 0.1); stroke(g, 0.004, shade(L.skin, -0.4)); }
    g.beginPath(); g.moveTo(-0.05, hy - 0.08); g.lineTo(0.05, hy - 0.08); stroke(g, 0.003, shade(L.skin, -0.35));
    g.restore();
  }
  drawFace(g, L, hy, mood, blink, talk, t);
  drawHair(g, L, hy);
  drawHat(g, L, hy);
  g.restore();
}

function drawCollar(g, L, sw) {
  const c = L.collar;
  g.save();
  if (c === 'mandarin') {
    g.fillStyle = shade(L.cloth, -0.15); g.fillRect(-0.075, -0.43, 0.15, 0.05); g.strokeStyle = INK; g.lineWidth = 0.006; g.strokeRect(-0.075, -0.43, 0.15, 0.05);
    g.beginPath(); g.moveTo(0.0, -0.38); g.quadraticCurveTo(0.1, -0.3, 0.2, -0.32); stroke(g, 0.006);
    for (const [x, y] of [[0.06, -0.335], [0.15, -0.315], [0.22, -0.2]]) { ellipse(g, x, y, 0.012, 0.008); g.fillStyle = shade(L.cloth, -0.4); g.fill(); }
  } else if (c === 'jacket') {
    g.beginPath(); g.moveTo(0, -0.4); g.lineTo(0, 0.02); stroke(g, 0.006);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-0.03, -0.34 + i * 0.09); g.lineTo(0.03, -0.34 + i * 0.09); stroke(g, 0.01, shade(L.cloth, -0.5)); }
    g.fillStyle = shade(L.cloth, -0.15); g.fillRect(-0.07, -0.43, 0.14, 0.04);
  } else if (c === 'suit') {
    g.beginPath(); g.moveTo(-0.08, -0.41); g.lineTo(0, -0.22); g.lineTo(0.08, -0.41); g.closePath(); g.fillStyle = '#f2ede2'; g.fill();
    g.beginPath(); g.moveTo(-0.015, -0.38); g.lineTo(0.015, -0.38); g.lineTo(0.02, -0.25); g.lineTo(0, -0.22); g.lineTo(-0.02, -0.25); g.closePath(); g.fillStyle = '#7a2a2a'; g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.08, -0.41); g.lineTo(s * 0.03, -0.18); g.lineTo(s * 0.14, -0.28); g.closePath(); g.fillStyle = shade(L.cloth, -0.2); g.fill(); stroke(g, 0.006); }
  } else if (c === 'uniform') {
    g.fillStyle = shade(L.cloth, -0.2); g.fillRect(-0.08, -0.43, 0.16, 0.05);
    g.beginPath(); g.moveTo(0, -0.38); g.lineTo(0, 0.02); stroke(g, 0.005, shade(L.cloth, -0.5));
    for (let i = 0; i < 4; i++) { ellipse(g, 0.025, -0.33 + i * 0.09, 0.012, 0.012); g.fillStyle = '#c9a85a'; g.fill(); }
  } else if (c === 'apron') {
    g.beginPath(); g.moveTo(-0.15, -0.3); g.lineTo(0.15, -0.3); g.lineTo(0.2, 0.02); g.lineTo(-0.2, 0.02); g.closePath(); g.fillStyle = '#e6dcc6'; g.fill(); stroke(g, 0.006);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.15, -0.3); g.lineTo(s * 0.08, -0.42); stroke(g, 0.01, '#d8ccb2'); }
  } else {
    g.beginPath(); g.moveTo(-0.08, -0.41); g.lineTo(0, -0.3); g.lineTo(0.08, -0.41); g.closePath(); g.fillStyle = shade(L.skin, -0.1); g.fill(); stroke(g, 0.006);
  }
  if (L.patch) { g.fillStyle = '#9a8a6a'; g.fillRect(-0.22, -0.18, 0.08, 0.07); g.setLineDash([0.01, 0.008]); g.strokeStyle = '#4a3a2a'; g.lineWidth = 0.004; g.strokeRect(-0.22, -0.18, 0.08, 0.07); g.setLineDash([]); }
  if (L.chain) { g.beginPath(); g.moveTo(0.04, -0.2); g.quadraticCurveTo(0.12, -0.12, 0.2, -0.18); stroke(g, 0.006, '#e8c45a'); }
  g.restore();
}

function drawFace(g, L, hy, mood, blink, talk, t) {
  const ey = hy - 0.005;
  // 眉毛
  const browTilt = mood === 'angry' ? 0.025 : mood === 'sad' || mood === 'nervous' ? -0.02 : 0;
  const browC = L.age > 0.6 ? '#9a948c' : shade(L.hair, -0.1);
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 0.025, ey - 0.045 + browTilt); g.lineTo(s * 0.08, ey - 0.05 - browTilt * 0.4); stroke(g, L.age > 0.6 ? 0.008 : 0.01, browC);
  }
  // 眼睛
  for (const s of [-1, 1]) {
    const ex = s * 0.05;
    if (blink || L.eye === 'tired' && Math.sin(t * 0.5) > 0.95) { g.beginPath(); g.moveTo(ex - 0.018, ey); g.lineTo(ex + 0.018, ey); stroke(g, 0.007); continue; }
    if (L.eye === 'smile' || mood === 'happy') { g.beginPath(); g.arc(ex, ey + 0.008, 0.018, Math.PI * 1.15, Math.PI * 1.85); stroke(g, 0.008); continue; }
    ellipse(g, ex, ey, 0.016, mood === 'nervous' ? 0.02 : 0.015); g.fillStyle = '#fbf6ee'; g.fill();
    const look = L.eye === 'shifty' ? Math.sin(t * 0.9) * 0.008 : 0;
    ellipse(g, ex + look, ey + 0.002, 0.009, 0.011); g.fillStyle = '#1c1410'; g.fill();
    if (L.eye === 'tired') { g.beginPath(); g.moveTo(ex - 0.02, ey - 0.006); g.lineTo(ex + 0.02, ey - 0.008); stroke(g, 0.006); }
  }
  if (L.glasses) {
    for (const s of [-1, 1]) { ellipse(g, s * 0.05, ey, 0.032, 0.028); stroke(g, 0.005, '#3a2e24'); }
    g.beginPath(); g.moveTo(-0.018, ey); g.lineTo(0.018, ey); stroke(g, 0.004, '#3a2e24');
  }
  // 鼻子
  g.beginPath(); g.moveTo(0.005, ey + 0.015); g.quadraticCurveTo(0.018, ey + 0.05, -0.008, ey + 0.055); stroke(g, 0.006, shade(L.skin, -0.35));
  if (L.nose) { ellipse(g, 0.002, ey + 0.05, 0.02, 0.015); g.fillStyle = 'rgba(200,70,60,.45)'; g.fill(); }
  // 胡子
  const my = ey + 0.09;
  if (L.beard === 'stubble') { g.save(); g.globalAlpha = 0.35; g.fillStyle = '#3a3230'; for (let i = 0; i < 40; i++) { const a = Math.PI * (0.15 + 0.7 * ((i * 37) % 40) / 40), r = 0.1 + ((i * 13) % 5) * 0.008; g.fillRect(Math.cos(a) * r * 1.1, hy + Math.sin(a) * r * 1.1 - 0.01, 0.006, 0.006); } g.restore(); }
  if (L.beard === 'full') { g.beginPath(); g.moveTo(-0.11, hy + 0.02); g.quadraticCurveTo(-0.1, hy + 0.17, 0, hy + 0.19); g.quadraticCurveTo(0.1, hy + 0.17, 0.11, hy + 0.02); g.quadraticCurveTo(0.05, hy + 0.08, 0, hy + 0.08); g.quadraticCurveTo(-0.05, hy + 0.08, -0.11, hy + 0.02); g.fillStyle = shade(L.hair, 0.1); g.fill(); }
  if (L.beard === 'goatee') { g.beginPath(); g.moveTo(-0.02, my + 0.03); g.lineTo(0.02, my + 0.03); g.lineTo(0, my + 0.09); g.closePath(); g.fillStyle = L.age > 0.6 ? '#bdb6ad' : '#2a2420'; g.fill(); }
  // 嘴
  const open = talk ? Math.abs(Math.sin(t * 14)) * 0.012 : 0;
  g.beginPath();
  if (mood === 'happy') { g.moveTo(-0.035, my - 0.005); g.quadraticCurveTo(0, my + 0.03 + open, 0.035, my - 0.005); }
  else if (mood === 'sad') { g.moveTo(-0.03, my + 0.012); g.quadraticCurveTo(0, my - 0.012, 0.03, my + 0.012); }
  else if (mood === 'angry') { g.moveTo(-0.03, my + 0.005); g.lineTo(0.03, my); }
  else if (mood === 'nervous') { g.moveTo(-0.03, my); g.quadraticCurveTo(-0.015, my - 0.008, 0, my); g.quadraticCurveTo(0.015, my + 0.008, 0.03, my); }
  else { g.moveTo(-0.028, my); g.quadraticCurveTo(0, my + 0.006 + open, 0.028, my); }
  stroke(g, 0.008, '#5a2a22');
  if (L.beard === 'moustache' || L.beard === 'full') { g.beginPath(); g.moveTo(-0.05, my - 0.005); g.quadraticCurveTo(0, my - 0.035, 0.05, my - 0.005); g.quadraticCurveTo(0, my - 0.018, -0.05, my - 0.005); g.fillStyle = L.beard === 'full' ? shade(L.hair, 0.1) : '#2a2420'; g.fill(); }
  if (mood === 'nervous') { ellipse(g, 0.12, hy - 0.06, 0.01, 0.018); g.fillStyle = 'rgba(160,210,240,.85)'; g.fill(); }
}

function drawHair(g, L, hy) {
  const c = L.hair, s = L.hairStyle;
  g.fillStyle = c;
  if (s === 'bald') return;
  g.beginPath();
  if (s === 'bun') {
    g.moveTo(-0.135, hy + 0.02); g.quadraticCurveTo(-0.15, hy - 0.17, 0, hy - 0.17); g.quadraticCurveTo(0.15, hy - 0.17, 0.135, hy + 0.02);
    g.quadraticCurveTo(0.1, hy - 0.1, 0, hy - 0.11); g.quadraticCurveTo(-0.1, hy - 0.1, -0.135, hy + 0.02); g.fill(); stroke(g, 0.006);
    ellipse(g, 0, hy - 0.19, 0.075, 0.055); g.fill(); stroke(g, 0.006);
    if (!L.pinless) { g.beginPath(); g.moveTo(-0.11, hy - 0.2); g.lineTo(0.1, hy - 0.17); stroke(g, 0.01, '#d6dae0'); }
  } else if (s === 'bob') {
    g.moveTo(-0.15, hy + 0.08); g.quadraticCurveTo(-0.17, hy - 0.18, 0, hy - 0.175); g.quadraticCurveTo(0.17, hy - 0.18, 0.15, hy + 0.08);
    g.lineTo(0.11, hy + 0.08); g.quadraticCurveTo(0.12, hy - 0.06, 0.02, hy - 0.08); g.lineTo(-0.11, hy - 0.06); g.lineTo(-0.11, hy + 0.08); g.closePath(); g.fill(); stroke(g, 0.006);
    if (L.clip) { g.fillStyle = '#e8c45a'; g.fillRect(0.07, hy - 0.12, 0.05, 0.015); }
  } else if (s === 'braid') {
    g.moveTo(-0.135, hy - 0.01); g.quadraticCurveTo(-0.14, hy - 0.17, 0, hy - 0.165); g.quadraticCurveTo(0.14, hy - 0.17, 0.135, hy - 0.01); g.quadraticCurveTo(0.08, hy - 0.1, 0, hy - 0.1); g.quadraticCurveTo(-0.08, hy - 0.1, -0.135, hy - 0.01); g.fill(); stroke(g, 0.006);
    for (let i = 0; i < 4; i++) { ellipse(g, 0.13 + i * 0.005, hy + 0.05 + i * 0.06, 0.025, 0.035); g.fillStyle = c; g.fill(); stroke(g, 0.004); }
  } else if (s === 'tuft') {
    g.moveTo(-0.13, hy - 0.02); g.quadraticCurveTo(-0.12, hy - 0.16, 0, hy - 0.16); g.quadraticCurveTo(0.12, hy - 0.16, 0.13, hy - 0.02); g.quadraticCurveTo(0, hy - 0.1, -0.13, hy - 0.02);
    g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(-0.02, hy - 0.15); g.quadraticCurveTo(0, hy - 0.24, 0.04, hy - 0.2); g.quadraticCurveTo(0.02, hy - 0.17, 0.02, hy - 0.15); g.fill();
  } else if (s === 'messy') {
    g.moveTo(-0.14, hy + 0.03);
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = 0.16 + (i % 2) * 0.03; g.lineTo(Math.cos(a) * r, hy - 0.02 + Math.sin(a) * r * 0.95); }
    g.lineTo(0.14, hy + 0.03); g.quadraticCurveTo(0.08, hy - 0.08, 0, hy - 0.09); g.quadraticCurveTo(-0.08, hy - 0.08, -0.14, hy + 0.03); g.fill(); stroke(g, 0.006);
  } else if (s === 'slick') {
    g.moveTo(-0.135, hy - 0.0); g.quadraticCurveTo(-0.14, hy - 0.175, 0, hy - 0.17); g.quadraticCurveTo(0.14, hy - 0.175, 0.135, hy); g.quadraticCurveTo(0.1, hy - 0.12, 0, hy - 0.12); g.quadraticCurveTo(-0.1, hy - 0.12, -0.135, hy); g.fill(); stroke(g, 0.006);
    g.save(); g.globalAlpha = 0.35; g.beginPath(); g.moveTo(-0.06, hy - 0.16); g.quadraticCurveTo(0, hy - 0.165, 0.06, hy - 0.15); stroke(g, 0.008, '#fff'); g.restore();
  } else { // short / side
    g.moveTo(-0.138, hy + 0.01); g.quadraticCurveTo(-0.15, hy - 0.18, 0, hy - 0.175); g.quadraticCurveTo(0.15, hy - 0.18, 0.138, hy + 0.01);
    g.quadraticCurveTo(0.12, hy - 0.08, s === 'side' ? -0.02 : 0, hy - 0.1); g.quadraticCurveTo(-0.1, hy - 0.08, -0.138, hy + 0.01); g.fill(); stroke(g, 0.006);
    if (s === 'side') { g.beginPath(); g.moveTo(-0.04, hy - 0.17); g.lineTo(-0.02, hy - 0.1); stroke(g, 0.005, shade(c, 0.3)); }
  }
}

function drawHat(g, L, hy) {
  const h = L.hat; if (!h) return;
  const c = L.hatColor || '#333';
  g.fillStyle = c;
  const top = hy - 0.15;
  g.beginPath();
  if (h === 'bowler' || h === 'fedora') {
    ellipse(g, 0, top + 0.02, 0.22, 0.04); g.fill(); stroke(g, 0.007);
    g.beginPath(); g.moveTo(-0.13, top + 0.02); g.quadraticCurveTo(-0.14, top - 0.15, 0, top - 0.15); g.quadraticCurveTo(0.14, top - 0.15, 0.13, top + 0.02); g.closePath(); g.fill(); stroke(g, 0.007);
    if (h === 'fedora') { g.beginPath(); g.moveTo(-0.04, top - 0.14); g.quadraticCurveTo(0, top - 0.1, 0.04, top - 0.14); stroke(g, 0.006, shade(c, -0.4)); }
    g.fillStyle = shade(c, -0.5); g.fillRect(-0.13, top - 0.025, 0.26, 0.035);
  } else if (h === 'conical') {
    g.moveTo(-0.3, top + 0.06); g.lineTo(0, top - 0.17); g.lineTo(0.3, top + 0.06); g.quadraticCurveTo(0, top + 0.1, -0.3, top + 0.06); g.fill(); stroke(g, 0.007);
    g.save(); g.globalAlpha = 0.35; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, top - 0.16); g.lineTo(i * 0.09, top + 0.07); stroke(g, 0.004, '#5a4020'); } g.restore();
  } else if (h === 'skullcap') {
    g.moveTo(-0.14, top + 0.06); g.quadraticCurveTo(-0.13, top - 0.08, 0, top - 0.08); g.quadraticCurveTo(0.13, top - 0.08, 0.14, top + 0.06); g.closePath(); g.fill(); stroke(g, 0.007);
    ellipse(g, 0, top - 0.085, 0.02, 0.014); g.fillStyle = '#b0302a'; g.fill();
  } else if (h === 'police' || h === 'student' || h === 'sailor' || h === 'flatcap') {
    const crown = h === 'sailor' ? 0.06 : 0.09;
    g.moveTo(-0.15, top + 0.05); g.lineTo(-0.16, top - crown + 0.02); g.quadraticCurveTo(0, top - crown - 0.03, 0.16, top - crown + 0.02); g.lineTo(0.15, top + 0.05); g.closePath(); g.fill(); stroke(g, 0.007);
    if (h !== 'sailor') { g.beginPath(); g.moveTo(-0.13, top + 0.05); g.quadraticCurveTo(0.02, top + 0.11, 0.16, top + 0.06); g.lineTo(0.15, top + 0.04); g.closePath(); g.fillStyle = h === 'flatcap' ? shade(c, -0.15) : '#111'; g.fill(); stroke(g, 0.006); }
    if (h === 'police') { ellipse(g, 0, top - 0.02, 0.025, 0.02); g.fillStyle = '#d8b85a'; g.fill(); }
    if (h === 'sailor') { g.fillStyle = '#26456a'; g.fillRect(-0.15, top + 0.01, 0.3, 0.025); }
  } else if (h === 'scarf') {
    g.moveTo(-0.16, hy + 0.06); g.quadraticCurveTo(-0.17, top - 0.07, 0, top - 0.06); g.quadraticCurveTo(0.17, top - 0.07, 0.16, hy + 0.06); g.quadraticCurveTo(0.12, hy - 0.1, 0, hy - 0.11); g.quadraticCurveTo(-0.12, hy - 0.1, -0.16, hy + 0.06); g.fill(); stroke(g, 0.007);
    g.beginPath(); g.moveTo(0.14, hy - 0.08); g.quadraticCurveTo(0.22, hy - 0.06, 0.2, hy + 0.04); stroke(g, 0.02, c);
  }
}
