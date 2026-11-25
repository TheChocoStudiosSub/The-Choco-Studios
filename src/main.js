import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);


function startIntroCurtain() {
  const loader = document.querySelector("#tcs-intro-loader");
  if (!loader || loader.hidden) return;

  const counter = loader.querySelector("[data-intro-count]");
  const progress = loader.querySelector("[data-intro-progress]");
  const failSafe = window.__tcsIntroFailSafe;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;

  const finish = () => {
    if (typeof failSafe === "function") {
      failSafe();
    } else {
      loader.classList.add("is-opening");
      loader.hidden = true;
      document.querySelector(".site-shell")?.removeAttribute("inert");
    }
  };

  const animateCounter = () => {
    if (started || loader.hidden) return;
    started = true;

    if (reducedMotion.matches) {
      finish();
      return;
    }

    const state = { value: 0 };

    try {
      gsap.to(state, {
        value: 100,
        duration: 1.28,
        ease: "power2.out",
        snap: { value: 1 },
        onUpdate: () => {
          const value = Math.min(100, Math.round(state.value));
          if (counter) counter.textContent = String(value);
          if (progress) {
            progress.style.transform = "scaleX(" + value / 100 + ")";
          }
        },
        onComplete: () => window.setTimeout(finish, 160)
      });
    } catch {
      finish();
    }
  };

  const waitForFonts = () => {
    if (document.fonts?.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 650))
      ]).then(animateCounter, animateCounter);
    } else {
      animateCounter();
    }
  };

  if (document.readyState === "complete") {
    waitForFonts();
  } else {
    window.addEventListener("load", waitForFonts, { once: true });
  }

  // Independent guard in case a browser extension or runtime interrupts GSAP.
  window.setTimeout(finish, 4900);
}

startIntroCurtain();

const root = document.querySelector("#home");

if (root) {
  const panels = [...root.querySelectorAll(":scope > [data-panel]")];
  const navLinks = [...document.querySelectorAll("[data-panel-link]")];
  const panelMap = new Map(panels.map((panel) => [panel.dataset.panel, panel]));
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const compactViewport = window.matchMedia("(max-width: 850px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panelContentMap = new Map();

  // Lenis needs one measurable content element inside each independently
  // scrollable panel. The wrappers are added without changing the source HTML.
  panels.forEach((panel) => {
    let content = panel.querySelector(":scope > .panel-scroll-content");

    if (!content) {
      content = document.createElement("div");
      content.className = "panel-scroll-content";
      content.dataset.lenisContent = "";

      while (panel.firstChild) {
        content.appendChild(panel.firstChild);
      }

      panel.appendChild(content);
    }

    panelContentMap.set(panel, content);

    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
  });

  let activePanel = null;
  let activePanelLenis = null;
  let activeLenisTicker = null;
  let activeMotionContext = null;

  const revealSelectors = {
    home: [".hero-content", ".hero-guilloche"],
    studio: [
      ".statement-heading",
      ".statement-detail > p",
      ".statement-signature",
      ".statement-actions"
    ],
    "founder-profile": [".founder-portrait", ".founder-copy"],
    work: [".work-heading", ".work-index-row"],
    principles: [
      ".section-kicker",
      ".principles-editorial > h2",
      ".principles-list article"
    ],
    footer: [".footer-editorial > h2", ".footer-links a", ".footer-meta"]
  };

  function clearPanelExperience() {
    activeMotionContext?.revert();
    activeMotionContext = null;

    if (activePanelLenis) {
      if (activeLenisTicker) {
        gsap.ticker.remove(activeLenisTicker);
      }

      activePanelLenis.destroy();
      activePanelLenis = null;
      activeLenisTicker = null;
    }
  }

  function setupPanelExperience(panel, { animate = true } = {}) {
    clearPanelExperience();
    activePanel = panel;

    const content = panelContentMap.get(panel);
    if (!content || reducedMotion.matches) return;

    // Native touch scrolling remains in place. Lenis is enabled only for
    // desktop wheel/trackpad input, where its inertia is most useful.
    if (finePointer.matches && !compactViewport.matches) {
      const lenis = new Lenis({
        wrapper: panel,
        content,
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.085,
        wheelMultiplier: 0.9,
        overscroll: true
      });

      activePanelLenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);

      activeLenisTicker = (time) => {
        if (activePanelLenis === lenis) {
          lenis.raf(time * 1000);
        }
      };

      gsap.ticker.add(activeLenisTicker);
    }

    const selectors = revealSelectors[panel.dataset.panel] || [];
    const revealTargets = selectors.length
      ? [...panel.querySelectorAll(selectors.join(","))]
      : [];

    activeMotionContext = gsap.context(() => {
      if (animate) {
        gsap.fromTo(
          content,
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.62,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility"
          }
        );
      }

      revealTargets.forEach((element, index) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.68,
            delay: Math.min(index, 6) * 0.06,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
            scrollTrigger: {
              trigger: element,
              scroller: panel,
              start: "top 88%",
              toggleActions: "play none none none",
              once: true
            }
          }
        );
      });
    }, panel);

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

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

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
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

    if (options.resetScroll !== false) {
      selected.scrollTop = 0;
    }

    setupPanelExperience(selected);

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

  window.addEventListener("resize", () => ScrollTrigger.refresh(), { passive: true });

  const refreshMotionMode = () => {
    if (activePanel) {
      setupPanelExperience(activePanel, { animate: false });
    }
  };

  if (typeof finePointer.addEventListener === "function") {
    finePointer.addEventListener("change", refreshMotionMode);
    compactViewport.addEventListener("change", refreshMotionMode);
    reducedMotion.addEventListener("change", refreshMotionMode);
  } else {
    finePointer.addListener(refreshMotionMode);
    compactViewport.addListener(refreshMotionMode);
    reducedMotion.addListener(refreshMotionMode);
  }

  // Floating Selected Work preview. Kept outside the panel so it never
  // consumes layout space or gets clipped by the panel's own scrolling.
  const workIndex = document.querySelector("#work .work-index");
  const cursorPreview = document.querySelector("#work-cursor-preview");
  const previewTitle = document.querySelector("#work-cursor-preview-title");
  const previewImages = [
    document.querySelector("#work-cursor-preview-image-a"),
    document.querySelector("#work-cursor-preview-image-b")
  ];

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
      if (!workIndex.contains(event.relatedTarget)) {
        hideCursorPreview();
      }
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
