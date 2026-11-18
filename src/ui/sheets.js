// 弹层：开张、早晨、收市、库房、当票、笔记、十五夜、结局。
import { DAYS, LAST_DAY } from '../data/plan.js';
import { CLUES, QUESTIONS, LEDGER, ENDINGS } from '../data/text.js';
import { ITEMS } from '../data/items.js';
import { PEOPLE } from '../data/people.js';
import { GOODS, own, readLedger, ledgerPage, heBuy, judge, endingOf, settleDebt, clueAnswers } from '../logic/state.js';
import { estimate, heOffer, nameOf, facesOf, trueValue, looksValue, redeemPrice, allDetails, DEBT } from '../logic/econ.js';
import { tideAt, drawOutside } from '../art/scene.js';
import { faceCanvas } from '../art/items.js';
import { Tray } from './tray.js';
import { sfx } from '../audio.js';
import { $, el, openSheet, closeSheet, wait, toast } from './dom.js';

const card = (...kids) => el('div', { class: 'card' }, ...kids);
const paras = list => list.map(x => el('p', { text: x }));
const until = fn => new Promise(fn);

// —— 开张 ——
export function titleScreen(hasSave) {
  return until(res => {
    const wrap = el('div', { class: 'title-wrap' });
    const cv = el('canvas');
    wrap.append(cv);
    const box = el('div', { class: 'title-box' },
      el('h1', { text: '潮汐当铺' }),
      el('div', { class: 'en', text: 'TIDE  PAWNSHOP' }),
      hasSave ? el('div', {}, el('button', { class: 'btn primary', text: '接着开门', onclick: () => go('load') })) : null,
      el('div', {}, el('button', { class: hasSave ? 'btn' : 'btn primary', text: hasSave ? '重新开张' : '开张', onclick: () => go('new') })),
      el('div', { class: 'small', html: '外婆走了，留下海边一间当铺和三百块的债。<br>十天，看货、讨价、赶海——七月十五是今年最大的潮。<br>电脑用鼠标，手机按住拖动。' }));
    wrap.append(box);
    document.body.append(wrap);
    let raf, t0 = performance.now();
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = (performance.now() - t0) / 1000;
      drawOutside(g, 0, 0, W, H, { t, tod: 0.92, plan: DAYS[LAST_DAY], weather: '晴', night: true });
      g.fillStyle = 'rgba(10,8,20,.35)'; g.fillRect(0, 0, W, H);
    };
    draw();
    function go(k) { cancelAnimationFrame(raf); wrap.remove(); res(k); }
  });
}

// —— 早晨 ——
export function drawTideChart(cv, plan, S) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 600, H = cv.clientHeight || 130;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#e8dcbe'; g.fillRect(0, 0, W, H);
  const x = h => 30 + (h - 4) / 18 * (W - 40), y = v => H / 2 - 6 - v * (H / 2 - 28);
  g.strokeStyle = 'rgba(80,60,30,.25)'; g.lineWidth = 1;
  for (let h = 4; h <= 22; h += 2) { g.beginPath(); g.moveTo(x(h), 8); g.lineTo(x(h), H - 14); g.stroke(); }
  g.fillStyle = '#6a5640'; g.font = '11px serif'; g.textAlign = 'center';
  for (let h = 6; h <= 22; h += 4) g.fillText(h + '时', x(h), H - 2);
  // 滩面高度
  const flat = 0.35 - plan.amp * 0.7;
  g.fillStyle = 'rgba(138,116,88,.35)'; g.fillRect(30, y(flat), W - 40, H - 14 - y(flat));
  // 潮线
  g.beginPath();
  for (let h = 4; h <= 22; h += 0.1) { const v = tideAt(h, plan.low, plan.amp); h === 4 ? g.moveTo(x(h), y(v)) : g.lineTo(x(h), y(v)); }
  g.strokeStyle = '#2f6f7f'; g.lineWidth = 2.5; g.stroke();
  const [hh, mm] = plan.low.split(':').map(Number), low = hh + mm / 60;
  g.fillStyle = '#b0402e'; g.beginPath(); g.arc(x(low), y(tideAt(low, plan.low, plan.amp)), 4, 0, 7); g.fill();
  g.fillText('落潮 ' + plan.low, x(low), y(tideAt(low, plan.low, plan.amp)) + 17);
  g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x(9), 8, x(18) - x(9), H - 22);
  g.fillStyle = '#6a5640'; g.textAlign = 'right'; g.fillText('开门 9—18 时', x(18) - 4, 18);
}

