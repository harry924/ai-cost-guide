/* English / Simplified Chinese toggle shared by every page.
   js/boot.js picks the language before first paint and sets <html lang>. In the HTML, each piece of
   text comes as a pair, one marked lang="en" and one lang="zh-CN", and css/styles.css hides the one
   not in use. Attributes are translated with data-zh-aria-label / data-zh-title, and the page title
   with <title data-zh>. Scripts get their text from Lang.t("English", "中文") and redraw it on the
   aicg-lang event. */
(function () {
  "use strict";
  const isZh = () => window.AICG_LANG === "zh";

  // t("English", "中文"), or t(["English", "中文"]). A plain string is the same in both languages.
  function t(en, zh) {
    if (Array.isArray(en)) [en, zh] = en;
    return isZh() && zh !== undefined ? zh : en;
  }

  // "20 October 2026" → "2026 年 10 月 20 日" in Chinese.
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function date(s) {
    const m = /^(\d+) (\w+) (\d+)$/.exec(s);
    if (!isZh() || !m || MONTHS.indexOf(m[2]) < 0) return s;
    return `${m[3]} 年 ${MONTHS.indexOf(m[2]) + 1} 月 ${m[1]} 日`;
  }

  function translateAttrs() {
    for (const a of ["aria-label", "title"]) {
      for (const e of document.querySelectorAll(`[data-zh-${a}]`)) {
        if (!e.hasAttribute(`data-en-${a}`)) e.setAttribute(`data-en-${a}`, e.getAttribute(a) || "");
        e.setAttribute(a, e.getAttribute(`data-${isZh() ? "zh" : "en"}-${a}`));
      }
    }
    const title = document.querySelector("title[data-zh]");
    if (title) {
      if (!title.dataset.en) title.dataset.en = title.textContent;
      document.title = isZh() ? title.dataset.zh : title.dataset.en;
    }
  }

  // The button names the language it switches to, in that language.
  const btn = document.getElementById("lang-btn");
  function label() {
    if (!btn) return;
    btn.textContent = isZh() ? "English" : "中文";
    btn.title = isZh() ? "Switch to English" : "切换到简体中文";
  }

  function set(l) {
    l = window.aicgApplyLang(l);
    try { localStorage.setItem("aicg-lang", l); } catch (e) { /* private mode */ }
    // A ?lang= in the address would override the saved choice on reload, so keep it in step.
    if (/[?&]lang=/.test(location.search)) {
      const u = new URL(location.href);
      u.searchParams.set("lang", l);
      history.replaceState(history.state, "", u);
    }
    translateAttrs();
    label();
    window.dispatchEvent(new Event("aicg-lang"));
  }

  if (btn) btn.addEventListener("click", () => set(isZh() ? "en" : "zh"));
  translateAttrs();
  label();

  window.Lang = { t, date, isZh };
})();
