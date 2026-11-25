const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 850px)");
const menuToggle = document.querySelector("#tcs-menu-toggle");
const menuBackdrop = document.querySelector("#tcs-menu-backdrop");
const sidebar = document.querySelector("#tcs-sidebar");
const hero = document.querySelector("#home > [data-panel='home']");
const loader = document.querySelector("#luxury-loader");

document.documentElement.classList.toggle("motion-enabled", !reducedMotion);

const currentYear = new Date().getFullYear();
document.querySelectorAll("#year, #footer-year").forEach((node) => {
  node.textContent = String(currentYear);
});

/* Keep the existing black-and-gold entrance as a distinct brand moment. */
const loaderStarted = performance.now();
function dismissLoader() {
  if (!loader || loader.classList.contains("is-dismissed")) return;
  const minimum = reducedMotion ? 160 : (mobileQuery.matches ? 250 : 1050);
  window.setTimeout(() => {
    loader.classList.add("is-dismissed");
    loader.setAttribute("aria-hidden", "true");
    window.setTimeout(() => loader.remove(), 950);
  }, Math.max(0, minimum - (performance.now() - loaderStarted)));
}
if (document.readyState === "complete") dismissLoader();
else window.addEventListener("load", dismissLoader, { once: true });
window.setTimeout(dismissLoader, 3200);

function setMobileMenu(open) {
  if (!menuToggle || !sidebar || !menuBackdrop) return;
  const visible = Boolean(open) && mobileQuery.matches;
  document.body.classList.toggle("tcs-menu-open", visible);
  menuToggle.setAttribute("aria-expanded", String(visible));
  menuToggle.setAttribute("aria-label", visible ? "Tutup menu" : "Buka menu");
  menuToggle.innerHTML = visible
    ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  menuBackdrop.hidden = !visible;
}
menuToggle?.addEventListener("click", () => {
  setMobileMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});
menuBackdrop?.addEventListener("click", () => setMobileMenu(false));
sidebar?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMobileMenu(false));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenu(false);
});
window.addEventListener("resize", () => {
  if (!mobileQuery.matches) setMobileMenu(false);
}, { passive: true });

/* Thin reading-progress line, updated from the document scroll position. */
const progress = document.createElement("div");
progress.className = "tcs-scroll-progress";
progress.setAttribute("aria-hidden", "true");
progress.innerHTML = "<span></span>";
document.body.appendChild(progress);
const progressFill = progress.firstElementChild;
let scrollFrame = 0;

function updateScrollEffects() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
  progressFill.style.width = (ratio * 100).toFixed(2) + "%";

  if (!reducedMotion && !mobileQuery.matches && hero) {
    const offset = Math.min(86, Math.max(-36, window.scrollY * 0.12));
    hero.querySelector(".hero-guilloche")?.style.setProperty("--hero-parallax", offset.toFixed(1) + "px");
  }
  scrollFrame = 0;
}
function requestScrollUpdate() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollEffects);
}
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate, { passive: true });
updateScrollEffects();

/* Reveal content as it enters the viewport without hiding it when JS is unavailable. */
const revealTargets = [
  ...document.querySelectorAll(
    "#home .statement-heading, #home .statement-detail, #home .founder-editorial, " +
    "#home .work-heading, #home .work-index-row, #home .principles-editorial, " +
    "#home .footer-editorial h2, #home .footer-links a"
  )
];
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  revealTargets.forEach((element, index) => {
    element.classList.add("scroll-reveal");
    element.style.setProperty("--reveal-order", String(index % 6));
    revealObserver.observe(element);
  });
}

/* Animate the hero only after the entrance screen has started to leave. */
if (hero) {
  window.requestAnimationFrame(() => {
    document.documentElement.classList.add("motion-ready");
    hero.classList.add("motion-armed");
    window.setTimeout(() => hero.classList.add("is-entered"), reducedMotion ? 0 : 80);
  });
}

