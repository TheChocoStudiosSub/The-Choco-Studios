(() => {
  'use strict';

  const ID = 'tcs-mascot-wanderer';
  // Dinonaktifkan sementara. Set true untuk mengaktifkan kembali tanpa menghapus aset/kode.
  const ENABLED = false;
  if (!ENABLED) return;
  const ASSETS = {
    1: '/jalan-kanan-normal.svg',
    '-1': '/jalan-kiri-normal.svg'
  };
  const NS = 'http://www.w3.org/2000/svg';

  if (document.getElementById(ID)) return;

  const walker = document.createElement('div');
  walker.id = ID;
  walker.className = 'tcs-mascot-wanderer is-paused';
  walker.setAttribute('aria-hidden', 'true');
  walker.innerHTML = '<div class="tcs-mascot-wanderer__art"></div>';
  document.body.appendChild(walker);

  const artHost = walker.firstElementChild;
  const poseCache = new Map();
  let activeSvg = null;
  let x = 12;
  let direction = 1;
  let pauseRemaining = 0.8;
  let previousTime = 0;
  let frameId = 0;
  let lastPauseAt = 0;
  let paused = true;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function fetchPose(dir) {
    if (poseCache.has(dir)) return poseCache.get(dir);
    const response = await fetch(ASSETS[dir], { credentials: 'same-origin', cache: 'force-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' saat memuat pose ' + (dir > 0 ? 'kanan' : 'kiri'));
    const source = await response.text();
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('SVG pose tidak valid: ' + ASSETS[dir]);
    const template = parsed.documentElement;
    if (template.localName !== 'svg' || !template.getAttribute('viewBox')) {
      throw new Error('Aset pose tidak memiliki elemen SVG/viewBox yang valid: ' + ASSETS[dir]);
    }
    poseCache.set(dir, template);
    return template;
  }

  async function installPose(dir) {
    const template = await fetchPose(dir);
    const svg = document.importNode(template, true);
    svg.classList.add('tcs-mascot-art');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    artHost.replaceChildren(svg);
    activeSvg = svg;
    if (paused || reducedMotion || document.hidden) activeSvg.pauseAnimations?.();
    else activeSvg.unpauseAnimations?.();
  }

  function setPaused(value) {
    if (paused === value) return;
    paused = value;
    walker.classList.toggle('is-paused', value);
    if (!activeSvg) return;
    if (value) activeSvg.pauseAnimations?.();
    else activeSvg.unpauseAnimations?.();
  }

  function setPosition() {
    const width = walker.getBoundingClientRect().width || 118;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    x = Math.max(8, Math.min(x, maxX));
    // Aset kanan/kiri sudah memiliki siluet dan orientasi masing-masing.
    // Jangan scaleX: itu justru membalik pose yang sudah digambar.
    walker.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
  }

  function stopFrame() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
    setPaused(true);
  }

  function tick(timestamp) {
    if (document.hidden || reducedMotion) {
      stopFrame();
      return;
    }
    frameId = requestAnimationFrame(tick);
    const dt = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.04) : 0;
    previousTime = timestamp;

    if (pauseRemaining > 0) {
      pauseRemaining -= dt;
      setPaused(true);
    } else {
      setPaused(false);
      const width = walker.getBoundingClientRect().width || 118;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const speed = window.innerWidth < 600 ? 22 : 34;
      x += direction * speed * dt;

      if (x >= maxX) {
        x = maxX;
        direction = -1;
        pauseRemaining = 1.25;
        void installPose(direction).catch(fail);
        setPaused(true);
      } else if (x <= 8) {
        x = 8;
        direction = 1;
        pauseRemaining = 1.25;
        void installPose(direction).catch(fail);
        setPaused(true);
      } else if (timestamp - lastPauseAt > 26000) {
        lastPauseAt = timestamp;
        pauseRemaining = 1.6;
        setPaused(true);
      }
    }
    setPosition();
  }

  function fail(error) {
    console.error('[TCS Mascot] Gagal memuat pose resmi:', error);
    stopFrame();
    walker.remove();
  }

  async function start() {
    try {
      // Kedua pose resmi dimuat sebelum animasi dimulai agar pergantian arah instan.
      await Promise.all([fetchPose(1), fetchPose(-1)]);
      await installPose(direction);
      walker.classList.add('is-ready');
      setPosition();
      if (!reducedMotion && !document.hidden) {
        frameId = requestAnimationFrame(tick);
      } else {
        setPaused(true);
      }
    } catch (error) {
      fail(error);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrame();
    else if (!reducedMotion && activeSvg && !frameId) {
      previousTime = 0;
      setPaused(pauseRemaining > 0);
      frameId = requestAnimationFrame(tick);
    }
  });

  window.addEventListener('resize', setPosition, { passive: true });
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      stopFrame();
      setPosition();
    } else if (!document.hidden && activeSvg && !frameId) {
      previousTime = 0;
      setPaused(pauseRemaining > 0);
      frameId = requestAnimationFrame(tick);
    }
  });

  void start();
})();
