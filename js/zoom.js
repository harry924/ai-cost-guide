/* The guide's own zoom: − / 100% / + in the top bar, and Ctrl/⌘ + − 0.
   Chrome saves its zoom separately for every file opened from disk, so the guide keeps one zoom
   (localStorage 'aicg-zoom', applied before first paint by js/boot.js) that both pages share. */
(function () {
  "use strict";
  const STEPS = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];
  const zOut = document.getElementById("zoom-out");
  const zVal = document.getElementById("zoom-val");
  const zIn = document.getElementById("zoom-in");
  const cur = () => window.AICG_ZOOM || 1;

  function show() {
    if (!zVal) return;
    const pct = `${Math.round(cur() * 100)}%`;
    zVal.textContent = pct;
    zVal.setAttribute("aria-label", `Zoom ${pct}. Activate to reset to 100%.`);
  }
  // Charts, bar labels and section highlighting re-measure after any zoom change.
  function refit() {
    show();
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("aicg-zoom"));
  }
  function set(z) {
    z = window.aicgApplyZoom(z);
    try { localStorage.setItem("aicg-zoom", String(z)); } catch (e) { /* private mode */ }
    refit();
  }
  function step(dir) {
    const z = cur();
    const next = dir > 0 ? STEPS.find(v => v > z + 0.001) : [...STEPS].reverse().find(v => v < z - 0.001);
    set(next || z);
  }

  if (zOut) zOut.addEventListener("click", () => step(-1));
  if (zIn) zIn.addEventListener("click", () => step(1));
  if (zVal) zVal.addEventListener("click", () => set(1));
  document.addEventListener("keydown", e => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    if (e.key === "=" || e.key === "+") { e.preventDefault(); step(1); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); step(-1); }
    else if (e.key === "0") set(1); // no preventDefault, so Chrome also clears its own saved zoom
  });
  // Zoom changed in another open tab of the guide: follow it.
  window.addEventListener("storage", e => {
    if (e.key !== "aicg-zoom") return;
    window.aicgApplyZoom(parseFloat(e.newValue) || 1);
    refit();
  });
  show();
})();
