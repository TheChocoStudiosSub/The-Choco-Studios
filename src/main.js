const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  nav?.classList.toggle("is-open", open);
});
nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
}));
document.querySelector("#year").textContent = new Date().getFullYear();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = document.querySelectorAll(
  ".hero-content, .hero-side, .hero-bottom, .section, .work-card, .portfolio-card, .principle-list article, .ecosystem-card, .contact-inner"
);
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  revealTargets.forEach((target, index) => {
    target.classList.add("motion-pending");
    target.style.setProperty("--motion-delay", `${Math.min(index % 5, 4) * 70}ms`);
  });
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -7% 0px" });
  revealTargets.forEach((target) => observer.observe(target));
}
