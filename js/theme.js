/* Light/dark toggle shared by every page. Each page's <head> applies the saved choice before first paint. */
(function () {
  "use strict";
  const btn = document.getElementById("theme-btn");
  if (!btn) return;
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (document.documentElement.dataset.theme || (mq.matches ? "dark" : "light")) === "dark";
  const label = () => { btn.textContent = isDark() ? "Light mode" : "Dark mode"; };
  const refit = () => { if (window.Charts) window.Charts.fitStacks(); };
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("aicg-theme", next); } catch (e) { /* private mode */ }
    label();
    refit();
  });
  mq.addEventListener("change", () => { label(); refit(); });
  label();
})();
