// 柜台：剧情脚本用的那套接口（见 story/scripts.js 开头）在浏览器里的实现。
import { PEOPLE } from '../data/people.js';
import { ITEMS } from '../data/items.js';
import { CLUES, QUESTIONS } from '../data/text.js';
import { rng, hash, pick } from '../logic/rng.js';
import {
  estimate, newHaggle, offer, redeemPrice, nameOf, catOf, buyerTerms, trueValue, facesOf, FACE_NAMES, allDetails,
} from '../logic/econ.js';
import { applyDeal, applySale, applyRedeem, gainItem, dropItem, discover, addClue, changeRep, changeCash, own, clueAnswers } from '../logic/state.js';
import { faceCanvas } from '../art/items.js';
import { sfx } from '../audio.js';
import { $, el, wait, toast, stamp, openSheet, closeSheet } from './dom.js';

const LINES = {
  counter: ['{a}，不能再少了。', '再添点，{a}。', '这样，{a}，图个吉利。'],
  no: ['这个数不行。', '您再看看，这东西不止这个价。', '少了，少了。'],
  insult: ['您这是说笑呢？', '这价钱，我还不如扔海里。', '掌柜的，欺负人也不是这么欺负的。'],
  leave: ['算了，我不当了。', '不卖了，告辞。', '罢了罢了。'],
  deal: ['成。', '行吧。', '就这么着。'],
  generous: ['哎呀，您厚道！', '这……多谢掌柜！'],
  refuse: ['那……打扰了。', '不收啊。', '好吧。'],
  impatient: ['（客人敲了敲柜台）', '掌柜的，看好了没有？', '（客人往门外看了一眼）'],
  bcounter: ['{a}，顶天了。', '我最多出到{a}。'],
  bno: ['太贵了。', '这价钱，城里都买得到。'],
  binsult: ['您这是抢钱啊。', '开玩笑吧？'],
  bleave: ['那我再想想。', '算了，下回吧。'],
  bdeal: ['成，包起来吧。', '行，就它了。'],
};

