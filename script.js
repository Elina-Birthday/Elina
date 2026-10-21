'use strict';
/* ===== تنظیمات مرکزی ===== */
const CONFIG = {
  name: 'الینا',          // نام در همه‌جا
  holdMs: 2500,           // مدت نگه‌داشتن قلب (میلی‌ثانیه)
  musicVolume: 0.55,
  cards: ['دلخوری','ناراحتی','سوءتفاهم','حرف‌های نگفته','بی‌توجهی','لجبازی','فاصله','سکوت‌های طولانی','روزهای سخت']
};
const $ = (s, r = document) => r.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { scene: 1, held: false, selected: new Set(), busy: false };

document.querySelectorAll('[data-name]').forEach(n => n.textContent = CONFIG.name);

/* ===== صدا ===== */
const Music = (() => {
  const a = $('#bgm'), btn = $('#musicBtn'), tools = $('#tools'), mute = $('#muteBtn'), toast = $('#toast');
  let fade = 0, tt = 0, started = false;
  const say = m => { toast.textContent = m; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 4500); };
  const ui = on => { btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'توقف موسیقی' : 'پخش موسیقی'); mute.hidden = !on; };
  const ramp = (to, ms = 2500) => { cancelAnimationFrame(fade); const from = a.volume, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / ms); a.volume = from + (to - from) * k; if (k < 1) fade = requestAnimationFrame(step); }; fade = requestAnimationFrame(step); };
  async function play() {
    try { a.volume = 0; await a.play(); ui(true); ramp(a.muted ? 0 : CONFIG.musicVolume); }
    catch (e) { ui(false); say('موسیقی پخش نشد؛ فایل assets/a.mp4 را بررسی کن یا دکمه موسیقی را بزن.'); }
  }
  btn.addEventListener('click', () => { a.paused ? play() : (a.pause(), ui(false)); });
  mute.addEventListener('click', () => { a.muted = !a.muted; mute.setAttribute('aria-pressed', a.muted); mute.textContent = a.muted ? 'صدا را باز کن' : 'بی‌صدا'; if (!a.muted) a.volume = CONFIG.musicVolume; });
  a.addEventListener('error', () => { tools.hidden = false; ui(false); say('فایل موسیقی پیدا نشد (assets/a.mp4).'); });
  return { start() { if (!started) { started = true; tools.hidden = false; play(); } } };
})();

/* ===== گلبرگ‌های پس‌زمینه ===== */
if (!reduced) {
  const box = $('#petals');
  for (let i = 0; i < 16; i++) { const p = document.createElement('span'); p.className = 'petal';
    p.style.cssText = `--l:${Math.random() * 100}%;--d:${16 + Math.random() * 14}s;--s:${.7 + Math.random() * .9};--o:${.35 + Math.random() * .4};animation-delay:${-Math.random() * 30}s`; box.appendChild(p); }
}

/* ===== مدیریت صحنه‌ها ===== */
const dots = $('#dots'), backBtn = $('#back');
for (let i = 1; i <= 4; i++) dots.appendChild(document.createElement('li'));
function goTo(n) {
  const prev = $('.scene.active');
  const next = $('#s' + n);
  if (prev) prev.classList.remove('active');
  next.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { next.classList.add('active'); next.scrollTop = 0; }));
  setTimeout(() => { if (prev && prev !== next && !prev.classList.contains('active')) prev.hidden = true; }, 1000);
  state.scene = n; state.busy = false;
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i + 1 === n));
  backBtn.hidden = !(n === 2 || n === 3);
  if (n === 2) Heart.enter(); else Heart.leave();
  if (n === 4) Party.start();
}
backBtn.addEventListener('click', () => { if (!state.busy && state.scene > 1) goTo(state.scene - 1); });

/* ===== صحنه ۱ ===== */
$('[data-open]').addEventListener('click', async () => {
  if (state.busy) return; state.busy = true;
  Music.start();
  $('#env').classList.add('open');
  await wait(reduced ? 100 : 1500);
  goTo(2);
});

/* ===== صحنه ۲: قلب ===== */
const Heart = (() => {
  const btn = $('#heartBtn'), ring = $('#ring'), bar = $('#bar');
  let p = 0, down = false, raf = 0, last = 0;
  const paint = () => { btn.style.setProperty('--p', p); bar.style.setProperty('--bp', p); };
  function tick(t) {
    const dt = Math.min(50, t - last); last = t;
    p = down ? Math.min(1, p + dt / CONFIG.holdMs) : Math.max(0, p - dt / (CONFIG.holdMs * 0.6));
    paint();
    if (p >= 1 && !state.held) return complete();
    raf = (down || p > 0) ? requestAnimationFrame(tick) : 0;
  }
  const kick = () => { if (!raf && !state.held) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const press = () => { if (state.held) return; down = true; kick(); };
  const release = () => { down = false; kick(); };
  function complete() {
    state.held = true; down = false; raf = 0; p = 1; paint();
    btn.classList.add('full'); btn.disabled = true;
    $('#next2').hidden = false;
    if (navigator.vibrate) navigator.vibrate(30);
  }
  btn.addEventListener('pointerdown', e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch {} press(); });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(ev => btn.addEventListener(ev, release));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
  btn.addEventListener('blur', release);
  $('#next2').addEventListener('click', () => { if (!state.busy) { state.busy = true; goTo(3); } });
  return { enter() {}, leave() { down = false; } };
})();