export function morningSheet(app) {
  const S = app.S, plan = DAYS[S.day];
  return until(res => {
    const cv = el('canvas', { class: 'tidechart' });
    const lines = [];
    if (plan.boat) lines.push('海燕号傍晚靠岸，收货的何先生会来铺子里看货。');
    if (plan.storm) lines.push('风雨天，滩上下不去，船也出不了海。');
    if (S.day === LAST_DAY) lines.push('今天是十五。晚上，郑三爷来收账。');
    else lines.push(`离十五还有 ${LAST_DAY - S.day} 天。欠郑记 ${S.debt} 块，柜里现钱 ${S.cash} 块。`);
    const due = own(S, 'pawn').filter(it => it.due === S.day);
    if (due.length) lines.push(`今天到期的当：${due.map(nameOf).join('、')}。不来赎，收市后就归铺子。`);
    const reach = plan.amp >= .85 ? '能落到黑礁跟前，二十年来头一回' : plan.amp >= .6 ? '能落到滩的深处' : plan.amp >= .4 ? '能落到滩的中段' : '只露出近岸一小片';
    const c = card(
      el('div', { class: 'sub', text: `第 ${S.day + 1} 天 · ${plan.weather}${plan.tide ? ' · ' + plan.tide : ''}` }),
      el('h2', { class: 'bigdate', text: plan.date }),
      cv,
      el('p', { class: 'sub', text: `今早的潮${reach}。` }),
      ...paras(lines),
      el('div', { class: 'foot' },
        plan.noBeach ? null : el('button', { class: 'btn primary', text: '下滩赶海', onclick: () => { closeSheet(); res('beach'); } }),
        el('button', { class: plan.noBeach ? 'btn primary' : 'btn', text: plan.noBeach ? '开门' : '早些开门（多一位客人）', onclick: () => { closeSheet(); res('early'); } })),
    );
    openSheet(c, { dismiss: false });
    requestAnimationFrame(() => drawTideChart(cv, plan, S));
  });
}

export function prologueSheet() {
  return until(res => {
    openSheet(card(
      el('h2', { text: '潮生当' }),
      ...paras([
        '澜湾镇在海边，镇上只有一家当铺，叫「潮生当」。外婆守了它四十年。',
        '二十年前的七月十五，外公驾着望舒号回港，在黑礁外沉了。公所判的是：船长酒后误航。外婆一个字也不信。',
        '今年三月，外婆病倒，向商行的郑三爷借了三百块。七月初，她走了。',
        '你回来的时候，柜台上还压着她的当簿。',
      ]),
      el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '卸下门板', onclick: () => { closeSheet(); res(); } }))), { dismiss: false });
  });
}

// —— 收市 ——
export function eveningSheet(app) {
  const S = app.S, plan = DAYS[S.day], sum = S.lastSum || { forfeits: [], goods: [], goodsCash: 0, cost: 3 };
  return until(res => {
    const body = el('div');
    const rows = [];
    for (const g of sum.goods) rows.push([`鱼贩收走 ${GOODS[g.k].name} ×${g.n}`, `+${g.price}`, 'plus']);
    rows.push(['灯油、饭钱', `−${sum.cost}`, 'minus']);
    const forfeits = sum.forfeits.map(uid => S.items.find(i => i.uid === uid)).filter(Boolean);
    body.append(el('h3', { text: '收市' }),
      el('table', { class: 'ledger' }, ...rows.map(([a, b, c]) => el('tr', {}, el('td', { text: a }), el('td', { class: 'n ' + c, text: b })))),
      ...(forfeits.length ? [el('p', { text: `过了当期没人来赎，归了铺子：${forfeits.map(nameOf).join('、')}。` })] : []),
      el('p', { html: `柜里现钱 <b>${S.cash}</b> 块；欠郑记 <b>${S.debt}</b> 块。` }));
    const foot = el('div', { class: 'foot' });
    const c = card(el('div', { class: 'sub', text: plan.date + ' · 傍晚' }), body, foot);
    openSheet(c, { dismiss: false });

    const steps = [];
    if (plan.boat) steps.push(() => heSale(app, body));
    if (ledgerPage(S)) steps.push(() => ledger(app, body));
    let i = 0;
    const next = () => {
      foot.innerHTML = '';
      if (i < steps.length) { const f = steps[i++]; f().then(next); return; }
      foot.append(el('button', { class: 'btn primary', text: S.day === LAST_DAY ? '天黑了' : '上门板，歇下', onclick: () => { closeSheet(); res(); } }));
    };
    next();
  });
}

