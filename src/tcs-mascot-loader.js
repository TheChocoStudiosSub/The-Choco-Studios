/*
 * TCS Mascot Loader
 * ------------------------------------------------------------
 * Layar loading pakai maskot TCS buat perpindahan layar dan koneksi buruk.
 * - Tanpa dependensi, tanpa gambar eksternal. Maskot digambar pakai SVG inline,
 *   jadi tetap muncul instan walau koneksi jelek (tidak perlu load file .glb).
 * - CSS disuntik otomatis, ChatGPT tinggal import file ini.
 * - Animasi cuma pakai transform/opacity, ringan buat perangkat lemah.
 *
 * Pemakaian:
 *   import { TCSLoader } from './tcs-mascot-loader.js';
 *
 *   TCSLoader.watchNetwork();                    // sekali saja, di awal (deteksi offline/online)
 *   TCSLoader.show({ direction: 'right' });      // maskot masuk dari sisi kanan
 *   await TCSLoader.hide({ exit: 'left' });      // maskot keluar lewat sisi kiri
 *   await TCSLoader.during(fetch(url), { direction: 'left', exit: 'right' });
 *
 * Opsi show():
 *   direction : 'left' | 'right' | null   sisi tempat maskot masuk (null = fade biasa)
 *   delay     : ms, default 0              kalau diisi, loading baru tampil kalau proses masih jalan
 *                                          setelah waktu ini
 *   (loading tampil minimal 2200 ms biar maskotnya sempat keliatan, ubah lewat TCSLoader.config.minVisible)
 *   onRetry   : fungsi                     dipanggil saat tombol "Coba lagi" ditekan
 *                                          (default: location.reload())
 * Opsi hide():
 *   exit      : 'left' | 'right' | null   sisi tempat maskot keluar (null = fade biasa)
 */

const STYLE_ID = 'tcs-ml-style';
// Bisa diubah dari luar: TCSLoader.config.minVisible = 3000;
const config = { minVisible: 2200, delay: 0 }; // ms

