// 声音全由代码合成：门铃、铜钱、盖戳、翻纸、海浪、挖沙。
let ac = null, master = null, waves = null, rain = null;
let muted = false;
try { muted = localStorage.getItem('tidepawn.mute') === '1'; } catch (e) { /* 读不到就算了 */ }

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
  waves = noiseLoop(0.0, 500);
  rain = noiseLoop(0.0, 3000);
}
export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tidepawn.mute', muted ? '1' : '0'); } catch (e) { /* 存不了就算了 */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ac.currentTime, 0.05);
  return muted;
}

function noiseBuffer(sec = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function noiseLoop(vol, freq) {
  const src = ac.createBufferSource(); src.buffer = noiseBuffer(3); src.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const gn = ac.createGain(); gn.gain.value = vol;
  src.connect(f); f.connect(gn); gn.connect(master); src.start();
  return { gain: gn, filter: f };
}

// 海浪随潮水起伏；mood: 'shop' | 'beach' | 'storm' | 'quiet'
export function ambience(level, storm) {
  if (!ac) return;
  const now = ac.currentTime;
  waves.gain.gain.setTargetAtTime(level, now, 0.8);
  rain.gain.gain.setTargetAtTime(storm ? 0.05 : 0, now, 0.8);
}
export function tickAmbience(t) {
  if (!ac) return;
  waves.filter.frequency.setTargetAtTime(380 + Math.sin(t * 0.35) * 220 + Math.sin(t * 0.13) * 120, ac.currentTime, 0.3);
}

function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, decay = dur, glide = 0 } = {}) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t0 + dur);
  const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, { vol = 0.2, freq = 2000, type = 'bandpass', at = 0, q = 1 } = {}) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + at;
  const src = ac.createBufferSource(); src.buffer = noiseBuffer(Math.max(0.1, dur));
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(gn); gn.connect(master); src.start(t0);
}

export const sfx = {
  bell() { tone(1760, 1.2, { vol: 0.12, decay: 1.2 }); tone(2637, 0.9, { vol: 0.06, decay: 0.9, at: 0.01 }); tone(1760, 1.0, { vol: 0.08, at: 0.18 }); },
  coin(n = 3) { for (let i = 0; i < Math.min(6, n); i++) { tone(2400 + Math.random() * 900, 0.12, { type: 'triangle', vol: 0.08, at: i * 0.07 }); tone(5200 + Math.random() * 800, 0.06, { vol: 0.03, at: i * 0.07 }); } },
  stamp() { noise(0.12, { vol: 0.5, freq: 180, type: 'lowpass' }); tone(90, 0.15, { vol: 0.25, glide: 0.6 }); },
  paper() { noise(0.25, { vol: 0.12, freq: 3500, q: 0.7 }); },
  flip() { noise(0.12, { vol: 0.1, freq: 2500, q: 0.8 }); tone(600, 0.08, { type: 'triangle', vol: 0.04 }); },
  weigh() { tone(420, 0.25, { type: 'triangle', vol: 0.08 }); tone(380, 0.3, { type: 'triangle', vol: 0.06, at: 0.2 }); },
  find() { tone(880, 0.25, { vol: 0.08 }); tone(1320, 0.4, { vol: 0.07, at: 0.08 }); },
  clue() { tone(660, 0.5, { vol: 0.1 }); tone(990, 0.6, { vol: 0.08, at: 0.12 }); tone(1320, 0.8, { vol: 0.07, at: 0.24 }); },
  no() { tone(220, 0.18, { type: 'triangle', vol: 0.08, glide: 0.8 }); },
  dig() { noise(0.25, { vol: 0.25, freq: 600, q: 0.6 }); },
  splash() { noise(0.6, { vol: 0.2, freq: 900, type: 'lowpass' }); },
  page() { noise(0.35, { vol: 0.1, freq: 4000, q: 0.5 }); },
  gull() { tone(1500, 0.25, { type: 'sawtooth', vol: 0.02, glide: 0.7 }); tone(1400, 0.3, { type: 'sawtooth', vol: 0.02, glide: 0.65, at: 0.3 }); },
  tick() { tone(1200, 0.03, { type: 'square', vol: 0.02 }); },
};