function heSale(app, body) {
  const S = app.S;
  return until(res => {
    const box = el('div');
    body.append(el('h3', { text: '何先生来看货' }), box);
    const items = own(S, 'shop').filter(it => !ITEMS[it.t].letter && it.t !== 'crew_photo');
    if (!items.length) { box.append(el('p', { text: '「库房空着？那下回再来。」何先生点点头，回船上去了。' })); res(); return; }
    box.append(el('p', { class: 'sub', text: '何先生戴上眼镜，一样一样掂过去，报的是实价的九折。勾上要卖的：' }));
    const checks = [];
    const tbl = el('table', { class: 'ledger' });
    for (const it of items) {
      const p = heOffer(it);
      const keep = ITEMS[it.t].story && ['hong_watch', 'logbook', 'bell_ws', 'porthole_ws'].includes(it.t);
      const cb = el('input', { type: 'checkbox' }); cb.checked = p > 0 && !keep; cb.disabled = p <= 0;
      checks.push([cb, it, p]);
      const fake = trueValue(it) < looksValue(it) * 0.4;
      const cost = it.cost != null ? `进价 ${it.cost}` : it.loan ? `当本 ${it.loan}` : it.from === 'beach' ? '滩上捡的' : '';
      tbl.append(el('tr', {}, el('td', {}, el('label', {}, cb, ' ', nameOf(it))), el('td', { class: 'sub', text: (fake ? '「假的。」' : p <= 0 ? '「这个不值钱。」' : '') + cost }), el('td', { class: 'n', text: p > 0 ? p + ' 块' : '—' })));
    }
    box.append(tbl);
    const btn = el('button', { class: 'btn primary', text: '卖给何先生', onclick: () => {
      let total = 0;
      for (const [cb, it, p] of checks) if (cb.checked && p > 0) { heBuy(S, it, p); total += p; }
      if (total) { sfx.coin(8); toast(`何先生 +${total}`, 'good'); }
      box.innerHTML = ''; box.append(el('p', { text: total ? `何先生付了 ${total} 块，把东西装进藤箱。柜里现钱 ${S.cash} 块。` : '这回什么也没卖。' }));
      app.refresh(); app.save(); res();
    } });
    box.append(el('div', { class: 'foot' }, btn));
  });
}

function ledger(app, body) {
  const S = app.S;
  return until(res => {
    const btn = el('button', { class: 'btn', text: '翻开外婆的当簿', onclick: () => {
      const r = readLedger(S);
      btn.remove();
      sfx.page();
      body.append(el('h3', { text: '当簿 · ' + r.page.t }), el('div', { class: 'pagebox', text: r.page.x }));
      if (r.clue) { sfx.clue(); toast('记下：' + CLUES[r.clue].t, 'clue'); if (S.clues.serial_match && S.clueOrder.includes('serial_match') && S.clueOrder[S.clueOrder.length - 1] === 'serial_match') toast('记下：' + CLUES.serial_match.t, 'clue'); }
      app.save(); res();
    } });
    body.append(el('div', { class: 'foot' }, btn));
    btn.scrollIntoView({ block: 'nearest' });
  });
}

// —— 库房 ——
export function storeSheet(app, tab = 'store') {
  const S = app.S;
  const c = card(el('button', { class: 'close', text: '×', onclick: closeSheet }));
  c.classList.add('wide');
  const tabs = el('div', { class: 'tabs' });
  const body = el('div');
  const show = k => {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    body.innerHTML = '';
    if (k === 'store') {
      const items = own(S, 'shop');
      if (!items.length) body.append(el('p', { class: 'sub', text: '库房空着。' }));
      const grid = el('div', { class: 'grid' });
      for (const it of items) grid.append(itemCard(it, () => examineSheet(app, it, () => storeSheet(app, 'store'))));
      body.append(grid);
      body.append(el('p', { class: 'sub', text: '点一样东西可以拿出来细看。傍晚何先生的船靠岸时能卖给他；客人来买时，也从这里挑。' }));
    } else {
      const items = own(S, 'pawn');
      if (!items.length) body.append(el('p', { class: 'sub', text: '没有在当的东西。' }));
      const tbl = el('table', { class: 'ledger' });
      for (const it of items) tbl.append(el('tr', {}, el('td', { text: nameOf(it) }), el('td', { class: 'sub', text: `${PEOPLE[it.owner]?.name || ''} 当 ${it.loan} 块` }), el('td', { class: 'n', text: `${app.dateOf(it.due)}到期 · 赎 ${redeemPrice(it.loan)}` })));
      body.append(tbl, el('p', { class: 'sub', text: '当期内客人随时来赎，付本钱加二成。到期那天收市还没来，东西归铺子。' }));
    }
  };
  for (const [k, n] of [['store', `库房（${own(S, 'shop').length}）`], ['tickets', `当票（${own(S, 'pawn').length}）`]]) tabs.append(el('button', { 'data-k': k, text: n, onclick: () => show(k) }));
  c.append(el('h2', { text: '库房' }), tabs, body);
  openSheet(c);
  show(tab);
}