const CSS = `
.tcs-ml-lock{overflow:hidden!important}
.tcs-ml{position:fixed;inset:0;height:100vh;height:100dvh;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;text-align:center;color:#eaeaff;font-family:inherit;background:radial-gradient(120% 90% at 50% 30%,#141a3a 0%,#0b0f17 70%);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility 0s linear .35s;overflow:hidden}
.tcs-ml.is-on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .25s ease}
.tcs-ml-stage{width:min(240px,58vw);aspect-ratio:220/240;position:relative}
.tcs-ml-walker{width:100%;height:100%;will-change:transform}
.tcs-ml.in-left .tcs-ml-walker{animation:tcs-ml-in-left 1s cubic-bezier(.2,.8,.3,1),tcs-ml-pace 7s ease-in-out 1s infinite;transform:scaleX(1)}
.tcs-ml.in-right .tcs-ml-walker{animation:tcs-ml-in-right 1s cubic-bezier(.2,.8,.3,1),tcs-ml-pace 7s ease-in-out 1s infinite;transform:scaleX(-1)}
.tcs-ml.in-none .tcs-ml-walker{animation:tcs-ml-pace 7s ease-in-out infinite;transform:scaleX(1)}
.tcs-ml-svg{width:100%;height:100%;overflow:visible;display:block}
.tcs-ml-walker{transform-origin:50% 50%}
.tcs-ml.in-right .tcs-ml-svg{transform:scaleX(-1)}
.tcs-ml.in-left .tcs-ml-svg{transform:scaleX(1)}
.tcs-ml.in-none .tcs-ml-svg{transform:scaleX(1)}
.tcs-ml-svg{animation:tcs-ml-bob .31s ease-in-out infinite alternate}
@keyframes tcs-ml-bob{from{translate:0 0}to{translate:0 3px}}
.tcs-ml-q{transform-origin:204px 40px;animation:tcs-ml-q 1.6s ease-in-out infinite}
.tcs-ml-shadow{fill:rgba(0,0,0,.35)}
.tcs-ml-title{margin:0;font-size:clamp(17px,4.6vw,22px);font-weight:700;letter-spacing:.01em}
.tcs-ml-sub{margin:0;max-width:min(360px,86vw);font-size:clamp(13px,3.6vw,15px);line-height:1.5;color:#b9b8e6}
.tcs-ml-bar{width:min(180px,50vw);height:4px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:4px}
.tcs-ml-bar i{display:block;width:40%;height:100%;border-radius:99px;background:linear-gradient(90deg,#2b8cff,#7c5cff);animation:tcs-ml-bar 1.3s ease-in-out infinite}
.tcs-ml-retry{display:none;margin-top:6px;padding:10px 22px;border:0;border-radius:99px;background:linear-gradient(90deg,#2b8cff,#7c5cff);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.tcs-ml.is-stuck .tcs-ml-retry{display:inline-block}
.tcs-ml.is-offline .tcs-ml-bar i{animation-play-state:paused;opacity:.4}

@keyframes tcs-ml-pace{
 0%{transform:translateX(0)}
 25%{transform:translateX(56px)}
 40%{transform:translateX(56px)}
 65%{transform:translateX(-56px)}
 80%{transform:translateX(-56px)}
 100%{transform:translateX(0)}
}
@keyframes tcs-ml-in-left{from{transform:translateX(-120vw)}to{transform:translateX(0)}}
@keyframes tcs-ml-in-right{from{transform:translateX(120vw)}to{transform:translateX(0)}}
@keyframes tcs-ml-look{
 0%,100%{transform:translateX(0)}
 25%,40%{transform:translateX(4px)}
 65%,80%{transform:translateX(-4px)}
}
@keyframes tcs-ml-tilt{
 0%,100%{transform:rotate(0)}
 40%{transform:rotate(-7deg)}
 80%{transform:rotate(7deg)}
}
@keyframes tcs-ml-waddle{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
@keyframes tcs-ml-breath{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.025)}}
@keyframes tcs-ml-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes tcs-ml-wag{from{transform:rotate(-7deg)}to{transform:rotate(9deg)}}
@keyframes tcs-ml-step{from{transform:translateY(0)}to{transform:translateY(-5px)}}
@keyframes tcs-ml-q{0%,100%{transform:translateY(0) scale(1);opacity:.85}50%{transform:translateY(-6px) scale(1.12);opacity:1}}
@keyframes tcs-ml-bar{0%{transform:translateX(-110%)}100%{transform:translateX(280%)}}

@media (prefers-reduced-motion:reduce){
 .tcs-ml-walker,.tcs-ml-body,.tcs-ml-head,.tcs-ml-look,.tcs-ml-tail,.tcs-ml-leg-l,.tcs-ml-leg-r,.tcs-ml-q{animation:none!important}
 .tcs-ml-bar i{animation-duration:2.6s}
}
`;

const MASCOT_SVG = '<img class="tcs-ml-svg tcs-ml-reference" src="/tcs-mascot-reference.svg" alt="">';

const MSG = {
  loading: ['Memuat halaman…', 'Mohon tunggu sebentar.'],
  slow: ['Koneksi sedang lambat…', 'Maskot masih berusaha, mohon tunggu ya.'],
  stuck: ['Masih mencoba tersambung…', 'Periksa koneksi internet kamu, lalu coba lagi.'],
  offline: ['Kamu sedang offline', 'Nyalakan internet, halaman akan lanjut otomatis.'],
  back: ['Sudah tersambung lagi!', 'Melanjutkan…'],
};

let root = null;
let els = null;
let visible = false;
let shownAt = 0;
let showTimer = null;
let stateTimers = [];
let hideToken = 0;
let networkShown = false;
let currentRetry = null;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function ensure() {
  if (root) return;
  injectStyle();
  root = document.createElement('div');
  root.className = 'tcs-ml';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML =
    '<div class="tcs-ml-stage"><div class="tcs-ml-walker">' + MASCOT_SVG + '</div></div>' +
    '<p class="tcs-ml-title"></p>' +
    '<p class="tcs-ml-sub"></p>' +
    '<div class="tcs-ml-bar"><i></i></div>' +
    '<button type="button" class="tcs-ml-retry">Coba lagi</button>';
  document.body.appendChild(root);
  els = {
    walker: root.querySelector('.tcs-ml-walker'),
    title: root.querySelector('.tcs-ml-title'),
    sub: root.querySelector('.tcs-ml-sub'),
    retry: root.querySelector('.tcs-ml-retry'),
  };
  els.retry.addEventListener('click', () => {
    if (typeof currentRetry === 'function') currentRetry();
    else location.reload();
  });
}

