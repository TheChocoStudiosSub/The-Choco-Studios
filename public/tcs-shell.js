(() => {
  const toggle = document.querySelector("#tcs-menu-toggle");
  const sidebar = document.querySelector("#tcs-sidebar");
  const backdrop = document.querySelector("#tcs-menu-backdrop");
  const mobile = window.matchMedia("(max-width: 850px)");
  if (!toggle || !sidebar || !backdrop) return;

  function setMenu(open, restoreFocus = false) {
    const visible = Boolean(open) && mobile.matches;
    document.body.classList.toggle("tcs-menu-open", visible);
    toggle.setAttribute("aria-expanded", String(visible));
    toggle.setAttribute("aria-label", visible ? "Tutup navigasi" : "Buka navigasi");
    backdrop.hidden = !visible;
    sidebar.toggleAttribute("inert", mobile.matches && !visible);
    if (mobile.matches) sidebar.setAttribute("aria-hidden", String(!visible));
    else sidebar.removeAttribute("aria-hidden");
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }

  setMenu(false);
  toggle.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  backdrop.addEventListener("click", () => setMenu(false, true));
  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("tcs-menu-open")) {
      setMenu(false, true);
    }
  });
  const onViewportChange = () => setMenu(false);
  if (typeof mobile.addEventListener === "function") mobile.addEventListener("change", onViewportChange);
  else mobile.addListener(onViewportChange);
})();
