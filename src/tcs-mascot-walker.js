import './tcs-mascot-walker.css';

const SVG_URL = '/tcs-mascot-reference.svg';
const NS = 'http://www.w3.org/2000/svg';
const ID = 'tcs-mascot-wanderer';

if (!document.getElementById(ID)) {
  const walker = document.createElement('div');
  walker.id = ID;
  walker.className = 'tcs-mascot-wanderer is-paused';
  walker.setAttribute('aria-hidden', 'true');
  walker.innerHTML = '<div class="tcs-mascot-wanderer__art"></div>';
  document.body.appendChild(walker);

  const artHost = walker.firstElementChild;
  let x = 12;
  let direction = 1;
  let pauseRemaining = 0.8;
  let previousTime = 0;
  let frameId = 0;
  let lastPauseAt = 0;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wrapNodes(parent, nodes, className) {
    if (!parent || !nodes.length) return null;
    const group = document.createElementNS(NS, 'g');
    group.classList.add(className);
    parent.insertBefore(group, nodes[0]);
    nodes.forEach(node => group.appendChild(node));
    return group;
  }

  function prepareArt(svg) {
    svg.classList.add('tcs-mascot-art');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    const legs = svg.querySelector('#legs');
    if (legs) {
      const nodes = [...legs.children];
      wrapNodes(legs, [nodes[1], nodes[3]].filter(Boolean), 'tcs-walk-leg-left');
      wrapNodes(legs, [nodes[2], nodes[4]].filter(Boolean), 'tcs-walk-leg-right');
      const details = legs.querySelector('g');
      if (details) {
        const lines = [...details.children];
        wrapNodes(details, lines.slice(0, 2), 'tcs-walk-leg-lines-left');
        wrapNodes(details, lines.slice(2, 4), 'tcs-walk-leg-lines-right');
      }
    }

    const sleeves = svg.querySelector('#sleeves');
    if (sleeves) {
      const arms = [...sleeves.children];
      wrapNodes(sleeves, arms.slice(0, 3), 'tcs-walk-arm-left');
      wrapNodes(sleeves, arms.slice(3, 6), 'tcs-walk-arm-right');
    }

    const hands = svg.querySelector('#hands');
    if (hands) {
      const parts = [...hands.children];
      wrapNodes(hands, [parts[0]].filter(Boolean), 'tcs-walk-hand-left');
      wrapNodes(hands, [parts[1]].filter(Boolean), 'tcs-walk-hand-right');
    }

    const headLayers = ['#ears', '#head-tufts', '#head', '#ear-tufts', '#face']
      .map(selector => svg.querySelector(selector)).filter(Boolean);
    if (headLayers.length) wrapNodes(svg, headLayers, 'tcs-walk-head');

    artHost.replaceChildren(svg);
  }

  function setPosition() {
    const width = walker.getBoundingClientRect().width || 118;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    x = Math.max(8, Math.min(x, maxX));
    walker.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) scaleX(' + direction + ')';
  }

  function stopFrame() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
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
      walker.classList.add('is-paused');
    } else {
      walker.classList.remove('is-paused');
      const width = walker.getBoundingClientRect().width || 118;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const speed = window.innerWidth < 600 ? 22 : 34;
      x += direction * speed * dt;

      if (x >= maxX) {
        x = maxX;
        direction = -1;
        pauseRemaining = 1.25;
      } else if (x <= 8) {
        x = 8;
        direction = 1;
        pauseRemaining = 1.25;
      } else if (timestamp - lastPauseAt > 26000) {
        lastPauseAt = timestamp;
        pauseRemaining = 1.6;
      }
    }
    setPosition();
  }

  async function loadMascot() {
    try {
      const response = await fetch(SVG_URL, { credentials: 'same-origin', cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const source = await response.text();
      const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('SVG referensi tidak valid');
      const svg = document.importNode(parsed.documentElement, true);
      prepareArt(svg);
      walker.classList.add('is-ready');
      setPosition();
      if (!reducedMotion && !document.hidden) frameId = requestAnimationFrame(tick);
    } catch (error) {
      walker.remove();
      console.warn('[TCS Mascot] Maskot tidak dapat dimuat:', error);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrame();
    else if (!reducedMotion && artHost.firstElementChild && !frameId) {
      previousTime = 0;
      frameId = requestAnimationFrame(tick);
    }
  });

  window.addEventListener('resize', setPosition, { passive: true });
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      stopFrame();
      walker.classList.add('is-paused');
      setPosition();
    } else if (!document.hidden && artHost.firstElementChild && !frameId) {
      previousTime = 0;
      frameId = requestAnimationFrame(tick);
    }
  });

  loadMascot();
}