export class Counter {
  constructor(app) {
    this.app = app;
    this.S = app.S;
    this.cur = null;
    this.deal_ = null;
    this.waiting = null;
    this.typing = null;
    const adv = () => this.advance();
    $('#dlg').addEventListener('click', adv);
    $('#scene').addEventListener('click', adv);
    window.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button,select,input') && !document.querySelector('#sheet:not([hidden])') && $('#beach').hidden) { e.preventDefault(); adv(); }
    });
  }
  get tray() { return this.app.tray; }

  // —— 说话 ——
  advance() {
    if (this.typing) { this.typing.finish(); return; }
    if (this.waiting) { const w = this.waiting; this.waiting = null; $('#more').hidden = true; w(); }
  }
  speaker(who) {
    const w = $('#who'), s = $('#say');
    s.className = '';
    if (who === 'me') { w.textContent = '你（心想）'; w.style.color = '#6a5640'; s.className = 'me'; }
    else if (who === 'nar') { w.textContent = ''; s.className = 'nar'; }
    else { const P = PEOPLE[who]; w.textContent = P ? P.name : who; w.style.color = P ? P.color : ''; }
  }
  type(text) {
    const s = $('#say');
    return new Promise(res => {
      let i = 0; const chars = [...text];
      s.textContent = '';
      if (this.app.person && this.cur) this.app.person.talk = true;
      const done = () => { clearInterval(iv); s.textContent = text; this.typing = null; if (this.app.person) this.app.person.talk = false; res(); };
      const iv = setInterval(() => { i += 2; s.textContent = chars.slice(0, i).join(''); if (i >= chars.length) done(); }, 32);
      this.typing = { finish: done };
    });
  }
  async say(who, text, mood) {
    if (mood && who === this.cur && this.app.person) this.app.person.mood = mood;
    this.speaker(who);
    await this.type(text);
    $('#more').hidden = false;
    await new Promise(r => { this.waiting = r; });
  }
  // 不等点击的一句（讨价还价时用）
  line(who, text, mood) {
    if (mood && who === this.cur && this.app.person) this.app.person.mood = mood;
    if (this.typing) this.typing.finish();
    this.speaker(who);
    $('#say').textContent = text;
    $('#more').hidden = true;
  }
  mood(m) { if (this.app.person) this.app.person.mood = m; }

  async enter(pid, mood) {
    const P = PEOPLE[pid];
    this.cur = pid;
    this.S.met[pid] = true;
    sfx.bell();
    this.app.person = { pid, look: P.look, mood: mood || 'neutral', blink: false, talk: false };
    this.app.enterT = 0;
    await wait(500);
  }
  async leave() {
    this.app.leaving = true;
    await wait(420);
    this.app.leaving = false;
    this.app.person = null;
    this.cur = null;
    this.tray.clear();
    this.clearNotes();
    $('#act').innerHTML = '';
  }

  async choose(labels) {
    const box = el('div', { class: 'choices' });
    const act = $('#act'); act.innerHTML = ''; act.append(box);
    $('#more').hidden = true;
    return new Promise(res => {
      labels.forEach((l, i) => box.append(el('button', { text: l, onclick: () => { act.innerHTML = ''; res(i); } })));
    });
  }

  // —— 线索、钱、口碑 ——
  clue(id) {
    if (addClue(this.S, id)) {
      sfx.clue(); toast('记下：' + CLUES[id].t, 'clue');
      if (this.S.clues.serial_match && this.S.clueOrder[this.S.clueOrder.length - 1] === 'serial_match') toast('记下：' + CLUES.serial_match.t, 'clue');
      this.app.badge('notes');
    }
    this.app.refresh();
  }
  rep(n) { changeRep(this.S, n); if (n) toast(`口碑 ${n > 0 ? '+' : ''}${n}`, n > 0 ? 'good' : ''); this.app.refresh(); }
  cash(n) { changeCash(this.S, n); if (n > 0) sfx.coin(4); this.app.refresh(); }
  flag(k) { return this.S.flags[k]; }
  set(k, v = true) { this.S.flags[k] = v; }
  gain(it) { gainItem(this.S, it); toast('收进库房：' + nameOf(it)); this.app.badge('store'); this.app.refresh(); }
  drop(it) { dropItem(this.S, it); this.app.refresh(); }
  redeem(it) { const p = applyRedeem(this.S, it); sfx.coin(5); toast(`赎当 +${p}`, 'good'); this.app.refresh(); return p; }

  // —— 验货：看出来一处 ——
  found(it, d) {
    const clue = discover(this.S, it, d.id);
    sfx.find();
    const kind = d.fake || (d.mod != null && d.mod < 1) ? 'bad' : d.mod > 1 ? 'good' : clue ? 'clue' : '';
    this.note(d.note, kind);
    if (clue) {
      sfx.clue(); toast('记下：' + CLUES[clue].t, 'clue'); this.app.badge('notes');
      if (this.S.clueOrder[this.S.clueOrder.length - 1] === 'serial_match' && clue !== 'serial_match') toast('记下：' + CLUES.serial_match.t, 'clue');
    }
    this.deal_ && this.deal_.render();
    this.app.refresh();
  }
  note(text, kind = '') {
    const box = $('#tray-notes');
    box.prepend(el('div', { class: 'n ' + kind, text }));
    while (box.children.length > 3) box.lastChild.remove();
  }
  clearNotes() { $('#tray-notes').innerHTML = ''; }
  showFoundNotes(it) {
    this.clearNotes();
    for (const id of it.f.slice(-3)) { const d = allDetails(ITEMS[it.t]).find(x => x.id === id); if (d) this.note(d.note, d.fake || d.mod < 1 ? 'bad' : d.mod > 1 ? 'good' : d.clue ? 'clue' : ''); }
  }

  async tip(key) {
    if (this.S.flags['tip_' + key]) return;
    this.S.flags['tip_' + key] = true;
    if (key === 'beginner') {
      await new Promise(res => {
        const c = el('div', { class: 'card' },
          el('h2', { text: '怎么看货' }),
          el('p', { text: '东西摆上柜面以后，在右边的盘子上移动鼠标（手机上按住拖动），放大镜底下能看清细处。对准一处停一停，就看出来了：成色、字号、裂纹、假货的破绽……' }),
          el('p', { text: '看出来的东西会改你心里的估价（蓝色那一段）。看得越全，估价越准。「翻面」看背后，「掂量」试分量。' }),
          el('p', { text: '客人报个价，你可以照价收，也可以还价。压得太狠，客人会走；不识货的人，你给多少他都认——给多少，镇上的人都看着。' }),
          el('p', { class: 'sub', text: '客人等久了会不耐烦。' }),
          el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '知道了', onclick: () => { closeSheet(); res(); } })));
        openSheet(c, { dismiss: false });
      });
    }
  }

  async hints() {
    const S = this.S;
    const have = q => S.clueOrder.find(id => clueAnswers(id).includes(q));
    const lines = {
      light: ['灯塔那夜亮没亮，你手上已经有能说清的东西了。', '灯塔那夜到底亮没亮——还缺一样能说话的东西。滩上、洪伯那里，也许有。'],
      who: ['谁让灯灭的，你也有凭据了。', '是谁让灯灭的，还差一张纸、一句话。郑家的东西、外婆的当簿，都留神。'],
      drunk: ['外公没喝酒，这一条能站住。', '外公喝没喝酒，还得有人——或者有字——替他说话。'],
    };
    for (const q of ['light', 'who', 'drunk']) await this.say('su', lines[q][have(q) ? 0 : 1]);
  }

  // —— 收当 / 收购：你掏钱 ——
  deal(spec) {
    const S = this.S, it = spec.item, who = spec.who;
    const per = spec.persona || {};
    const r = rng(hash(S.seed, 'lines', S.day, S.qi, it.uid));
    this.tray.setItem(it, { examine: true });
    this.clearNotes();
    const h = newHaggle({ side: 'pay', ask: spec.ask, limit: spec.limit, patience: spec.patience });
    const pawn = spec.kind === 'pawn';
    this.line(who, pawn ? `${nameOf(it)}，当 ${h.ask} 块，${spec.term} 天。` : `${nameOf(it)}，${h.ask} 块，您收不收？`);
    let my = Math.max(1, Math.round(h.ask * 0.7));
    const act = $('#act');
    return new Promise(resolve => {
      const D = { h, elapsed: 0, warned: 0, done: false };
      this.deal_ = D;
      const finish = async (res, ms = 900) => {
        if (D.done) return; D.done = true;
        await wait(ms);
        this.deal_ = null; act.innerHTML = '';
        resolve(res);
      };
      const tryOffer = x => {
        if (D.done) return;
        if (x > S.cash) { this.line('me', `柜里只有 ${S.cash} 块。`); sfx.no(); return; }
        const res = offer(h, x);
        if (res.res === 'deal') {
          applyDeal(S, spec, res.price);
          sfx.stamp(); sfx.coin(Math.ceil(res.price / 5));
          stamp($('#tray-wrap'), pawn ? '當' : '收');
          this.line(who, res.generous ? pick(r, LINES.generous) : per.naive ? '谢谢掌柜！' : pick(r, LINES.deal), res.generous || per.naive ? 'happy' : null);
          this.app.refresh(); this.app.badge(pawn ? 'tickets' : 'store');
          finish({ ok: true, price: res.price });
        } else if (res.res === 'counter') {
          sfx.tick(); this.line(who, pick(r, LINES.counter).replace('{a}', h.ask));
          my = Math.min(my, h.ask); D.render();
        } else if (res.res === 'no') {
          sfx.no(); this.line(who, pick(r, res.insult ? LINES.insult : LINES.no), res.insult ? 'angry' : null);
          D.render();
        } else {
          sfx.no(); this.line(who, pick(r, LINES.leave), 'angry');
          if (res.insult) this.rep(-1);
          finish({ ok: false, left: true });
        }
      };
      D.tick = dt => {
        if (D.done) return;
        D.elapsed += dt;
        if (D.elapsed > 16) {
          h.patience -= dt / 18;
          const lost = Math.floor((D.elapsed - 16) / 18);
          if (lost > D.warned) { D.warned = lost; if (h.patience > 0) this.line(who, pick(r, LINES.impatient), 'nervous'); D.render(); }
          if (h.patience <= 0) { this.line(who, '不当了不当了，磨磨蹭蹭的。', 'angry'); finish({ ok: false, left: true }); }
        }
      };
      D.render = () => {
        if (D.done) return;
        const e = estimate(it);
        const top = Math.max(e.hi, h.ask, my, 4) * 1.2;
        const pct = v => Math.min(100, Math.max(0, v / top * 100)) + '%';
        act.innerHTML = '';
        const stepper = el('div', { class: 'stepper' },
          ...[-5, -1].map(d => el('button', { text: d, onclick: () => { my = Math.max(1, my + d); D.render(); } })),
          el('output', { text: my }),
          ...[1, 5].map(d => el('button', { text: '+' + d, onclick: () => { my = my + d; D.render(); } })));
        const pat = el('span', { class: 'patience' }, '耐心 ', ...Array.from({ length: h.start }, (_, i) => el('i', { class: i < Math.ceil(h.patience) ? '' : 'off' })));
        act.append(el('div', { class: 'deal' },
          el('div', { class: 'row' },
            el('span', { class: 'est', html: `你估 <b>${Math.round(e.lo)}–${Math.round(e.hi)}</b> 元 <small>看过 ${Math.round((it.cov || 0) * 100)}%${it.w ? ' · 掂过' : ''}</small>` }),
            el('span', { class: 'ask', html: `${pawn ? '要当' : '要价'} <b>${h.ask}</b> 元` })),
          el('div', { class: 'bar' },
            el('div', { class: 'range', style: `left:${pct(e.lo)};width:calc(${pct(e.hi)} - ${pct(e.lo)})` }),
            el('div', { class: 'mk ask', style: `left:${pct(h.ask)}` }, el('span', { text: '要' + h.ask })),
            el('div', { class: 'mk me', style: `left:${pct(my)}` }, el('span', { text: '你' + my }))),
          pawn ? el('div', { class: 'terms', text: `当期 ${spec.term} 天（到${this.app.dateOf(S.day + spec.term)}），到期赎回 = 本钱加二成。按 ${my} 块当，赎回时收 ${redeemPrice(my)} 块；不来赎，东西归铺子。` }) : null,
          el('div', { class: 'row' }, stepper, pat),
          el('div', { class: 'row' },
            el('button', { class: 'btn primary', text: `出价 ${my}`, onclick: () => tryOffer(my) }),
            el('button', { class: 'btn', text: `照价 ${h.ask}`, onclick: () => tryOffer(h.ask) }),
            el('button', { class: 'btn', text: pawn ? '不收' : '不要', onclick: () => { this.line(who, pick(r, LINES.refuse), 'sad'); finish({ ok: false }, 600); } })),
        ));
      };
      D.render();
    });
  }

  // —— 客人来买：你收钱 ——
  async sell(spec) {
    const S = this.S, who = spec.who;
    const cands = own(S, 'shop').filter(it => !ITEMS[it.t].letter && !(ITEMS[it.t].story && ITEMS[it.t].base <= 1));
    const fit = cands.filter(it => !spec.want || spec.want.includes(catOf(it)));
    if (!fit.length) { await this.say(who, '没有啊……那下回吧。'); return { ok: false }; }
    const act = $('#act');
    const item = await new Promise(res => {
      act.innerHTML = '';
      const grid = el('div', { class: 'pick' });
      for (const it of cands) {
        const ok = fit.includes(it);
        const c = el('canvas', { width: 128, height: 128 });
        c.getContext('2d').drawImage(faceCanvas(it, facesOf(it)[0], 128), 0, 0);
        const e = estimate(it);
        grid.append(el('button', { class: ok ? '' : 'dim', disabled: !ok, onclick: () => res(it) }, c, el('div', { text: nameOf(it) }), el('div', { class: 'terms', text: `估 ${Math.round(e.lo)}–${Math.round(e.hi)}` })));
      }
      act.append(el('div', { class: 'terms', text: '从库房里拿一样给客人看：' }), grid, el('button', { class: 'btn small', text: '没有合适的', onclick: () => res(null) }));
    });
    act.innerHTML = '';
    if (!item) { await this.say(who, '那我再看看。'); return { ok: false }; }
    const r = rng(hash(S.seed, 'buy', S.day, S.qi, item.uid));
    const t = buyerTerms(item, spec.persona || {}, S.rep, r);
    const h = newHaggle({ side: 'get', ...t });
    this.tray.setItem(item, { examine: true });
    this.showFoundNotes(item);
    this.line(who, `这个……${h.ask} 块，卖不卖？`);
    let my = Math.max(h.ask + 1, Math.round(estimate(item).mid * 1.3));
    return new Promise(resolve => {
      const D = { h, elapsed: 0, done: false };
      this.deal_ = D;
      const finish = async (res, ms = 900) => { if (D.done) return; D.done = true; await wait(ms); this.deal_ = null; act.innerHTML = ''; resolve(res); };
      const tryAsk = x => {
        if (D.done) return;
        const res = offer(h, x);
        if (res.res === 'deal') {
          applySale(S, item, res.price);
          sfx.coin(Math.ceil(res.price / 5)); stamp($('#tray-wrap'), '售');
          this.line(who, pick(r, LINES.bdeal), 'happy'); this.app.refresh();
          finish({ ok: true, item, price: res.price });
        } else if (res.res === 'counter') { sfx.tick(); this.line(who, pick(r, LINES.bcounter).replace('{a}', h.ask)); my = Math.max(my, h.ask); D.render(); }
        else if (res.res === 'no') { sfx.no(); this.line(who, pick(r, res.insult ? LINES.binsult : LINES.bno), res.insult ? 'angry' : null); D.render(); }
        else { sfx.no(); this.line(who, pick(r, LINES.bleave), 'angry'); finish({ ok: false }); }
      };
      D.tick = () => {};
      D.render = () => {
        if (D.done) return;
        const e = estimate(item);
        const top = Math.max(e.hi, h.ask, my, 4) * 1.2;
        const pct = v => Math.min(100, Math.max(0, v / top * 100)) + '%';
        act.innerHTML = '';
        act.append(el('div', { class: 'deal' },
          el('div', { class: 'row' },
            el('span', { class: 'est', html: `你估 <b>${Math.round(e.lo)}–${Math.round(e.hi)}</b> 元${item.cost != null ? ` <small>进价 ${item.cost}${item.loan ? '（当本）' : ''}</small>` : item.loan ? ` <small>当本 ${item.loan}</small>` : ''}` }),
            el('span', { class: 'ask', html: `客人出 <b>${h.ask}</b> 元` })),
          el('div', { class: 'bar' },
            el('div', { class: 'range', style: `left:${pct(e.lo)};width:calc(${pct(e.hi)} - ${pct(e.lo)})` }),
            el('div', { class: 'mk ask', style: `left:${pct(h.ask)}` }, el('span', { text: '出' + h.ask })),
            el('div', { class: 'mk me', style: `left:${pct(my)}` }, el('span', { text: '你' + my }))),
          el('div', { class: 'row' }, el('div', { class: 'stepper' },
            ...[-5, -1].map(d => el('button', { text: d, onclick: () => { my = Math.max(1, my + d); D.render(); } })),
            el('output', { text: my }),
            ...[1, 5].map(d => el('button', { text: '+' + d, onclick: () => { my += d; D.render(); } }))),
          el('span', { class: 'patience' }, '耐心 ', ...Array.from({ length: h.start }, (_, i) => el('i', { class: i < Math.ceil(h.patience) ? '' : 'off' })))),
          el('div', { class: 'row' },
            el('button', { class: 'btn primary', text: `要价 ${my}`, onclick: () => tryAsk(my) }),
            el('button', { class: 'btn', text: `就按 ${h.ask} 卖`, onclick: () => tryAsk(h.ask) }),
            el('button', { class: 'btn', text: '不卖', onclick: () => { this.line(who, pick(r, LINES.bleave)); finish({ ok: false }, 600); } }))));
      };
      D.render();
    });
  }

  // —— 给你看一样东西 ——
  async show(it, caption) {
    this.tray.setItem(it, { examine: true });
    this.showFoundNotes(it);
    if (caption) this.line('nar', caption);
    const act = $('#act'); act.innerHTML = '';
    await new Promise(res => act.append(el('div', { class: 'terms', text: '用放大镜细看，看好了再放下。' }), el('button', { class: 'btn primary', text: '看好了', onclick: res })));
    act.innerHTML = '';
    this.tray.clear(); this.clearNotes();
  }
}
