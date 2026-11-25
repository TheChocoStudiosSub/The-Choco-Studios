const root = document.querySelector("#home");

if (root) {
  const panels = [...root.querySelectorAll(":scope > [data-panel]")];
  const navLinks = [...document.querySelectorAll("[data-panel-link]")];
  const panelMap = new Map(panels.map((panel) => [panel.dataset.panel, panel]));

  panels.forEach((panel) => {
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
  });

  function parsePanelId(value) {
    if (!value) return "home";
    try {
      return decodeURIComponent(value.replace(/^#/, ""));
    } catch {
      return "home";
    }
  }

  function updateNavigation(id) {
    navLinks.forEach((link) => {
      const active = link.dataset.panelLink === id;
      link.classList.toggle("is-current", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function activatePanel(id, options = {}) {
    const selected = panelMap.get(id);
    if (!selected) return false;

    panels.forEach((panel) => {
      const active = panel === selected;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", String(!active));
      panel.toggleAttribute("inert", !active);
    });

    updateNavigation(id);

    if (options.resetScroll !== false) selected.scrollTop = 0;

    if (options.history === "push" && location.hash !== "#" + id) {
      history.pushState({ tcsPanel: id }, "", "#" + id);
    } else if (options.history === "replace" && location.hash !== "#" + id) {
      history.replaceState({ tcsPanel: id }, "", "#" + id);
    }

    if (options.focus) selected.focus({ preventScroll: true });
    return true;
  }

  // The same panel router serves the sidebar and calls to action inside each page.
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const panelId = parsePanelId(link.getAttribute("href"));
    if (!panelMap.has(panelId)) return;

    event.preventDefault();
    activatePanel(panelId, { history: "push", focus: true });
  });

  window.addEventListener("popstate", () => {
    const requested = parsePanelId(location.hash);
    activatePanel(panelMap.has(requested) ? requested : "home", {
      history: "none",
      focus: false
    });
  });

  // Deep links such as /#work open the requested panel on first load.
  const requested = parsePanelId(location.hash);
  const initial = panelMap.has(requested)
    ? requested
    : (panels.find((panel) => panel.classList.contains("is-active"))?.dataset.panel || "home");

  activatePanel(initial, { history: "none", focus: false });

  const year = String(new Date().getFullYear());
  document.querySelectorAll("#year, #footer-year").forEach((node) => {
    node.textContent = year;
  });

  // The preview is decorative; project links remain usable without it.
  const workRows = [...document.querySelectorAll("#work .work-index-row[data-preview]")];
  const preview = document.querySelector("#work .work-preview img");

  function updateWorkPreview(row) {
    if (!row || !preview) return;
    const source = row.dataset.preview;
    if (!source || preview.getAttribute("src") === source) return;

    const image = new Image();
    image.onload = () => {
      preview.src = source;
      preview.alt = row.dataset.previewAlt || "";
    };
    image.onerror = () => {
      preview.removeAttribute("src");
      preview.alt = "";
    };
    image.src = source;
  }

  workRows.forEach((row) => {
    row.addEventListener("pointerenter", () => updateWorkPreview(row));
    row.addEventListener("focus", () => updateWorkPreview(row));
  });

  if (workRows.length) updateWorkPreview(workRows[0]);
}
