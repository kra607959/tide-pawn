// 可复现的随机数：同一局、同一天、同一位客人，重开也一模一样。
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) {
    const s = String(x);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= 0x7f; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const between = (r, a, b) => a + (b - a) * r();
export function weighted(r, entries) { // [[key, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let x = r() * total;
  for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
  return entries[entries.length - 1][0];
}
export function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
