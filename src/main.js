// 潮汐当铺：开张、早晨、柜台、收市，一天一天往下走。
import { DAYS, LAST_DAY } from './data/plan.js';
import { PEOPLE } from './data/people.js';
import { newGame, startDay, openShop, closeDay, nextDay, save as saveState, load as loadState, SAVE_KEY, VERSION, own, isLast } from './logic/state.js';
import { estimate, nameOf, facesOf, FACE_NAMES } from './logic/econ.js';
import { tideAt, drawShop } from './art/scene.js';
import { Tray } from './ui/tray.js';
import { Counter } from './ui/counter.js';
import { runVisit } from './story/index.js';
import { runBeach } from './ui/beach.js';
import {
  titleScreen, morningSheet, prologueSheet, eveningSheet, storeSheet, notesSheet, debtSheet, deductionSheet, endingSheet,
} from './ui/sheets.js';
import { initAudio, sfx, ambience, tickAmbience, toggleMute, isMuted } from './audio.js';
import { $, el, wait, sheetOpen } from './ui/dom.js';

let store = null;
try { store = window.localStorage; store.setItem('tidepawn.probe', '1'); store.removeItem('tidepawn.probe'); } catch (e) { store = null; }

class App {
  constructor() {
    this.S = null;
    this.person = null;
    this.enterT = 1;
    this.leaving = false;
    this.tod = 0.1;
    this.night = false;
    this.blinkT = 2;
    this.sceneCv = $('#scene');
    this.tray = new Tray($('#tray'), {
      onFind: (it, d) => this.counter && this.counter.found(it, d),
      onNote: (text, k) => this.counter && this.counter.note(text, k),
      onCover: () => this.counter && this.counter.deal_ && this.counter.deal_.render(),
      onItem: it => this.trayHead(it),
      onFace: () => this.trayHead(this.tray.it),
    });
    for (const b of document.querySelectorAll('#top nav [data-open]')) b.addEventListener('click', () => this.openPanel(b.dataset.open));
    $('#b-mute').addEventListener('click', () => { initAudio(); $('#b-mute').textContent = toggleMute() ? '静' : '♪'; });
    $('#b-mute').textContent = isMuted() ? '静' : '♪';
    window.__tide = this;
  }

  dateOf(day) { return DAYS[Math.min(day, DAYS.length - 1)].date.replace('七月', '') + (day > LAST_DAY ? '之后' : ''); }
  save() { if (store && this.S) saveState(this.S, store); }

  openPanel(k) {
    if (!this.S) return;
    initAudio();
    const b = document.querySelector(`#top nav [data-open="${k}"] .dot`); if (b) b.remove();
    if (k === 'store') storeSheet(this, 'store');
    if (k === 'tickets') storeSheet(this, 'tickets');
    if (k === 'notes') notesSheet(this);
  }
  badge(k) {
    const b = document.querySelector(`#top nav [data-open="${k}"]`);
    if (b && !b.querySelector('.dot')) b.append(el('span', { class: 'dot' }));
  }
  refresh() {
    const S = this.S; if (!S) return;
    const plan = DAYS[S.day];
    $('#t-date').textContent = plan.date;
    $('#t-weather').textContent = plan.weather + (plan.tide ? ' · ' + plan.tide : '') + (plan.boat ? ' · 船期' : '');
    $('#t-cash').textContent = S.cash;
    $('#t-debt').textContent = S.debt;
    $('#t-rep').textContent = S.rep;
    this.drawTideMini();
  }
  drawTideMini() {
    const cv = $('#t-tide'); if (!cv || !this.S) return;
    const plan = DAYS[this.S.day];
    const dpr = Math.min(2, devicePixelRatio || 1), W = 120, H = 30;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.strokeStyle = '#7fb6c4'; g.lineWidth = 1.5; g.beginPath();
    for (let x = 0; x <= W; x++) { const h = 6 + x / W * 14, v = tideAt(h, plan.low, plan.amp); g.lineTo(x, H / 2 - v * 11); }
    g.stroke();
    const now = 9 + this.tod * 10, nx = (now - 6) / 14 * W;
    g.fillStyle = '#f0c070'; g.beginPath(); g.arc(nx, H / 2 - tideAt(now, plan.low, plan.amp) * 11, 3, 0, 7); g.fill();
  }
  trayHead(it) {
    const head = $('#tray-head'), tools = $('#tray-tools'), hint = $('#tray-hint');
    head.innerHTML = ''; tools.innerHTML = '';
    hint.hidden = !!it;
    if (!it) return;
    head.append(el('b', { text: nameOf(it) }), el('small', { text: (window.__ITEMS_DESC || {})[it.t] || '' }));
    for (const f of facesOf(it)) tools.append(el('button', { class: f === this.tray.face ? 'on' : '', text: FACE_NAMES[f], onclick: () => this.tray.setFace(f) }));
    if (window.__ITEMS_LETTER && window.__ITEMS_LETTER[it.t]) return;
    const w = el('button', { text: it.w ? '掂过了' : '掂量', disabled: !!it.w, onclick: () => { this.tray.weigh(); w.disabled = true; w.textContent = '掂过了'; this.counter.deal_ && this.counter.deal_.render(); } });
    tools.append(w);
  }