/* ===== جشن صحنه آخر ===== */
const Party = (() => {
  const colors = ['#713B4B', '#C58D99', '#E9B5BF', '#B89A69', '#F2D9A8', '#9b4a60'];
  function wave(n) {
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) { const c = document.createElement('i');
      c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};--x:${(Math.random() - .5) * 30}vw;--r:${(Math.random() - .5) * 1080}deg;animation-duration:${3.6 + Math.random() * 3}s;animation-delay:${Math.random() * 1.2}s;width:${6 + Math.random() * 6}px;height:${9 + Math.random() * 9}px;border-radius:${i % 3 ? '1px' : '50%'}`; box.appendChild(c); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 9000);
  }
  return { start() { if (reduced) return; setTimeout(() => wave(60), 700); setTimeout(() => wave(34), 6500); } };
})();

/* ===== صحنه ۳: پاکت‌ها روی کادو ===== */
(() => {
  const table = $('#table'), note = $('#cardNote'), sweep = $('#sweep'), gift = $('#gift'), next = $('#tuckNext');
  const fa = n => n.toLocaleString('fa-IR');
  const cards = []; let gone = 0, z = 2;
  const draw = c => { c.el.style.transform = `translate(-50%,-50%) translate(${c.x}px,${c.y}px) rotate(${c.rot}deg)`; };
  const count = () => { note.textContent = `${fa(gone)} از ${fa(cards.length)} کنار رفت`; sweep.disabled = gone === 0; };
  function dismiss(c, dx, dy) {
    if (c.gone) return; c.gone = true; gone++;
    const len = Math.hypot(dx, dy) || 1, far = Math.max(innerWidth, innerHeight) * 1.1;
    c.x += dx / len * far; c.y += dy / len * far; c.rot += dx > 0 ? 40 : -40;
    c.el.classList.add('fly'); c.el.style.pointerEvents = 'none'; c.el.tabIndex = -1; draw(c);
    setTimeout(() => c.el.remove(), 900);
    count(); if (gone === cards.length) finish();
  }
  async function finish() {
    sweep.hidden = true; note.hidden = true;
    await wait(reduced ? 100 : 900); gift.classList.add('ready');
    await wait(reduced ? 100 : 700); next.hidden = false; gift.disabled = false;
  }
  CONFIG.cards.forEach((label, i) => {
    const el = document.createElement('div');
    el.className = 'pcard'; el.tabIndex = 0; el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label + ' - برای کنار زدن Enter بزن');
    const s = document.createElement('small'); s.textContent = fa(i + 1).padStart(2, '۰');
    const t = document.createElement('span'); t.textContent = label;
    el.append(s, t);
    const ang = i * 2.4, r = Math.sqrt((i + .5) / CONFIG.cards.length);
    const c = { el, x: 0, y: 0, rot: ((i * 37) % 23) - 11, gone: false };
    el.style.left = (50 + Math.cos(ang) * r * 30) + '%';
    el.style.top = (50 + Math.sin(ang) * r * 30) + '%';
    el.style.zIndex = z++;
    let sx = 0, sy = 0, t0 = 0, drag = false, px = 0, py = 0;
    el.addEventListener('pointerdown', e => { drag = true; sx = px = e.clientX; sy = py = e.clientY; t0 = performance.now(); el.style.zIndex = ++z; el.classList.add('lift'); el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!drag) return; c.x += e.clientX - px; c.y += e.clientY - py; px = e.clientX; py = e.clientY; draw(c); });
    const end = e => { if (!drag) return; drag = false; el.classList.remove('lift');
      const dx = e.clientX - sx, dy = e.clientY - sy, d = Math.hypot(dx, dy), v = d / Math.max(1, performance.now() - t0);
      if (d > 100 || (d > 40 && v > 0.6)) dismiss(c, dx, dy); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', () => { drag = false; el.classList.remove('lift'); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Delete') { e.preventDefault(); dismiss(c, i % 2 ? 1 : -1, -.6); } });
    cards.push(c); table.appendChild(el); draw(c);
  });
  sweep.addEventListener('click', () => {
    sweep.disabled = true;
    cards.filter(c => !c.gone).forEach((c, k) => setTimeout(() => dismiss(c, Math.cos(k * 1.7), Math.sin(k * 1.7) - .4), k * 90));
  });

  /* باز شدن کادو */
  const sp = $('#sparks');
  for (let i = 0; i < 18; i++) { const s = document.createElement('span'), a = (i / 18) * Math.PI * 2, r = 80 + (i % 3) * 30;
    s.style.cssText = `--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r - 40}px;animation-delay:${.9 + (i % 6) * .12}s`; sp.appendChild(s); }
  gift.addEventListener('click', async () => {
    if (state.busy || gift.disabled) return; state.busy = true;
    gift.disabled = true; next.hidden = true; gift.classList.remove('ready'); gift.classList.add('shake');
    await wait(reduced ? 100 : 900);
    gift.classList.remove('shake'); gift.classList.add('open');
    await wait(reduced ? 200 : 2800);
    $('#flash').classList.add('on');
    await wait(reduced ? 200 : 1000);
    goTo(4);
    await wait(300); $('#flash').classList.remove('on');
  });

  /* بازگشت به اول */
  $('#restart').addEventListener('click', () => {
    if (state.busy) return; state.busy = true;
    $('#env').classList.remove('open'); gift.classList.remove('open');
    if (gone === cards.length) { gift.disabled = false; next.hidden = false; gift.classList.add('ready'); }
    goTo(1);
  });
})();

goTo(1);
