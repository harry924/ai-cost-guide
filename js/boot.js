/* Runs in <head> on every page, before the page is drawn.
   1. Applies the saved theme (aicg-theme) and the guide's own zoom (aicg-zoom). Chrome saves its own
      zoom separately for every file opened from disk, so the guide keeps one zoom in localStorage,
      which both pages share.
   2. Sets the width classes html.le1080 / le640 / le560 that css/styles.css uses instead of width
      media queries. They use the zoomed width (window width ÷ zoom), so a zoomed page narrows its
      layout the way it would with Chrome's own zoom.
   3. Picks the language, English or Simplified Chinese: ?lang=en or ?lang=zh in the address (which is
      then saved), else the saved choice (aicg-lang), else the browser's language. It sets <html lang>,
      and css/styles.css hides text marked with the other language. */
(function () {
  var d = document.documentElement, z = 1, lang = null;
  try {
    var t = localStorage.getItem("aicg-theme");
    if (t === "light" || t === "dark") d.setAttribute("data-theme", t);
    z = parseFloat(localStorage.getItem("aicg-zoom")) || 1;
    lang = localStorage.getItem("aicg-lang");
  } catch (e) { /* storage blocked: defaults */ }
  var BP = [1080, 640, 560];
  function widths() {
    var w = window.innerWidth / (window.AICG_ZOOM || 1);
    for (var i = 0; i < BP.length; i++) d.classList.toggle("le" + BP[i], w <= BP[i]);
  }
  window.aicgApplyZoom = function (nz) {
    nz = Math.min(3, Math.max(0.5, nz || 1));
    window.AICG_ZOOM = nz;
    d.style.zoom = nz === 1 ? "" : String(nz);
    widths();
    return nz;
  };
  window.aicgApplyZoom(z);
  window.addEventListener("resize", widths);

  var q = /[?&]lang=(en|zh)\b/.exec(location.search);
  if (q) {
    lang = q[1];
    try { localStorage.setItem("aicg-lang", lang); } catch (e) { /* private mode */ }
  }
  if (lang !== "en" && lang !== "zh") lang = /^zh\b/i.test(navigator.language || "") ? "zh" : "en";
  window.aicgApplyLang = function (l) {
    window.AICG_LANG = l === "zh" ? "zh" : "en";
    d.lang = l === "zh" ? "zh-CN" : "en";
    return window.AICG_LANG;
  };
  window.aicgApplyLang(lang);
})();
