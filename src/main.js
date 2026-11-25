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

  // Floating Selected Work preview. Kept outside the panel so it never
  // consumes layout space or gets clipped by the panel's own scrolling.
  const workIndex = document.querySelector("#work .work-index");
  const cursorPreview = document.querySelector("#work-cursor-preview");
  const previewTitle = document.querySelector("#work-cursor-preview-title");
  const previewImages = [
    document.querySelector("#work-cursor-preview-image-a"),
    document.querySelector("#work-cursor-preview-image-b")
  ];
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const compactViewport = window.matchMedia("(max-width: 850px)");

  if (workIndex && cursorPreview && previewTitle && previewImages.every(Boolean)) {
    let activeRow = null;
    let pointerX = 0;
    let pointerY = 0;
    let animationFrame = 0;
    let imageRequest = 0;
    let currentImageIndex = 0;

    function placePreview() {
      animationFrame = 0;
      const bounds = cursorPreview.getBoundingClientRect();
      const gap = 22;
      const edge = 14;
      let x = pointerX + gap;
      let y = pointerY + 18;

      if (x + bounds.width > window.innerWidth - edge) {
        x = pointerX - bounds.width - gap;
      }
      if (y + bounds.height > window.innerHeight - edge) {
        y = pointerY - bounds.height - 18;
      }

      x = Math.max(edge, Math.min(x, window.innerWidth - bounds.width - edge));
      y = Math.max(edge, Math.min(y, window.innerHeight - bounds.height - edge));

      cursorPreview.style.left = Math.round(x) + "px";
      cursorPreview.style.top = Math.round(y) + "px";
    }

    function schedulePosition() {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(placePreview);
      }
    }

    function hideCursorPreview() {
      activeRow = null;
      imageRequest += 1;
      cursorPreview.classList.remove("is-visible");
    }

    function showCursorPreview(row, x, y) {
      if (!row || compactViewport.matches || !finePointer.matches) {
        hideCursorPreview();
        return;
      }

      activeRow = row;
      pointerX = x;
      pointerY = y;
      previewTitle.textContent =
        row.querySelector(".work-index-title")?.textContent.trim() || "";
      schedulePosition();

      const source = row.dataset.preview;
      const alt = row.dataset.previewAlt || "";
      if (!source) {
        hideCursorPreview();
        return;
      }

      const request = ++imageRequest;
      const alreadyLoaded = previewImages.find((image) =>
        image.classList.contains("is-current") &&
        image.dataset.source === source
      );

      if (alreadyLoaded) {
        cursorPreview.classList.add("is-visible");
        return;
      }

      const preload = new Image();
      preload.onload = () => {
        if (request !== imageRequest || activeRow !== row) return;

        const nextIndex = currentImageIndex === 0 ? 1 : 0;
        const nextImage = previewImages[nextIndex];
        nextImage.src = source;
        nextImage.alt = alt;
        nextImage.dataset.source = source;

        previewImages[currentImageIndex].classList.remove("is-current");
        nextImage.classList.add("is-current");
        currentImageIndex = nextIndex;

        schedulePosition();
        cursorPreview.classList.add("is-visible");
      };
      preload.onerror = () => {
        if (request === imageRequest && activeRow === row) {
          cursorPreview.classList.remove("is-visible");
        }
      };
      preload.src = source;
    }

    workIndex.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      const row = event.target.closest(".work-index-row[data-preview]");
      if (!row || !workIndex.contains(row)) return;
      if (row === activeRow) return;
      showCursorPreview(row, event.clientX, event.clientY);
    });

    workIndex.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || !activeRow) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedulePosition();
    });

    workIndex.addEventListener("pointerleave", hideCursorPreview);

    workIndex.addEventListener("focusin", (event) => {
      const row = event.target.closest(".work-index-row[data-preview]");
      if (!row) return;
      const rect = row.getBoundingClientRect();
      showCursorPreview(
        row,
        Math.min(rect.right + 16, window.innerWidth - 16),
        rect.top + rect.height / 2
      );
    });

    workIndex.addEventListener("focusout", (event) => {
      if (!workIndex.contains(event.relatedTarget)) hideCursorPreview();
    });

    workIndex.addEventListener("click", hideCursorPreview);
    window.addEventListener("blur", hideCursorPreview);

    const handleViewportChange = () => hideCursorPreview();
    if (typeof compactViewport.addEventListener === "function") {
      compactViewport.addEventListener("change", handleViewportChange);
      finePointer.addEventListener("change", handleViewportChange);
    } else {
      compactViewport.addListener(handleViewportChange);
      finePointer.addListener(handleViewportChange);
    }
  }
}
