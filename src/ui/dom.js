export const $ = s => document.querySelector(s);
export const wait = ms => new Promise(r => setTimeout(r, ms));

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

export function toast(text, cls = '') {
  const t = el('div', { class: 'toast ' + cls, text });
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3200);
}

export function stamp(parent, text) {
  const s = el('div', { class: 'stamp', text });
  parent.append(s);
  setTimeout(() => s.remove(), 1600);
}

// 弹层：返回卡片元素；close() 关掉
export function openSheet(card, { dismiss = true } = {}) {
  const sh = $('#sheet');
  sh.innerHTML = '';
  sh.append(card);
  sh.hidden = false;
  sh.onclick = dismiss ? (e => { if (e.target === sh) closeSheet(); }) : null;
  return card;
}
export function closeSheet() {
  const sh = $('#sheet');
  sh.hidden = true; sh.innerHTML = '';
  if (sh._onclose) { const f = sh._onclose; sh._onclose = null; f(); }
}
export const sheetOpen = () => !$('#sheet').hidden;

export function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
