const TAU = Math.PI * 2;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const random = (min, max) => min + Math.random() * (max - min);

function makeStars(width, height) {
  const mobile = width < 680;
  const count = mobile ? 380 : Math.min(1400, Math.max(850, Math.round(width * height / 1200)));
  const stars = [];

  for (let index = 0; index < count; index += 1) {
    const depth = Math.random();
    const isWarm = Math.random() > .72;
    const leftSide = Math.random() < .38;
    stars.push({
      x: Math.random(),
      y: Math.random(),
      depth,
      radius: .22 + depth * random(.12, .82),
      alpha: random(.12, .43) * (.35 + depth * .65),
      phase: random(0, TAU),
      frequency: random(.22, .85),
      drift: random(.00008, .00042) * (depth + .2),
      warm: isWarm,
      emphasis: leftSide ? .42 : 1
    });
  }
  return stars;
}

function createSpaceBackground() {
  if (!document.body) return null;

  const canvas = document.createElement("canvas");
  canvas.className = "tcs-space-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d", { alpha:true, desynchronized:true });
  if (!context) return null;

  document.body.appendChild(canvas);

  let width = 1;
  let height = 1;
  let dpr = 1;
  let stars = [];
  let frameId = 0;
  let active = false;
  let disposed = false;
  let lastFrame = 0;
  let elapsed = 0;

  function resize() {
    if (disposed) return;
    width = Math.max(1, Math.round(window.innerWidth));
    height = Math.max(1, Math.round(window.innerHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(width, height);
    draw(performance.now(), true);
  }

  function drawNebula() {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = .86;

    const clouds = [
      { x:.73, y:.48, rx:.34, ry:.43, strength:.11 },
      { x:.86, y:.22, rx:.23, ry:.27, strength:.075 },
      { x:.59, y:.83, rx:.27, ry:.20, strength:.055 },
      { x:.96, y:.71, rx:.18, ry:.28, strength:.045 }
    ];

    for (const cloud of clouds) {
      const radius = Math.max(width * cloud.rx, height * cloud.ry);
      const gradient = context.createRadialGradient(
        width * cloud.x, height * cloud.y, radius * .025,
        width * cloud.x, height * cloud.y, radius
      );
      gradient.addColorStop(0, "rgba(190,146,78," + cloud.strength + ")");
      gradient.addColorStop(.28, "rgba(126,91,48," + (cloud.strength * .53) + ")");
      gradient.addColorStop(.62, "rgba(70,53,33," + (cloud.strength * .18) + ")");
      gradient.addColorStop(1, "rgba(36,29,20,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }

    const glow = context.createRadialGradient(
      width * .68, height * .51, 0,
      width * .68, height * .51, Math.max(width, height) * .52
    );
    glow.addColorStop(0, "rgba(200,158,91,.045)");
    glow.addColorStop(.5, "rgba(111,82,46,.025)");
    glow.addColorStop(1, "rgba(50,39,26,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function draw(now, staticFrame = false) {
    if (disposed) return;
    const delta = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (!staticFrame) elapsed += delta;

    context.clearRect(0, 0, width, height);
    drawNebula();

    context.save();
    context.globalCompositeOperation = "lighter";
    for (const star of stars) {
      const twinkle = staticFrame
        ? 1
        : .72 + .28 * Math.sin(elapsed * star.frequency + star.phase);
      star.x = (star.x + star.drift * delta) % 1;

      const x = star.x * width;
      const y = star.y * height;
      const alpha = star.alpha * twinkle * star.emphasis;
      const color = star.warm ? "239,218,177" : "228,225,215";

      context.beginPath();
      context.fillStyle = "rgba(" + color + "," + alpha + ")";
      context.arc(x, y, star.radius, 0, TAU);
      context.fill();

      if (star.depth > .94 && star.radius > .86) {
        context.beginPath();
        context.fillStyle = "rgba(" + color + "," + (alpha * .09) + ")";
        context.arc(x, y, star.radius * 3.8, 0, TAU);
        context.fill();
      }
    }
    context.restore();
  }

  function animate(now) {
    if (!active || disposed || document.hidden) {
      frameId = 0;
      return;
    }
    if (now - lastFrame >= 28) draw(now);
    frameId = requestAnimationFrame(animate);
  }

  function start() {
    if (disposed || !active || document.hidden) return;
    if (REDUCED_MOTION.matches) {
      draw(performance.now(), true);
      return;
    }
    if (!frameId) {
      lastFrame = performance.now();
      frameId = requestAnimationFrame(animate);
    }
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function setActive(value) {
    active = Boolean(value);
    if (active) start();
    else stop();
  }

  function handleVisibility() {
    if (document.hidden) stop();
    else if (active) start();
  }

  function handleMotionChange() {
    if (REDUCED_MOTION.matches) {
      stop();
      draw(performance.now(), true);
    } else if (active) {
      start();
    }
  }

  document.addEventListener("visibilitychange", handleVisibility);
  REDUCED_MOTION.addEventListener?.("change", handleMotionChange);
  window.addEventListener("resize", resize, { passive:true });

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", handleVisibility);
    REDUCED_MOTION.removeEventListener?.("change", handleMotionChange);
    window.removeEventListener("resize", resize);
    canvas.remove();
  }

  window.addEventListener("pagehide", dispose, { once:true });
  resize();
  return { setActive, dispose };
}

export { createSpaceBackground };
