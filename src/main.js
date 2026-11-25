const root = document.querySelector("#home");
const panels = root ? [...root.querySelectorAll(":scope > [data-panel]")] : [];
const navigationLinks = [...document.querySelectorAll("[data-panel-link]")];
const panelById = new Map(panels.map((panel) => [panel.dataset.panel, panel]));

panels.forEach((panel) => {
  if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
});

function normalizePanelId(value) {
  if (!value) return "home";
  try { return decodeURIComponent(value.replace(/^#/, "")); }
  catch { return "home"; }
}

function setNavigationState(id) {
  navigationLinks.forEach((link) => {
    const active = link.dataset.panelLink === id;
    link.classList.toggle("is-current", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function activatePanel(id, options = {}) {
  const target = panelById.get(id);
  if (!target) return false;

  panels.forEach((panel) => {
    const active = panel === target;
    panel.classList.toggle("is-active", active);
    panel.setAttribute("aria-hidden", String(!active));
    panel.toggleAttribute("inert", !active);
  });

  setNavigationState(id);
  target.scrollTop = options.preserveScroll ? target.scrollTop : 0;

  if (options.updateHistory === "push" && location.hash !== "#" + id) {
    history.pushState({ tcsPanel: id }, "", "#" + encodeURIComponent(id));
  } else if (options.updateHistory === "replace" && location.hash !== "#" + id) {
    history.replaceState({ tcsPanel: id }, "", "#" + encodeURIComponent(id));
  }

  if (options.focus) target.focus({ preventScroll: true });
  return true;
}

// Sidebar links and in-page calls use the same active-panel navigation.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const destination = normalizePanelId(link.getAttribute("href"));
  if (!panelById.has(destination)) return;
  event.preventDefault();
  activatePanel(destination, { updateHistory: "push", focus: true });
});

window.addEventListener("popstate", () => {
  const requested = normalizePanelId(location.hash);
  activatePanel(panelById.has(requested) ? requested : "home", {
    updateHistory: "none",
    focus: false
  });
});

// Direct links such as /#work open the requested page immediately.
const requestedInitialPanel = normalizePanelId(location.hash);
const initialPanel = panelById.has(requestedInitialPanel)
  ? requestedInitialPanel
  : (panels.find((panel) => panel.classList.contains("is-active"))?.dataset.panel || "home");
activatePanel(initialPanel, { updateHistory: "none", focus: false });

// Year and project preview.
const year = String(new Date().getFullYear());
document.querySelectorAll("#year, #footer-year").forEach((node) => {
  node.textContent = year;
});

const workRows = [...document.querySelectorAll("#work .work-index-row[data-preview]")];
const preview = document.querySelector("#work .work-preview img");

function showWorkPreview(row) {
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
    preview.alt = "Pratinjau tidak tersedia";
  };
  image.src = source;
}

workRows.forEach((row) => {
  row.addEventListener("pointerenter", () => showWorkPreview(row));
  row.addEventListener("focus", () => showWorkPreview(row));
});
if (workRows.length) showWorkPreview(workRows[0]);