function setState(name) {
  if (!root) return;
  const m = MSG[name] || MSG.loading;
  els.title.textContent = m[0];
  els.sub.textContent = m[1];
  root.classList.toggle('is-stuck', name === 'stuck');
  root.classList.toggle('is-offline', name === 'offline');
}

function clearStateTimers() {
  stateTimers.forEach(clearTimeout);
  stateTimers = [];
}

function isSlowConnection() {
  const c = navigator.connection;
  if (!c) return false;
  return c.saveData === true || ['slow-2g', '2g'].includes(c.effectiveType);
}

function display(opts) {
  ensure();
  hideToken++;
  currentRetry = opts.onRetry || null;

  // reset sisa animasi keluar dari hide() sebelumnya
  els.walker.style.animation = '';
  els.walker.style.transition = '';
  els.walker.style.transform = '';

  const dir = opts.direction === 'left' || opts.direction === 'right' ? opts.direction : 'none';
  root.classList.remove('in-left', 'in-right', 'in-none');
  void root.offsetWidth;
  root.classList.add('in-' + dir);

  document.documentElement.classList.add('tcs-ml-lock');
  root.classList.add('is-on');
  visible = true;
  shownAt = performance.now();

  clearStateTimers();
  if (!navigator.onLine) {
    setState('offline');
  } else {
    setState(isSlowConnection() ? 'slow' : 'loading');
    stateTimers.push(setTimeout(() => navigator.onLine && setState('slow'), 3000));
    stateTimers.push(setTimeout(() => navigator.onLine && setState('stuck'), 8000));
  }
}

function show(opts = {}) {
  const delay = typeof opts.delay === 'number' ? opts.delay : config.delay;
  if (visible || showTimer) return;
  if (delay <= 0) {
    display(opts);
    return;
  }
  showTimer = setTimeout(() => {
    showTimer = null;
    display(opts);
  }, delay);
}

function hide(opts = {}) {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (!visible) return Promise.resolve();

  const token = ++hideToken;
  const wait = Math.max(0, config.minVisible - (performance.now() - shownAt));

  return new Promise((resolve) => {
    setTimeout(() => {
      if (token !== hideToken) return resolve(); // ada show() baru, batalkan
      clearStateTimers();
      const exit = opts.exit === 'left' || opts.exit === 'right' ? opts.exit : null;
      let finishDelay = 450;

      if (exit) {
        // maskot jalan keluar lewat sisi arah geser
        const current = getComputedStyle(els.walker).transform;
        els.walker.style.animation = 'none';
        els.walker.style.transform = current === 'none' ? '' : current;
        void els.walker.offsetWidth;
        els.walker.style.transition = 'transform .9s cubic-bezier(.5,0,.9,.5)';
        els.walker.style.transform = 'translateX(' + (exit === 'left' ? '-' : '') + '120vw)';
        finishDelay = 880;
      }

      setTimeout(() => {
        if (token !== hideToken) return resolve();
        root.classList.remove('is-on', 'is-stuck', 'is-offline');
        document.documentElement.classList.remove('tcs-ml-lock');
        visible = false;
        networkShown = false;
        resolve();
      }, finishDelay);
    }, wait);
  });
}

async function during(promise, opts = {}) {
  show(opts);
  try {
    return await promise;
  } finally {
    await hide({ exit: opts.exit });
  }
}

let watching = false;
function watchNetwork() {
  if (watching) return;
  watching = true;
  window.addEventListener('offline', () => {
    if (!visible) {
      networkShown = true;
      display({ direction: null });
    }
    setState('offline');
  });
  window.addEventListener('online', () => {
    if (!visible) return;
    setState('back');
    if (networkShown) setTimeout(() => hide(), 900);
  });
}

export const TCSLoader = { show, hide, during, watchNetwork, config };
export default TCSLoader;