function itemCard(it, onclick) {
  const cv = el('canvas', { width: 168, height: 168 });
  cv.getContext('2d').drawImage(faceCanvas(it, facesOf(it)[0], 168), 0, 0);
  const e = estimate(it);
  const story = ITEMS[it.t].letter;
  return el('div', { class: 'item-card', onclick }, cv, el('div', { text: nameOf(it) }),
    el('div', { class: 'st', text: story ? '纸上的东西' : `${e.hi < 1 ? '不值钱' : `估 ${Math.round(e.lo)}–${Math.round(e.hi)} 元`} · 看过 ${Math.round((it.cov || 0) * 100)}%` }),
    el('div', { class: 'st', text: it.cost != null ? `进价 ${it.cost}` : it.forfeit ? `死当 · 当本 ${it.loan}` : it.from === 'beach' ? '滩上捡的' : '' }));
}

export function examineSheet(app, it, back) {
  const S = app.S;
  const wrap = el('div', { class: 'ex-wrap' });
  const cv = el('canvas');
  wrap.append(cv);
  const notes = el('div');
  const est = el('p');
  const tools = el('div', { class: 'tabs' });
  const updEst = () => { const e = estimate(it); est.innerHTML = ITEMS[it.t].letter ? '' : `${e.hi < 1 ? '不值钱' : `你估 <b>${Math.round(e.lo)}–${Math.round(e.hi)}</b> 元`} · 看过 ${Math.round((it.cov || 0) * 100)}%${it.w ? ' · 掂过' : ''}`; };
  const listNotes = () => {
    notes.innerHTML = '';
    for (const id of it.f) { const d = allDetails(ITEMS[it.t]).find(x => x.id === id); if (d) notes.append(el('div', { class: 'clue' + (d.clue ? ' key' : ''), text: d.note })); }
    if (!it.f.length) notes.append(el('p', { class: 'sub', text: '还没看出什么。' }));
  };
  const tray = new Tray(cv, {
    onFind: (item, d) => { app.counter.found(item, d); listNotes(); updEst(); },
    onNote: text => notes.prepend(el('div', { class: 'clue', text })),
    onCover: updEst,
  });
  tray.setItem(it, { examine: true });
  for (const f of facesOf(it)) tools.append(el('button', { text: { front: '正面', back: '背面', inside: '里面', bottom: '底部' }[f], onclick: e => { tray.setFace(f); tools.querySelectorAll('button').forEach(b => b.classList.remove('on')); e.target.classList.add('on'); } }));
  tools.firstChild.classList.add('on');
  const wb = el('button', { text: '掂量', onclick: () => { tray.weigh(); wb.disabled = true; updEst(); } }); if (it.w) wb.disabled = true;
  tools.append(wb);
  const c = card(el('button', { class: 'close', text: '×', onclick: done }), el('h2', { text: nameOf(it) }), el('p', { class: 'sub', text: ITEMS[it.t].desc }), wrap, tools, est, notes,
    el('div', { class: 'foot' }, el('button', { class: 'btn', text: '放回去', onclick: done })));
  c.classList.add('wide');
  openSheet(c, { dismiss: false });
  updEst(); listNotes();
  let raf, last = performance.now();
  const loop = now => { raf = requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; tray.resize(); tray.update(dt); tray.draw(now / 1000); };
  raf = requestAnimationFrame(loop);
  function done() { cancelAnimationFrame(raf); closeSheet(); app.save(); if (back) back(); }
}