  layout() {
    const r = this.sceneCv.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    if (this.sceneCv.width !== W * dpr || this.sceneCv.height !== H * dpr) { this.sceneCv.width = W * dpr; this.sceneCv.height = H * dpr; }
    this.tray.resize();
    return { W, H, dpr };
  }

  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    const t = now / 1000;
    const dt = Math.min(0.1, t - (this.lastT || t)); this.lastT = t;
    const { W, H, dpr } = this.layout();
    // 客人进出、眨眼
    if (this.person) {
      this.enterT = Math.min(1, this.enterT + dt * 3);
      this.blinkT -= dt;
      this.person.blink = this.blinkT < 0.12;
      if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    }
    const enter = this.leaving ? Math.max(0, 1 - (this.leaveK = (this.leaveK || 0) + dt * 3)) : (this.leaveK = 0, this.enterT);
    const g = this.sceneCv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const plan = this.S ? DAYS[this.S.day] : DAYS[0];
    drawShop(g, W, H, { t, tod: this.tod, plan, person: this.person, enter, night: this.night });
    this.tray.update(dt);
    this.tray.draw(t);
    if (this.counter && this.counter.deal_ && this.counter.deal_.tick && !sheetOpen()) this.counter.deal_.tick(dt);
    tickAmbience(t);
    if (!window.__tideStarted) { window.__tideStarted = true; }
  }
}

async function run(app) {
  for (;;) {
    const S = app.S;
    app.refresh();
    if (S.phase === 'morning') {
      app.night = false; app.tod = 0.02; app.refresh();
      ambience(0.12, DAYS[S.day].storm);
      if (S.day === 0) { await prologueSheet(); initAudio(); }
      const k = await morningSheet(app);
      initAudio();
      if (k === 'beach') {
        S.stats.beachTrips++;
        await runBeach(app);
        openShop(S, false);
      } else openShop(S, true);
      app.save();
    }
    if (S.phase === 'shop') {
      ambience(0.08, DAYS[S.day].storm);
      app.counter.S = S;
      while (S.qi < S.queue.length) {
        app.tod = 0.08 + 0.8 * (S.qi / Math.max(1, S.queue.length));
        app.refresh();
        await runVisit(app.counter, S.queue[S.qi]);
        S.qi++;
        app.save();
        await wait(250);
      }
      app.tod = 0.92; app.refresh();
      await app.counter.say('nar', S.day === LAST_DAY ? '天擦黑了。街上有人在往海里放河灯。' : '天擦黑了，你上了门板。');
      S.lastSum = closeDay(S);
      app.night = true;
      app.save();
    }
    if (S.phase === 'evening') {
      app.night = true; app.tod = 1; app.refresh();
      await eveningSheet(app);
      if (isLast(S)) {
        S.phase = 'finale'; app.save();
      } else {
        nextDay(S); app.save(); continue;
      }
    }
    if (S.phase === 'finale') {
      await debtSheet(app);
      if (!S.flags.soldLog) await deductionSheet(app);
      const r = await endingSheet(app);
      if (r === 'again') { app.S = newGame(); app.counter.S = app.S; app.save(); continue; }
    }
    if (S.phase === 'end') {
      const r = await endingSheet(app);
      if (r === 'again') { app.S = newGame(); app.counter.S = app.S; app.save(); continue; }
    }
  }
}

async function boot() {
  const { ITEMS } = await import('./data/items.js');
  window.__ITEMS_DESC = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.desc]));
  window.__ITEMS_LETTER = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, !!v.letter || v.draw === 'photo']));
  const app = new App();
  requestAnimationFrame(t => app.frame(t));
  const saved = store ? loadState(store) : null;
  const k = await titleScreen(!!saved && saved.phase !== 'end');
  initAudio();
  app.S = k === 'load' && saved ? saved : newGame();
  if (app.S.phase === 'shop' && app.S.qi >= app.S.queue.length) { /* 停在收市前 */ }
  app.counter = new Counter(app);
  app.save();
  run(app).catch(e => { console.error(e); $('#say').textContent = '出错了：' + e.message; });
}

boot();
