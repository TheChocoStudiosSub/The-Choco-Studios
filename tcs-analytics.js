(() => {
  "use strict";
  const endpoint = "https://choco-ai-independent-seven.vercel.app/api/license?feature=tcs-public";
  const site = document.currentScript?.dataset.site || "tcs-website";
  const sessionId = (key) => {
    try {
      let value = sessionStorage.getItem(key);
      if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
      return value;
    } catch { return crypto.randomUUID(); }
  };
  const visitorId = sessionId("tcs_analytics_visitor_v1");
  const session = sessionId("tcs_analytics_session_v1");
  const send = (payload) => {
    const data = JSON.stringify({ action: "track", siteKey: site, visitorId, sessionId: session, ...payload });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([data], { type: "application/json" }))) return;
    } catch {}
    fetch(endpoint, { method: "POST", mode: "cors", credentials: "omit", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: data }).catch(() => {});
  };
  send({ event: "visit", path: location.pathname, referrer: document.referrer || "" });
  document.addEventListener("click", (event) => {
    const link = event.target?.closest?.("a[data-tcs-download],a[download],a[href*='/releases/download/']");
    if (!link || link.dataset.tcsTrackingHandled) return;
    const url = link.href;
    if (!/^https:\/\//i.test(url)) return;
    link.dataset.tcsTrackingHandled = "true";
    const label = (link.dataset.tcsProductName || link.textContent || "Unduhan produk").trim().replace(/\s+/g, " ").slice(0, 180);
    const code = (link.dataset.tcsProductCode || label).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "tcs-download";
    send({ event: "download", productCode: code, productName: label, version: link.dataset.tcsVersion || "", url });
  });
})();