// —— 笔记 ——
export function notesSheet(app, tab = 'clues') {
  const S = app.S;
  const c = card(el('button', { class: 'close', text: '×', onclick: closeSheet }));
  const tabs = el('div', { class: 'tabs' });
  const body = el('div');
  const show = k => {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    body.innerHTML = '';
    if (k === 'clues') {
      if (!S.clueOrder.length) body.append(el('p', { class: 'sub', text: '还什么也没记下。验货时看出来的字迹、客人说的话、当簿上的事，都会记在这里。' }));
      const key = S.clueOrder.filter(id => CLUES[id].key), other = S.clueOrder.filter(id => !CLUES[id].key);
      if (key.length) body.append(el('h3', { text: '望舒号' }));
      for (const id of key) body.append(el('div', { class: 'clue key' }, el('span', { class: 'seal', text: '望舒' }), el('b', { text: CLUES[id].t }), CLUES[id].x));
      if (other.length) body.append(el('h3', { text: '别的' }));
      for (const id of other) body.append(el('div', { class: 'clue' }, el('b', { text: CLUES[id].t }), CLUES[id].x));
      body.append(el('p', { class: 'sub', text: '十五夜，苏先生会问你四件事：灯塔那夜亮着吗？是谁让灯灭的？船长喝醉了吗？洪伯为什么沉默？' }));
    } else if (k === 'ledger') {
      if (S.flags.ledgerSold) body.append(el('p', { class: 'sub', text: '当簿卖给了郑三爷。' }));
      for (let i = 0; i < S.ledgerRead; i++) body.append(el('h3', { text: LEDGER[i].t }), el('div', { class: 'pagebox', text: LEDGER[i].x }));
      if (!S.ledgerRead) body.append(el('p', { class: 'sub', text: '每天收市以后，可以翻一页外婆的当簿。' }));
    } else {
      body.append(...paras([
        '看货：东西摆上柜面以后，用放大镜（鼠标移动，手机按住拖动）细看。对准一处停一停就能看出来；「翻面」「掂量」也会有发现。看得越全，估价区间越窄。',
        '收当：按你给的钱当出去，当期内客人付本钱加二成来赎；到期不来，东西归铺子。收购：钱货两清。',
        '讨价：照价收最省事；还价太狠客人会恼，连着几回就走了。不识货的人，你给多少他都认——给得公道，口碑会涨。',
        '卖货：客人来买时从库房挑一样给他看，你要价，他还价。海燕号靠岸的傍晚（初六、初九、十二、十五），何先生按实价九折收货。',
        '赶海：早上下滩，点记号走过去挖。潮一天比一天大，越往后能走得越远。海货傍晚鱼贩来收。',
        '口碑：口碑好，客人多，买家肯多掏钱。',
      ]));
    }
  };
  for (const [k, n] of [['clues', '线索'], ['ledger', '外婆的当簿'], ['help', '规矩']]) tabs.append(el('button', { 'data-k': k, text: n, onclick: () => show(k) }));
  c.append(el('h2', { text: '笔记' }), tabs, body);
  openSheet(c);
  show(tab);
}

// —— 十五夜 ——
export function debtSheet(app) {
  const S = app.S;
  return until(res => {
    const r = settleDebt(S);
    const lines = r === 'clear' ? ['郑三爷没来。欠条已经撕了。'] : r === 'paid'
      ? ['郑三爷进门的时候，你已经把钱码在柜上了。', `他一块一块数完，三百块，一块不少。欠条撕成两半，扔进了灯笼里。`, `柜里还剩 ${S.cash} 块。`]
      : ['郑三爷数了数柜上的钱。', `「${S.cash} 块。」他把钱推回来，「差得远。明早，商行来人收铺子。」`];
    if (r === 'paid') sfx.coin(10);
    app.refresh(); app.save();
    openSheet(card(el('div', { class: 'sub', text: '七月十五 · 夜' }), el('h2', { text: '收账' }), ...paras(lines),
      el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '……', onclick: () => { closeSheet(); res(r); } }))), { dismiss: false });
  });
}