/* Keep the sidebar location indicator in sync with the section at the reading line. */
const navLinks = [...document.querySelectorAll("[data-panel-link]")];
const sectionMap = new Map();
navLinks.forEach((link) => {
  const id = link.dataset.panelLink;
  const section = id === "home"
    ? document.querySelector("#home > [data-panel='home']")
    : document.querySelector("#home > [data-panel='" + CSS.escape(id) + "']");
  if (section) sectionMap.set(section, id);
});
function setCurrentSection(id) {
  navLinks.forEach((link) => {
    const active = link.dataset.panelLink === id;
    link.classList.toggle("is-current", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
if ("IntersectionObserver" in window && sectionMap.size) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => {
        const aDistance = Math.abs(a.boundingClientRect.top - window.innerHeight * 0.34);
        const bDistance = Math.abs(b.boundingClientRect.top - window.innerHeight * 0.34);
        return aDistance - bDistance;
      });
    if (visible[0]) setCurrentSection(sectionMap.get(visible[0].target));
  }, { root: null, rootMargin: "-22% 0px -58% 0px", threshold: 0 });
  sectionMap.forEach((id, section) => sectionObserver.observe(section));
}
setCurrentSection("home");

/* A pinned, image-led work index: project rows update the adjacent preview. */
const workRows = [...document.querySelectorAll("#work .work-index-row[data-preview]")];
const workPreview = document.querySelector("#work .work-preview");
const previewImage = workPreview?.querySelector("img");

function selectWorkPreview(row) {
  if (!row || !previewImage || !workPreview) return;
  const source = row.dataset.preview;
  if (!source) return;
  workRows.forEach((item) => item.classList.toggle("is-preview-active", item === row));
  if (previewImage.getAttribute("src") === source) return;
  workPreview.classList.add("is-changing");
  const image = new Image();
  image.onload = () => {
    previewImage.src = source;
    previewImage.alt = row.dataset.previewAlt || "";
    workPreview.classList.remove("is-changing");
  };
  image.onerror = () => {
    previewImage.src = source;
    previewImage.alt = row.dataset.previewAlt || "";
    workPreview.classList.remove("is-changing");
  };
  image.src = source;
}
workRows.forEach((row) => {
  row.addEventListener("pointerenter", () => selectWorkPreview(row));
  row.addEventListener("focus", () => selectWorkPreview(row));
});
if (workRows.length) selectWorkPreview(workRows[0]);
if (!reducedMotion && "IntersectionObserver" in window && workRows.length) {
  const workFocusObserver = new IntersectionObserver((entries) => {
    const focused = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => {
        const aCenter = Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2);
        const bCenter = Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2);
        return aCenter - bCenter;
      });
    if (focused[0]) selectWorkPreview(focused[0].target);
  }, { root: null, rootMargin: "-36% 0px -44% 0px", threshold: 0 });
  workRows.forEach((row) => workFocusObserver.observe(row));
}

/* Same-page navigation must scroll the document, not a legacy inner panel. */
function getHashTarget(hash) {
  if (!hash || hash === "#") return null;
  let id = hash.slice(1);
  try { id = decodeURIComponent(id); } catch { return null; }
  return document.getElementById(id);
}

function scrollToHashTarget(hash, behavior = "auto") {
  const target = getHashTarget(hash);
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : behavior,
      block: "start"
    });
    if (target.dataset.panel) setCurrentSection(target.dataset.panel);
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin ||
        destination.pathname !== window.location.pathname ||
        !destination.hash) return;
    const target = getHashTarget(destination.hash);
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== destination.hash) {
      window.history.pushState({ tcsAnchor: true }, "", destination.hash);
    }
    scrollToHashTarget(destination.hash, "smooth");
    if (mobileQuery.matches) setMobileMenu(false);
  });
});

window.addEventListener("hashchange", () => {
  scrollToHashTarget(window.location.hash, "smooth");
});
window.addEventListener("popstate", () => {
  scrollToHashTarget(window.location.hash, "auto");
});
function restoreInitialHashPosition() {
  if (window.location.hash) scrollToHashTarget(window.location.hash, "auto");
}
if (document.readyState === "complete") {
  window.setTimeout(restoreInitialHashPosition, 80);
} else {
  window.addEventListener("load", () => window.setTimeout(restoreInitialHashPosition, 80), { once: true });
}
