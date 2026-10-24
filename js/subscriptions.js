/* Charts, tables and the calculator on the subscriptions page.
   Values are USD per month at API prices, from the sources listed on the page (October 2026). */
(function () {
  "use strict";

  const C = window.Charts, el = C.el, t = window.Lang.t;
  const $ = id => document.getElementById(id);
  const COLOR = { anthropic: "var(--s1)", openai: "var(--s2)" };

  const usd = v => `$${Math.round(v).toLocaleString("en-US")}`;
  const times = v => `${v >= 10 ? Math.round(v) : +v.toFixed(2)}×`;
  const exact = v => `${+v.toFixed(2)}×`;

  // Wokey: real accounts, week of 12–19 Oct. SemiAnalysis: controlled tests, 5 Oct (via Wokey).
  // Text fields are "same in both languages" strings or ["English", "中文"] pairs, read with t().
  const MEASURED = [
    { p: "anthropic", name: "Claude Pro", price: 20, value: 738, basis: ["Real usage, 474 accounts (Wokey)", "真实使用，474 个账号（Wokey）"] },
    { p: "anthropic", name: ["Claude Team Premium seat", "Claude Team 高级席位"], price: 125, value: 3732,
      basis: ["Real usage, 216 seats (Wokey)", "真实使用，216 个席位（Wokey）"] },
    { p: "anthropic", name: "Claude Max 20x", price: 200, value: 7121, basis: ["Real usage, 17 accounts (Wokey)", "真实使用，17 个账号（Wokey）"] },
    { p: "anthropic", name: ["Claude Max 20x, Opus 5.5 only", "Claude Max 20x，仅用 Opus 5.5"], price: 200, value: 11726,
      basis: ["Controlled agentic test (SemiAnalysis)", "智能体对照测试（SemiAnalysis）"] },
    { p: "openai", name: "ChatGPT Plus", price: 20, value: 253,
      basis: ["Real usage, mostly Sol-class models, 8 accounts (Wokey)", "真实使用，以 Sol 级模型为主，8 个账号（Wokey）"] },
    { p: "openai", name: ["ChatGPT Plus, Astra only", "ChatGPT Plus，仅用 Astra"], price: 20, value: 162,
      basis: ["Controlled test (SemiAnalysis)", "对照测试（SemiAnalysis）"] },
    { p: "openai", name: ["ChatGPT Pro $200, Astra only", "ChatGPT Pro $200，仅用 Astra"], price: 200, value: 2897,
      basis: ["Controlled test, new limits (SemiAnalysis)", "对照测试，新限额（SemiAnalysis）"] },
    { p: "openai", name: ["ChatGPT Pro $500, Astra only", "ChatGPT Pro $500，仅用 Astra"], price: 500, value: 6955,
      basis: ["Controlled test (SemiAnalysis)", "对照测试（SemiAnalysis）"] },
  ];

  const THEO = [
    { p: "anthropic", name: ["Claude $200 plan", "Claude $200 套餐"], price: 200, value: 8000, label: "≈$8,000",
      basis: ["Theo's estimate", "Theo 的估计"] },
    { p: "openai", name: ["Codex $200, before the cut", "Codex $200，削减前"], price: 200, value: 12000, label: "≈$12,000",
      basis: ["Theo; up to about $24,000 counting early resets", "Theo；算上提前重置最多约 $24,000"] },
    { p: "openai", name: ["Codex $200, after the cut", "Codex $200，削减后"], price: 200, value: 2250, label: "≈$2,000–2,500",
      basis: ["Theo; $573.86 in one Astra-heavy week", "Theo；以 Astra 为主的一周用了 $573.86"] },
    { p: "openai", name: ["Codex $500 on Ultrafast", "Codex $500，超快模式"], price: 500, value: 4000, label: "≈$4,000",
      basis: ["Theo; about $1,000 a week", "Theo；每周约 $1,000"] },
  ];

  // Included-usage cost relative to GPT-6.1 Sol at standard speed, from OpenAI's credit
  // rates (Sol 250, Astra 1,250, Luna 12.5 credits per 1M output tokens) and speed multipliers.
  const STANDARD = ["Standard speed", "标准速度"], FAST = ["Fast (2.5×)", "快速（2.5×）"], ULTRA = ["Ultrafast (8×)", "超快（8×）"];
  const DRAIN = [
    { name: "GPT-6 Luna", sub: STANDARD, x: 12.5 / 250 },
    { name: "GPT-6.1 Sol", sub: STANDARD, x: 1 },
    { name: "GPT-6.1 Sol", sub: FAST, x: 2.5 },
    { name: "GPT-6 Astra", sub: STANDARD, x: 1250 / 250 },
    { name: "GPT-6.1 Sol", sub: ULTRA, x: 8 },
    { name: "GPT-6 Astra", sub: FAST, x: 5 * 2.5 },
    { name: "GPT-6 Astra", sub: ULTRA, x: 5 * 8 },
  ];

  // Calculator allowances. Claude: Wokey real usage. ChatGPT: SemiAnalysis Astra-only; Pro $100
  // is estimated from the other Pro tiers' equal value per dollar.
  const MEASURED_NOTE = ["measured", "实测"], ASTRA_NOTE = ["measured, Astra only", "实测，仅 Astra"];
  const PLANS = [
    { p: "anthropic", name: "Claude Pro", price: 20, allowance: 738, note: MEASURED_NOTE },
    { p: "anthropic", name: "Claude Max 5x", price: 100, allowance: null, note: ["not measured yet", "尚未实测"] },
    { p: "anthropic", name: "Claude Max 20x", price: 200, allowance: 7121, note: MEASURED_NOTE },
    { p: "openai", name: "ChatGPT Plus", price: 20, allowance: 162, note: ASTRA_NOTE },
    { p: "openai", name: "ChatGPT Pro $100", price: 100, allowance: 1449, note: ["estimated, Astra only", "估算，仅 Astra"] },
    { p: "openai", name: "ChatGPT Pro $200", price: 200, allowance: 2897, note: ASTRA_NOTE },
    { p: "openai", name: "ChatGPT Pro $500", price: 500, allowance: 6955, note: ASTRA_NOTE },
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
    const row = r => {
      const v = r.label || usd(r.value);
      return barRow(t(r.name), t(`$${r.price} a month`, `每月 $${r.price}`), {
        color: COLOR[r.p], size: r.value / r.price, short: t(`${v} a month`, `每月 ${v}`),
        name: t(r.basis), value: t(`${v} a month at API prices`, `按 API 价格计每月 ${v}`),
      }, max, times(r.value / r.price));
    };
    $("value-bars").replaceChildren(...MEASURED.map(row));
    $("theo-bars").replaceChildren(...THEO.map(row));
    $("value-body").replaceChildren(...[...MEASURED, ...THEO].map(r => {
      const tr = el("tr");
      tr.append(el("td", "wrap", t(r.name)), el("td", null, `$${r.price}`), el("td", null, r.label || usd(r.value)),
        el("td", null, times(r.value / r.price)), el("td", "wrap", t(r.basis)));
      return tr;
    }));
  }

  function renderDrain() {
    const max = Math.max(...DRAIN.map(d => d.x));
    $("drain-bars").replaceChildren(...DRAIN.map(d => barRow(d.name, t(d.sub), {
      color: COLOR.openai, size: d.x, short: exact(d.x), name: t(`${d.name}, ${d.sub[0].toLowerCase()}`, `${d.name}，${d.sub[1]}`),
      value: t(`${exact(d.x)} the allowance of GPT-6.1 Sol at standard speed`, `消耗额度的速度是标准速度 GPT-6.1 Sol 的 ${exact(d.x)}`),
    }, max, exact(d.x))));
  }

  function renderCalc() {
    let usage = parseFloat($("calc-usage").value);
    if (!isFinite(usage) || usage < 0) usage = 0;
    const options = [{ p: null, name: ["Pay as you go (API)", "按量付费（API）"], price: usage, allowance: Infinity, note: "" }, ...PLANS];
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
      name.append(document.createTextNode(t(o.name)));
      const allowance = el("td");
      if (o.allowance === Infinity) allowance.textContent = t("Unlimited", "无上限");
      else if (o.allowance === null) allowance.append(el("span", "muted", t("Not measured", "未实测")));
      else allowance.append(document.createTextNode(t(`≈${usd(o.allowance)} `, `≈${usd(o.allowance)}`)), el("span", "muted", t(`(${o.note[0]})`, `（${o.note[1]}）`)));
      let covers;
      if (o.allowance === null) covers = t("Unknown", "未知");
      else if (o.allowance >= usage) covers = t("Yes", "能");
      else {
        const day = Math.max(1, Math.floor((30 * o.allowance) / usage));
        covers = t(`No, runs out around day ${day}`, `不能，大约第 ${day} 天用完`);
      }
      const pay = cost(o);
      tr.append(name, el("td", null, usd(o.price)), allowance, el("td", "wrap", covers),
        el("td", pay === best && isFinite(pay) ? "best" : null, isFinite(pay) ? usd(pay) : "–"));
      return tr;
    }));
    $("calc-note").textContent = t(
      "Claude allowances are Wokey's real-usage medians. ChatGPT allowances are SemiAnalysis's GPT-6 Astra figures, " +
      "which undercount cheaper models (Plus measured about $253 on real, mostly Sol-class use). " +
      "Pro $100 is estimated from the other Pro tiers' equal value per dollar. All assume you spread usage evenly across the month.",
      "Claude 的额度取自 Wokey 真实使用数据的中位数。ChatGPT 的额度取自 SemiAnalysis 的 GPT-6 Astra 数据，" +
      "会低估更便宜的模型（Plus 在以 Sol 级模型为主的真实使用中实测约为 $253）。" +
      "Pro $100 是根据其他 Pro 档位每美元价值相同估算的。以上均假设你的用量在整个月内均匀分布。");
  }

  function initToc() {
    const links = [...document.querySelectorAll(".toc a")];
    const byId = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const onEnter = entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach(a => a.classList.remove("active"));
        const a = byId.get(e.target.id);
        if (a) a.classList.add("active");
      }
    };
    let io = null;
    const observe = () => {
      if (io) io.disconnect();
      const top = Math.round(80 * (window.AICG_ZOOM || 1)); // the top bar grows with the guide's zoom
      io = new IntersectionObserver(onEnter, { rootMargin: `-${top}px 0px -70% 0px` });
      document.querySelectorAll("main section").forEach(s => io.observe(s));
    };
    observe();
    window.addEventListener("aicg-zoom", observe);
  }

  renderValue();
  renderDrain();
  renderCalc();
  initToc();
  $("calc-usage").addEventListener("input", renderCalc);
  window.addEventListener("aicg-lang", () => { renderValue(); renderDrain(); renderCalc(); requestAnimationFrame(() => C.fitStacks()); });
  window.addEventListener("resize", () => C.fitStacks());
  requestAnimationFrame(() => C.fitStacks());
})();
