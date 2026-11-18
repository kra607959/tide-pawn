// 柜面上的验货盘：放大镜、翻面、掂量。看出来的细节交给 onFind。
import { faceCanvas } from '../art/items.js';
import { ITEMS } from '../data/items.js';
import { allDetails, facesOf } from '../logic/econ.js';
import { sfx } from '../audio.js';

const MAG = 2.4;
const DWELL = 0.3;

export class Tray {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.opts = opts;
    this.it = null; this.face = 'front';
    this.lens = { x: 0, y: 0, on: false, touch: false };
    this.dwell = {}; this.grid = {}; this.flash = [];
    this.weighing = 0; this.examine = false;
    this.dpr = 1; this.W = 0; this.H = 0;
    this.lastMove = 0;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      if (e.pointerType === 'mouse') { this.lens.on = true; this.lens.touch = false; this.lens.x = x; this.lens.y = y; }
      else if (this.lens.down) { this.lens.x = x; this.lens.y = y - this.lensR() - 24; }
      this.lastMove = performance.now();
    });
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.lens.on = false; });
    canvas.addEventListener('pointerdown', e => {
      const [x, y] = pos(e);
      if (e.pointerType !== 'mouse') { canvas.setPointerCapture(e.pointerId); this.lens.down = true; this.lens.on = true; this.lens.touch = true; this.lens.x = x; this.lens.y = y - this.lensR() - 24; }
    });
    const up = e => { if (e.pointerType !== 'mouse') { this.lens.down = false; this.lens.on = false; } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    if (W !== this.W || H !== this.H || dpr !== this.dpr) {
      this.W = W; this.H = H; this.dpr = dpr;
      this.cv.width = W * dpr; this.cv.height = H * dpr;
      this.grid = {};
    }
  }
  area() {
    const A = Math.max(60, Math.min(this.W * 0.84, this.H * 0.74));
    return { A, x: (this.W - A) / 2, y: (this.H - A) / 2 + this.H * 0.01 };
  }
  lensR() { return Math.max(46, Math.min(90, this.area().A * 0.17)); }

  setItem(it, { examine = true } = {}) {
    this.it = it; this.face = facesOf(it)[0]; this.examine = examine;
    this.dwell = {}; this.grid = {}; this.flash = [];
    this.weighing = 0;
    this.opts.onItem && this.opts.onItem(it);
  }
  clear() { this.it = null; this.opts.onItem && this.opts.onItem(null); }
  setFace(f) { if (this.it && f !== this.face) { this.face = f; sfx.flip(); this.opts.onFace && this.opts.onFace(f); } }
  nextFace() { if (!this.it) return; const fs = facesOf(this.it); this.setFace(fs[(fs.indexOf(this.face) + 1) % fs.length]); }

  // 掂量：返回看出来的细节
  weigh() {
    const it = this.it; if (!it || it.w) return [];
    it.w = true; this.weighing = 0.9; sfx.weigh();
    const out = [];
    for (const d of allDetails(ITEMS[it.t])) if (it.d.includes(d.id) && d.tool === 'weigh') out.push(d);
    setTimeout(() => {
      if (this.it !== it) return;
      if (!out.length) this.opts.onNote && this.opts.onNote('分量对得上，没什么不对。', 'plain');
      for (const d of out) this.opts.onFind && this.opts.onFind(it, d);
    }, 800);
    return out;
  }

  // 有效格：这一面上真有东西的地方
  cells(face) {
    const key = face;
    if (this.grid[key]) return this.grid[key];
    const c = faceCanvas(this.it, face, 60), g = c.getContext('2d');
    const data = g.getImageData(0, 0, 60, 60).data;
    const cells = [];
    for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
      const px = i * 6 + 3, py = j * 6 + 3;
      if (data[(py * 60 + px) * 4 + 3] > 120) cells.push({ u: (i + 0.5) / 10, v: (j + 0.5) / 10, seen: false });
    }
    this.grid[key] = cells;
    return cells;
  }
  coverage() {
    const it = this.it; if (!it) return 0;
    let seen = 0, all = 0;
    for (const f of facesOf(it)) { const cs = this.cells(f); all += cs.length; seen += cs.filter(c => c.seen).length; }
    return all ? seen / all : 0;
  }

  update(dt) {
    if (this.weighing > 0) this.weighing = Math.max(0, this.weighing - dt);
    this.flash = this.flash.filter(f => (f.t -= dt) > 0);
    const it = this.it;
    if (!it || !this.examine || !this.lens.on) return;
    const { A, x, y } = this.area();
    const u = (this.lens.x - x) / A, v = (this.lens.y - y) / A;
    const lr = this.lensR() / A / MAG;  // 放大镜里看得到的半径（物件坐标）
    // 覆盖
    let changed = false;
    for (const c of this.cells(this.face)) if (!c.seen && Math.hypot(c.u - u, c.v - v) < lr * 1.6 + 0.04) { c.seen = true; changed = true; }
    if (changed) { const cov = Math.max(it.cov || 0, this.coverage()); if (cov !== it.cov) { it.cov = cov; this.opts.onCover && this.opts.onCover(cov); } }
    // 细节
    for (const d of allDetails(ITEMS[it.t])) {
      if (!it.d.includes(d.id) || d.face !== this.face || it.f.includes(d.id)) continue;
      const cx = 0.5 + (2 * d.x - 1) / 2.25, cy = 0.5 + (2 * d.y - 1) / 2.25, r = d.r * 2 / 2.25;
      if (Math.hypot(cx - u, cy - v) < r + lr * 0.35) {
        this.dwell[d.id] = (this.dwell[d.id] || 0) + dt;
        if (this.dwell[d.id] > DWELL) { this.flash.push({ cx, cy, r, t: 1.2 }); this.opts.onFind && this.opts.onFind(it, d); }
      } else this.dwell[d.id] = 0;
    }
  }

  draw(t) {
    const g = this.g, { W, H, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 绒布
    const bg = g.createRadialGradient(W * 0.5, H * 0.38, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#2f5552'); bg.addColorStop(0.6, '#1d3735'); bg.addColorStop(1, '#0f1d1c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.06; g.fillStyle = '#000';
    for (let i = 0; i < 70; i++) g.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
    g.restore();
    const it = this.it;
    if (!it) { this.drawIdle(g, W, H); return; }
    const { A, x, y } = this.area();
    const bob = this.weighing > 0 ? Math.sin(this.weighing * 18) * 4 : 0;
    const src = faceCanvas(it, this.face, Math.round(A * dpr * MAG));
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, x, y + bob, A, A);
    // 已看出的细节：淡淡一个圈
    for (const d of allDetails(ITEMS[it.t])) {
      if (!it.f.includes(d.id) || d.face !== this.face) continue;
      const cx = x + A * (0.5 + (2 * d.x - 1) / 2.25), cy = y + A * (0.5 + (2 * d.y - 1) / 2.25), r = A * d.r * 2 / 2.25 + 6;
      g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,230,160,.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.restore();
    }
    for (const f of this.flash) {
      g.save(); g.globalAlpha = Math.min(1, f.t); g.strokeStyle = '#ffe9a0'; g.lineWidth = 3;
      g.beginPath(); g.arc(x + A * f.cx, y + A * f.cy, A * f.r + 10 + (1.2 - f.t) * 30, 0, 7); g.stroke(); g.restore();
    }
    if (this.weighing > 0) {
      g.fillStyle = 'rgba(239,227,200,.92)'; g.font = '16px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center';
      g.fillText('掂一掂……', W / 2, y + A + 4);
    }
    // 放大镜
    if (this.examine && this.lens.on) {
      const R = this.lensR(), lx = this.lens.x, ly = this.lens.y;
      g.save();
      g.beginPath(); g.arc(lx, ly, R, 0, 7); g.clip();
      g.fillStyle = '#183230'; g.fillRect(lx - R, ly - R, R * 2, R * 2);
      // 放大：离屏画布已经是 MAG 倍
      const k = src.width / A;            // 离屏像素 / 屏幕像素
      const sx = (lx - x) * k, sy = (ly - y - bob) * k, sr = R * k / MAG;
      g.drawImage(src, sx - sr, sy - sr, sr * 2, sr * 2, lx - R, ly - R, R * 2, R * 2);
      const gl = g.createRadialGradient(lx - R * 0.4, ly - R * 0.5, 2, lx, ly, R);
      gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gl; g.fillRect(lx - R, ly - R, R * 2, R * 2);
      g.restore();
      g.lineWidth = 7; g.strokeStyle = '#b48a3a'; g.beginPath(); g.arc(lx, ly, R + 3, 0, 7); g.stroke();
      g.lineWidth = 2; g.strokeStyle = '#f0d58a'; g.beginPath(); g.arc(lx, ly, R + 1, 0, 7); g.stroke();
      if (!this.lens.touch) { g.lineWidth = 9; g.strokeStyle = '#4a2a14'; g.beginPath(); g.moveTo(lx + R * 0.72, ly + R * 0.72); g.lineTo(lx + R * 1.3, ly + R * 1.3); g.stroke(); }
    }
  }

  drawIdle(g, W, H) {
    // 算盘和当票
    const A = Math.min(W, H) * 0.5, x = W / 2 - A * 0.6, y = H / 2 - A * 0.25;
    g.save(); g.globalAlpha = 0.55;
    g.fillStyle = '#5a3418'; g.fillRect(x, y, A * 1.2, A * 0.5);
    g.fillStyle = '#2a1608'; g.fillRect(x + 6, y + 6, A * 1.2 - 12, A * 0.5 - 12);
    g.fillStyle = '#5a3418'; g.fillRect(x, y + A * 0.17, A * 1.2, 5);
    for (let i = 0; i < 9; i++) {
      const cx = x + 18 + i * (A * 1.2 - 36) / 8;
      g.fillStyle = '#7a5a3a'; g.fillRect(cx - 1, y + 8, 2, A * 0.5 - 16);
      for (let j = 0; j < 2; j++) { g.fillStyle = '#b07a44'; g.beginPath(); g.ellipse(cx, y + 18 + j * 14, 10, 6, 0, 0, 7); g.fill(); }
      for (let j = 0; j < 4; j++) { g.fillStyle = '#b07a44'; g.beginPath(); g.ellipse(cx, y + A * 0.27 + j * 12 + (i % 3 === 0 ? 0 : 10), 10, 6, 0, 0, 7); g.fill(); }
    }
    g.restore();
  }
}
