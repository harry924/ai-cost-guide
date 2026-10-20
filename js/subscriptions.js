/* Charts, tables and the calculator on the subscriptions page.
   Values are USD per month at API prices, from the sources listed on the page (October 2026). */
(function () {
  "use strict";

  const C = window.Charts, el = C.el;
  const $ = id => document.getElementById(id);
  const COLOR = { anthropic: "var(--s1)", openai: "var(--s2)" };

  const usd = v => `$${Math.round(v).toLocaleString("en-US")}`;
  const times = v => `${v >= 10 ? Math.round(v) : +v.toFixed(2)}×`;
  const exact = v => `${+v.toFixed(2)}×`;

  // Wokey: real accounts, week of 12–19 Oct. SemiAnalysis: controlled tests, 5 Oct (via Wokey).
  const MEASURED = [
    { p: "anthropic", name: "Claude Pro", price: 20, value: 738, basis: "Real usage, 474 accounts (Wokey)" },
    { p: "anthropic", name: "Claude Team Premium seat", price: 125, value: 3732, basis: "Real usage, 216 seats (Wokey)" },
    { p: "anthropic", name: "Claude Max 20x", price: 200, value: 7121, basis: "Real usage, 17 accounts (Wokey)" },
    { p: "anthropic", name: "Claude Max 20x, Opus 5.5 only", price: 200, value: 11726, basis: "Controlled agentic test (SemiAnalysis)" },
    { p: "openai", name: "ChatGPT Plus", price: 20, value: 253, basis: "Real usage, mostly Sol-class models, 8 accounts (Wokey)" },
    { p: "openai", name: "ChatGPT Plus, Astra only", price: 20, value: 162, basis: "Controlled test (SemiAnalysis)" },
    { p: "openai", name: "ChatGPT Pro $200, Astra only", price: 200, value: 2897, basis: "Controlled test, new limits (SemiAnalysis)" },
    { p: "openai", name: "ChatGPT Pro $500, Astra only", price: 500, value: 6955, basis: "Controlled test (SemiAnalysis)" },
  ];

  const THEO = [
    { p: "anthropic", name: "Claude $200 plan", price: 200, value: 8000, label: "≈$8,000", basis: "Theo's estimate" },
    { p: "openai", name: "Codex $200, before the cut", price: 200, value: 12000, label: "≈$12,000",
      basis: "Theo; up to about $24,000 counting early resets" },
    { p: "openai", name: "Codex $200, after the cut", price: 200, value: 2250, label: "≈$2,000–2,500",
      basis: "Theo; $573.86 in one Astra-heavy week" },
    { p: "openai", name: "Codex $500 on Ultrafast", price: 500, value: 4000, label: "≈$4,000", basis: "Theo; about $1,000 a week" },
  ];

  // Included-usage cost relative to GPT-6.1 Sol at standard speed, from OpenAI's credit
  // rates (Sol 250, Astra 1,250, Luna 12.5 credits per 1M output tokens) and speed multipliers.
  const DRAIN = [
    { name: "GPT-6 Luna", sub: "Standard speed", x: 12.5 / 250 },
    { name: "GPT-6.1 Sol", sub: "Standard speed", x: 1 },
    { name: "GPT-6.1 Sol", sub: "Fast (2.5×)", x: 2.5 },
    { name: "GPT-6 Astra", sub: "Standard speed", x: 1250 / 250 },
    { name: "GPT-6.1 Sol", sub: "Ultrafast (8×)", x: 8 },
    { name: "GPT-6 Astra", sub: "Fast (2.5×)", x: 5 * 2.5 },
    { name: "GPT-6 Astra", sub: "Ultrafast (8×)", x: 5 * 8 },
  ];

  // Calculator allowances. Claude: Wokey real usage. ChatGPT: SemiAnalysis Astra-only; Pro $100
  // is estimated from the other Pro tiers' equal value per dollar.
  const PLANS = [
    { p: "anthropic", name: "Claude Pro", price: 20, allowance: 738, note: "measured" },
    { p: "anthropic", name: "Claude Max 5x", price: 100, allowance: null, note: "not measured yet" },
    { p: "anthropic", name: "Claude Max 20x", price: 200, allowance: 7121, note: "measured" },
    { p: "openai", name: "ChatGPT Plus", price: 20, allowance: 162, note: "measured, Astra only" },
    { p: "openai", name: "ChatGPT Pro $100", price: 100, allowance: 1449, note: "estimated, Astra only" },
    { p: "openai", name: "ChatGPT Pro $200", price: 200, allowance: 2897, note: "measured, Astra only" },
    { p: "openai", name: "ChatGPT Pro $500", price: 500, allowance: 6955, note: "measured, Astra only" },
  ];

  function barRow(name, sub, seg, max, value) {
    const row = el("div", "bar-row");
    const n = el("div", "name", name);
    if (sub) n.append(el("small", null, sub));
    row.append(n, C.stack([seg], max), el("div", "val", value));
    return row;
  }

  function renderValue() {
    const max = Math.max(...[...MEASURED, ...THEO].map(r => r.value / r.price));
    const row = r => barRow(r.name, `$${r.price} a month`, {
      color: COLOR[r.p], size: r.value / r.price, short: `${r.label || usd(r.value)} a month`,
      name: r.basis, value: `${r.label || usd(r.value)} a month at API prices`,
    }, max, times(r.value / r.price));
    $("value-bars").replaceChildren(...MEASURED.map(row));
    $("theo-bars").replaceChildren(...THEO.map(row));
    $("value-body").replaceChildren(...[...MEASURED, ...THEO].map(r => {
      const tr = el("tr");
      tr.append(el("td", "wrap", r.name), el("td", null, `$${r.price}`), el("td", null, r.label || usd(r.value)),
        el("td", null, times(r.value / r.price)), el("td", "wrap", r.basis));
      return tr;
    }));
  }

  function renderDrain() {
    const max = Math.max(...DRAIN.map(d => d.x));
    $("drain-bars").replaceChildren(...DRAIN.map(d => barRow(d.name, d.sub, {
      color: COLOR.openai, size: d.x, short: exact(d.x), name: `${d.name}, ${d.sub.toLowerCase()}`,
      value: `${exact(d.x)} the allowance of GPT-6.1 Sol at standard speed`,
    }, max, exact(d.x))));
  }

  function renderCalc() {
    let usage = parseFloat($("calc-usage").value);
    if (!isFinite(usage) || usage < 0) usage = 0;
    const options = [{ p: null, name: "Pay as you go (API)", price: usage, allowance: Infinity, note: "" }, ...PLANS];
    const cost = o => (o.allowance !== null && o.allowance >= usage ? o.price : Infinity);
    const best = Math.min(...options.map(cost));
    $("calc-body").replaceChildren(...options.map(o => {
      const tr = el("tr");
      const name = el("td", "wrap");
      if (o.p) {
        const k = el("i", "key-rect");
        k.style.background = COLOR[o.p];
        k.style.marginRight = "8px";
        name.append(k);
      }
      name.append(document.createTextNode(o.name));
      const allowance = el("td");
      if (o.allowance === Infinity) allowance.textContent = "Unlimited";
      else if (o.allowance === null) allowance.append(el("span", "muted", "Not measured"));
      else allowance.append(document.createTextNode(`≈${usd(o.allowance)} `), el("span", "muted", `(${o.note})`));
      let covers;
      if (o.allowance === null) covers = "Unknown";
      else if (o.allowance >= usage) covers = "Yes";
      else covers = `No, runs out around day ${Math.max(1, Math.floor((30 * o.allowance) / usage))}`;
      const pay = cost(o);
      tr.append(name, el("td", null, usd(o.price)), allowance, el("td", "wrap", covers),
        el("td", pay === best && isFinite(pay) ? "best" : null, isFinite(pay) ? usd(pay) : "–"));
      return tr;
    }));
    $("calc-note").textContent =
      "Claude allowances are Wokey's real-usage medians. ChatGPT allowances are SemiAnalysis's GPT-6 Astra figures, " +
      "which undercount cheaper models (Plus measured about $253 on real, mostly Sol-class use). " +
      "Pro $100 is estimated from the other Pro tiers' equal value per dollar. All assume you spread usage evenly across the month.";
  }

  function initToc() {
    const links = [...document.querySelectorAll(".toc a")];
    const byId = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach(a => a.classList.remove("active"));
        const a = byId.get(e.target.id);
        if (a) a.classList.add("active");
      }
    }, { rootMargin: "-80px 0px -70% 0px" });
    document.querySelectorAll("main section").forEach(s => io.observe(s));
  }

  renderValue();
  renderDrain();
  renderCalc();
  initToc();
  $("calc-usage").addEventListener("input", renderCalc);
  window.addEventListener("resize", () => C.fitStacks());
  requestAnimationFrame(() => C.fitStacks());
})();