export function deductionSheet(app) {
  const S = app.S;
  return until(res => {
    const sels = {};
    const opts = S.clueOrder.filter(id => CLUES[id]);
    const qs = QUESTIONS.map(Q => {
      const s = el('select', {}, el('option', { value: '', text: '——说不清——' }), ...opts.map(id => el('option', { value: id, text: CLUES[id].t })));
      sels[Q.id] = s;
      return el('div', { class: 'q' }, el('b', { text: Q.q }), s);
    });
    const c = card(el('div', { class: 'sub', text: '七月十五 · 夜' }), el('h2', { text: '对质' }),
      ...paras(['夜深了，苏先生和老马一前一后进了铺子。老马摘下帽子，没坐。', '「你说，我听。」苏先生摊开本子。用你记下的东西，回答他的问题。']),
      ...qs,
      el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '就这么说', onclick: submit })));
    openSheet(c, { dismiss: false });
    function submit() {
      const ans = {}; for (const k in sels) if (sels[k].value) ans[k] = sels[k].value;
      const j = judge(S, ans);
      S.answers = ans; S.flags.truth = j.truth;
      const verdict = QUESTIONS.map(Q => `${Q.q}　${j.res[Q.id] ? '——站得住。' : '——说不清。'}`);
      const say = j.truth ? ['老马听完，把帽子戴上了。', '「够了。」他说，「这些东西，够把二十年前的案子翻过来。」']
        : j.right === 2 ? ['苏先生合上本子，叹了口气。「差一样。差一样，就告不倒人。」', '老马没说话，戴上帽子走了。']
          : ['苏先生看了你很久。「凭这些……什么也说明不了。」', '老马走的时候，门板吱呀一声。'];
      c.innerHTML = '';
      c.append(el('div', { class: 'sub', text: '七月十五 · 夜' }), el('h2', { text: '对质' }), ...verdict.map(v => el('p', { class: 'verdict', text: v })), ...paras(say),
        el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '天亮了', onclick: () => { closeSheet(); res(j); } })));
      app.save();
    }
  });
}

function epilogue(S) {
  const L = [], F = S.flags, truth = !!F.truth;
  if (F.wedding) L.push('八月初八，阿凤和海生办了酒。新娘子敬酒的时候，把那枚戒指亮给你看。');
  else if (F.afengRefused) L.push('阿凤的戒指后来当在了县城。海生回来那天，跑了两趟才赎回来。');
  if (F.linFair) L.push('林阿婆的孙子病好了，常蹲在铺子门口看你打算盘。');
  if (F.shitouFair && F.shitouFair2) L.push('小石头攒够了学堂的束脩。放了学，他就趴在柜台上看你验货。');
  else if (F.shitouFair) L.push('小石头还是天天下滩，捡着好东西，头一个拿来给你。');
  if (F.watchBack) L.push(truth ? '洪伯在公所的堂上，把二十年前的事又说了一遍。说完，他把那块表放在桌上——表还停在十一点四十。' : '洪伯戒了酒。每天夜里，他都去灯塔底下坐一会儿。');
  if (F.refusedCase) L.push('瘦猴后来在码头扛包，路过铺子时会冲你点点头。');
  if (F.liedMa) L.push('老马后来再没进过你的铺子。');
  if (S.rep >= 70) L.push('镇上的人说，潮生当又像月娥在的时候了。');
  else if (S.rep < 35) L.push('镇上的人背地里叫你「海蛎子」——只进不出。');
  return L;
}

export function endingSheet(app) {
  const S = app.S;
  const key = endingOf(S);
  S.ending = key; S.phase = 'end';
  app.save();
  const E = ENDINGS[key];
  const st = S.stats;
  const keyClues = S.clueOrder.filter(id => CLUES[id].key).length;
  const allKey = Object.values(CLUES).filter(c => c.key).length;
  return until(res => {
    openSheet(card(
      el('div', { class: 'sub', text: '结局' }), el('h2', { text: E.t }), ...paras(E.x),
      el('h3', { text: '后来' }), ...paras(epilogue(S)),
      el('h3', { text: '这十天' }),
      el('table', { class: 'ledger' },
        ...[
          ['收当 / 收购', `${st.pawned} / ${st.bought} 回`], ['卖出', `${st.sold} 件`], ['客人来赎', `${st.redeemed} 回`],
          ['下滩', `${st.beachTrips} 回，挖了 ${st.finds} 处`], ['口碑', S.rep], ['望舒号的线索', `${keyClues} / ${allKey}`], ['剩下的现钱', S.cash],
        ].map(([a, b]) => el('tr', {}, el('td', { text: a }), el('td', { class: 'n', text: b })))),
      el('p', { class: 'sub', text: key === 'dawn' ? '这是最好的那个结局。' : '一共五个结局。望舒号的事，要凭据——滩上、当簿、客人手里，都有。' }),
      el('div', { class: 'foot' }, el('button', { class: 'btn primary', text: '再开一局', onclick: () => { closeSheet(); res('again'); } }))), { dismiss: false });
  });
}
