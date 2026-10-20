/* Wires the guide's interactive parts to the pricing data. */
(function () {
  "use strict";

  const P = window.Pricing, C = window.Charts, el = C.el;
  const $ = id => document.getElementById(id);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  let modelId = P.byId(store.get("aicg-model")) ? store.get("aicg-model") : P.DEFAULT_MODEL;
  const model = () => P.byId(modelId);

  // ---------- formatting ----------
  function usd(v) {
    if (!isFinite(v)) return "–";
    const a = Math.abs(v);
    if (a === 0) return "$0.00";
    if (a < 0.01) return `$${v.toFixed(4)}`;
    if (a < 1000) return `$${v.toFixed(2)}`;
    return `$${Math.round(v).toLocaleString("en-US")}`;
  }
  // Prices and axis ticks: whole numbers bare, otherwise at least two decimals.
  function money(v) {
    let d = 0;
    while (d < 6 && Math.abs(v - +v.toFixed(d)) > 1e-9) d++;
    if (d === 1) d = 2;
    return `$${v.toFixed(d)}`;
  }
  function tok(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return String(Math.round(n));
  }
  const pct = v => `${Math.round(v * 100)}%`;
  const ordinal = n => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  function num(id, lo, hi, d) {
    let v = parseFloat($(id).value);
    if (!isFinite(v)) v = d;
    return Math.min(hi, Math.max(lo, v));
  }
  const radio = name => document.querySelector(`input[name="${name}"]:checked`).value;

  const COLOR = { read: "var(--c-read)", write: "var(--c-write)", normal: "var(--c-normal)", output: "var(--c-output)" };
  const KIND = { read: "Cache read", write: "Cache write", normal: "Normal input", output: "Output" };
  const KINDS = ["read", "write", "normal", "output"];
  const OPTIONS = [
    { id: "1h", name: "1-hour cache", color: "var(--c-h1)" },
    { id: "5m", name: "5-minute cache", color: "var(--c-m5)" },
    { id: "none", name: "No caching", color: "var(--c-none)" },
  ];

  // Charts that need redrawing when their width changes.
  let lineCharts = [];

  function td(text, cls) { return el("td", cls || null, text); }
  function barRow(name, sub, segments, max, value, note) {
    const row = el("div", "bar-row");
    const n = el("div", "name", name);
    if (sub) n.append(el("small", null, sub));
    row.append(n, C.stack(segments, max), el("div", "val", value));
    if (note) row.append(el("div", "note", note));
    return row;
  }
  function tokenSegs(t, c) {
    return KINDS.filter(k => t[k] && k !== "output").map(k => ({
      color: COLOR[k], size: t[k], short: tok(t[k]), name: KIND[k], value: `${tok(t[k])} tokens · ${usd(c[k])}`,
    }));
  }
  function costSegs(c, t) {
    return KINDS.filter(k => c[k] > 0).map(k => ({
      color: COLOR[k], size: c[k], short: usd(c[k]), name: KIND[k],
      value: t ? `${tok(t[k])} tokens · ${usd(c[k])}` : usd(c[k]),
    }));
  }
  const yFormat = v => money(v);

  // ---------- header ----------
  function initModelSelect() {
    const sel = $("model-select");
    for (const m of P.MODELS) {
      const o = el("option", null, m.name);
      o.value = m.id;
      sel.append(o);
    }
    sel.value = modelId;
    sel.addEventListener("change", () => {
      modelId = sel.value;
      store.set("aicg-model", modelId);
      renderAll();
    });
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

  // ---------- price list ----------
  function renderPrices() {
    const m = model();
    $("price-body").replaceChildren(...P.MODELS.map(x => {
      const tr = el("tr", x.id === modelId ? "sel" : null);
      tr.append(td(x.name), ...[x.input, x.w5, x.w1, x.read, x.output].map(v => td(money(v))));
      return tr;
    }));
    const text = {
      read: `· ${money(m.read)} per million on ${m.name}`,
      w1: `· ${money(m.w1)} per million for a 1-hour cache, ${money(m.w5)} for 5 minutes`,
      input: `· ${money(m.input)} per million`,
    };
    for (const s of document.querySelectorAll("[data-rate]")) s.textContent = text[s.dataset.rate];
  }

  // ---------- tokens ----------
  function renderTokens() {
    const m = model(), text = $("tok-text").value;
    const chars = text.length, words = (text.trim().match(/\S+/g) || []).length, t = Math.ceil(chars / 4);
    const item = (label, v) => { const s = el("span", null, `${label} `); s.append(el("b", null, v)); return s; };
    $("tok-out").replaceChildren(
      item("Characters", chars.toLocaleString("en-US")),
      item("Words", words.toLocaleString("en-US")),
      item("About", `${t.toLocaleString("en-US")} tokens`),
      item("As input", usd((t * m.input) / 1e6)),
      item("As output", usd((t * m.output) / 1e6)),
    );
  }

  // ---------- resend ----------
  function renderResend() {
    const sys = 10000, msg = 1000, reply = 2000;
    const inputAt = k => sys + msg + (k - 1) * (msg + reply);
    const max = inputAt(30);
    const subs = { 1: "System prompt + your first message", 2: "Adds the first reply and your second message", 30: "29 exchanges later" };
    $("resend-bars").replaceChildren(...[1, 2, 3, 4, 30].map(k => {
      const total = inputAt(k), before = k === 1 ? 0 : inputAt(k - 1);
      const segs = [];
      if (before) segs.push({ color: "var(--before)", size: before, short: tok(before), name: "Already sent", value: `${tok(before)} tokens` });
      segs.push({ color: "var(--c-new)", size: total - before, short: tok(total - before), name: "New", value: `${tok(total - before)} tokens` });
      return barRow(`Request ${k}`, subs[k], segs, max, `${tok(total)} sent`);
    }));
  }

  // ---------- caching scenarios ----------
  function renderScenarios() {
    const m = model(), H = 200000, N = 10000;
    const sc = [
      { name: "Warm cache", sub: "You reply within the hour", t: { read: H, write: N },
        note: "The last request saved the history, so it's read. The model's last reply and your new message weren't saved, so they're written." },
      { name: "Expired cache", sub: "You come back after 3 hours", t: { write: H + N },
        note: "The cache expired, so the whole history is written again along with the new text." },
      { name: "The next request", sub: "Right after the expired one", t: { read: H + N, write: 3000 },
        note: "Everything is cached again, so it's read. Only the new 3k, such as a tool result, is written." },
      { name: "No caching", sub: "For comparison", t: { normal: H + N },
        note: "Without a cache marker, every token is normal input." },
    ];
    const max = Math.max(...sc.map(s => (s.t.read || 0) + (s.t.write || 0) + (s.t.normal || 0)));
    const costs = sc.map(s => P.cost(m, s.t));
    $("scenario-bars").replaceChildren(...sc.map((s, i) => barRow(s.name, s.sub, tokenSegs(s.t, costs[i]), max, usd(costs[i].total), s.note)));
    $("scenario-body").replaceChildren(...sc.map((s, i) => {
      const tr = el("tr");
      tr.append(td(s.name));
      for (const k of ["read", "write", "normal"]) tr.append(td(s.t[k] ? `${tok(s.t[k])} (${usd(costs[i][k])})` : "0"));
      tr.append(td(usd(costs[i].total), "best"));
      return tr;
    }));
  }

  // ---------- one request ----------
  function renderCalc() {
    const m = model();
    const H = num("calc-history", 0, 1000, 130) * 1000, N = num("calc-new", 0, 1000, 5) * 1000;
    const tail = num("calc-tail", 0, 1000, 0) * 1000, out = num("calc-output", 0, 128, 3) * 1000;
    const state = radio("calc-state"), ttl = radio("calc-ttl");
    const opt = { batch: $("calc-batch").checked, fast: $("calc-fast").checked, usOnly: $("calc-us").checked, ttl };
    const shape = s => s === "warm" ? { read: H, write: N, normal: tail, output: out }
      : s === "expired" ? { write: H + N, normal: tail, output: out }
      : { normal: H + N + tail, output: out };
    const t = shape(state), c = P.cost(m, t, opt);

    $("calc-total").textContent = usd(c.total);
    $("calc-label").textContent = `for this request on ${m.name}`;
    $("calc-bar").replaceChildren(c.total > 0 ? C.stack(costSegs(c, t), c.total) : el("div"));

    const rateOf = { read: c.rates.read, write: c.writeRate, normal: c.rates.input, output: c.rates.output };
    const rows = KINDS.filter(k => t[k]).map(k => {
      const tr = el("tr");
      tr.append(td(KIND[k]), td((t[k]).toLocaleString("en-US")), td(money(rateOf[k])), td(usd(c[k])));
      return tr;
    });
    const total = el("tr");
    total.append(td("Total"), td(KINDS.reduce((a, k) => a + (t[k] || 0), 0).toLocaleString("en-US")), td(""), td(usd(c.total), "best"));
    $("calc-body").replaceChildren(...rows, total);

    const notes = [];
    if (opt.fast && !m.fast) notes.push(`Fast mode isn't available on ${m.name}, so it's ignored.`);
    if (opt.fast && m.fast && opt.batch) notes.push("Fast mode can't be combined with the Batch API, so the batch discount is ignored.");
    if (c.rates.fast) notes.push("Fast mode doubles the base prices, and cache prices scale with them.");
    if (c.rates.batch) notes.push("Batch API: every part costs 50% less.");
    if (c.rates.usOnly) notes.push("US-only inference: every price is multiplied by 1.1.");
    if (c.rates.longTier) notes.push("The prompt is over 100,000 tokens, so Haiku 5.5's higher prices apply to the whole request.");
    if (state === "warm") notes.push(`If the cache had expired, this request would cost ${usd(P.cost(m, shape("expired"), opt).total)}.`);
    if (state === "expired") notes.push(`With a warm cache, this request would cost ${usd(P.cost(m, shape("warm"), opt).total)}.`);
    if (state === "none") notes.push(`With a warm cache, this request would cost ${usd(P.cost(m, shape("warm"), opt).total)}.`);
    $("calc-notes").replaceChildren(...notes.map(n => el("li", null, n)));
  }

  // ---------- cache length ----------
  function renderGap() {
    const m = model(), H = 200000, N = 10000;
    const rows = [
      { gap: "Under 5 minutes", m5: { read: H, write: N }, h1: { read: H, write: N } },
      { gap: "5 to 60 minutes", m5: { write: H + N }, h1: { read: H, write: N } },
      { gap: "Over 1 hour", m5: { write: H + N }, h1: { write: H + N } },
    ];
    $("gap-body").replaceChildren(...rows.map(r => {
      const c5 = P.cost(m, r.m5, { ttl: "5m" }).total, c1 = P.cost(m, r.h1, { ttl: "1h" }).total;
      const label = (t, c) => `${usd(c)} · ${t.read ? "still cached" : "expired, rewritten"}`;
      const tr = el("tr");
      tr.append(td(r.gap), td(label(r.m5, c5), c5 < c1 ? "best" : null), td(label(r.h1, c1), c1 < c5 ? "best" : null));
      return tr;
    }));
  }

  function renderBreakeven() {
    const m = model();
    const none = n => n * m.input, m5 = n => m.w5 + (n - 1) * m.read, h1 = n => m.w1 + (n - 1) * m.read;
    $("breakeven-body").replaceChildren(...[1, 2, 3, 5, 10].map(n => {
      const v = [none(n), m5(n), h1(n)], best = Math.min(...v);
      const tr = el("tr");
      tr.append(td(n === 1 ? "Once" : `${n} times`), ...v.map(x => td(money(+x.toFixed(4)), x === best ? "best" : null)));
      return tr;
    }));
    const first = f => { for (let n = 1; n <= 100; n++) if (f(n) < none(n)) return n; return null; };
    const a = first(m5), b = first(h1);
    $("breakeven-text").textContent = a && b
      ? `On ${m.name}, a 5-minute cache comes out ahead from the ${ordinal(a)} send and a 1-hour cache from the ${ordinal(b)}, ` +
        "as long as each send arrives before the cache expires. After that, every extra send costs only the cache-read price."
      : "";
  }

  // ---------- conversation ----------
  const breakAt = n => Math.floor(n / 2) + 1;
  const CONV = [
    { name: "Reply every 2 minutes", note: "Both caches stay warm the whole time.", gap: () => 2 },
    { name: "Reply every 20 minutes", note: "The 5-minute cache expires before every reply, so it costs more than no caching.", gap: () => 20 },
    { name: "Reply every 2 hours", note: "Both caches expire before every reply. Saving costs extra and is never read.", gap: () => 120 },
    { name: "Every 2 minutes, one 3-hour break", note: "The break forces one full rewrite, then the caches warm up again.",
      gap: (k, n) => (k === breakAt(n) ? 180 : 2), breakAt: true },
  ];

  function renderConversation() {
    const m = model();
    const start = num("conv-start", 0, 900, 20) * 1000, u = num("conv-user", 0.1, 100, 2) * 1000;
    const r = num("conv-reply", 0.1, 100, 3) * 1000, n = Math.round(num("conv-n", 2, 200, 30));
    const data = CONV.map(sc => ({
      sc,
      runs: OPTIONS.map(o => ({ o, steps: P.simulate(m, { start, add: u, out: r, n, gap: k => sc.gap(k, n) }, o.id) })),
    }));
    const yt = C.yTicks(Math.max(...data.flatMap(d => d.runs.map(x => x.steps[n - 1].cum))));

    const box = $("conv-charts");
    box.replaceChildren();
    lineCharts = lineCharts.filter(f => f.group !== "conv");
    for (const d of data) {
      const wrap = el("div");
      const vals = el("div", "mult-vals");
      for (const x of d.runs) {
        const s = el("span");
        const k = el("i", "key-line");
        k.style.background = x.o.color;
        s.append(k, el("span", null, usd(x.steps[n - 1].cum)));
        vals.append(s);
      }
      const plot = el("div", "plot");
      wrap.append(el("div", "mult-title", d.sc.name), el("div", "mult-note", d.sc.note), vals, plot);
      box.append(wrap);
      const draw = () => C.line(plot, {
        n, yt, yFormat, valueFormat: usd, height: 180,
        ariaLabel: `${d.sc.name}: running cost over ${n} messages`,
        tipTitle: k => `${d.sc.name} · message ${k}`,
        annotations: d.sc.breakAt ? [{ k: breakAt(n), label: "3-hour break" }] : [],
        series: d.runs.map(x => ({
          name: x.o.name, color: x.o.color, values: x.steps.map(s => s.cum),
          flag: k => (k > 1 && x.steps[k - 1].rewrote ? "cache expired, rewritten" : ""),
        })),
      });
      draw.group = "conv";
      lineCharts.push(draw);
      draw();
    }

    $("conv-sum-h").textContent = `Total after ${n} messages`;
    $("conv-body").replaceChildren(...data.map(d => {
      const finals = d.runs.map(x => x.steps[n - 1].cum), best = Math.min(...finals);
      const tr = el("tr");
      tr.append(td(d.sc.name), ...finals.map(v => td(usd(v), v === best ? "best" : null)));
      return tr;
    }));
    const detail = $("conv-detail");
    detail.replaceChildren();
    for (const d of data) {
      detail.append(el("h4", null, d.sc.name));
      const table = el("table"), head = el("tr"), body = el("tbody"), thead = el("thead");
      head.append(el("th", null, "Message"), ...OPTIONS.map(o => el("th", null, o.name)));
      thead.append(head);
      for (let k = 1; k <= n; k++) {
        const tr = el("tr");
        tr.append(td(String(k)), ...d.runs.map(x => td(usd(x.steps[k - 1].cum))));
        body.append(tr);
      }
      table.append(thead, body);
      const wrap = el("div", "table-wrap");
      wrap.append(table);
      detail.append(wrap);
    }
  }

  // ---------- agents ----------
  function renderAgent() {
    const m = model();
    const first = num("ag-start", 0, 900, 20) * 1000, n = Math.round(num("ag-steps", 2, 2000, 200));
    const add = num("ag-add", 0, 100, 1.5) * 1000, out = num("ag-out", 0, 64, 0.5) * 1000;
    const waits = Math.min(Math.round(num("ag-waits", 0, 500, 0)), n - 1);
    const waitSteps = new Set();
    for (let i = 1; i <= waits; i++) waitSteps.add(Math.min(n, Math.max(2, 1 + Math.round((i * n) / (waits + 1)))));
    // "Starting context" is the size of the first request.
    const p = { start: Math.max(0, first - add), add, out, n, gap: k => (waitSteps.has(k) ? 20 : 0.5) };
    const runs = OPTIONS.map(o => ({ o, sum: P.sumSteps(P.simulate(m, p, o.id)) }));
    const max = Math.max(...runs.map(x => x.sum.total));
    const subs = { "1h": "What Claude Code uses", "5m": null, none: null };
    $("agent-bars").replaceChildren(...runs.map(x => barRow(x.o.name, subs[x.o.id], costSegs(x.sum), max, usd(x.sum.total))));
    $("agent-body").replaceChildren(...runs.map(x => {
      const tr = el("tr");
      tr.append(td(x.o.name), ...KINDS.map(k => td(usd(x.sum[k]))), td(usd(x.sum.total), "best"));
      return tr;
    }));
    const finalCtx = p.start + add + (n - 1) * (add + out);
    const h1 = runs[0].sum;
    let note = `The context grows from ${tok(p.start + add)} to ${tok(finalCtx)} tokens. With the 1-hour cache, ${pct(h1.read / h1.total)} of the cost is cache reads.`;
    if (finalCtx > 1e6) note += " That's past the 1M-token context window, so a real agent would have to compact before the end.";
    $("agent-note").textContent = note;
  }

  // ---------- compaction ----------
  function renderCompaction() {
    const m = model();
    const H = num("cp-history", 1, 1000, 130) * 1000, A = num("cp-after", 1, 500, 20) * 1000;
    const S = num("cp-summary", 0, 64, 8) * 1000, n = Math.round(num("cp-n", 1, 200, 10));
    const u = num("cp-user", 0.1, 100, 2) * 1000, r = num("cp-reply", 0.1, 100, 3) * 1000;
    const warm = radio("cp-state") === "warm";
    const N = 200;
    const keep = P.simulate(m, { start: H, add: u, out: r, n: N, cachedStart: warm }, "1h").map(s => s.cum);
    const compaction = P.cost(m, warm ? { read: H, output: S } : { write: H, output: S }).total;
    const after = P.simulate(m, { start: A, add: u, out: r, n: N }, "1h").map(s => s.cum + compaction);
    const be = keep.findIndex((v, i) => after[i] <= v);

    const plot = $("cp-chart");
    lineCharts = lineCharts.filter(f => f.group !== "cp");
    const shown = Math.max(2, n);
    const draw = () => C.line(plot, {
      n: shown, yt: C.yTicks(Math.max(keep[shown - 1], after[shown - 1])), yFormat, valueFormat: usd, height: 200,
      ariaLabel: "Running cost of keeping the full history versus compacting first",
      tipTitle: k => `After ${k} message${k === 1 ? "" : "s"}`,
      series: [
        { name: "Keep the full history", color: "var(--c-keep)", values: keep.slice(0, shown) },
        { name: "Compact first", color: "var(--c-compact)", values: after.slice(0, shown) },
      ],
    });
    draw.group = "cp";
    lineCharts.push(draw);
    draw();

    let text = `Over the next ${n} message${n === 1 ? "" : "s"}, keeping the full history costs ${usd(keep[n - 1])} and compacting first costs ${usd(after[n - 1])}, ` +
      `including ${usd(compaction)} for the compaction itself. `;
    text += be === 0 ? "Compacting is cheaper from the very first message."
      : be > 0 ? `Compacting comes out ahead from message ${be + 1}.`
      : `Within ${N} messages, keeping the full history stays cheaper.`;
    $("cp-text").textContent = text;
  }

  // ---------- examples ----------
  function renderExamples() {
    const m = model();
    const chat = c => P.simulate(m, { start: 20000, add: 2000, out: 3000, n: 30, gap: () => 3 }, c).at(-1).cum;
    const agent = c => P.simulate(m, { start: 18500, add: 1500, out: 500, n: 200, gap: () => 0.5 }, c).at(-1).cum;
    const doc = 100000, q = 200, a = 500, Q = 50;
    const docPlain = Q * P.cost(m, { normal: doc + q, output: a }).total;
    const docCached = P.cost(m, { write: doc, normal: q, output: a }, { ttl: "5m" }).total +
      (Q - 1) * P.cost(m, { read: doc, normal: q, output: a }, { ttl: "5m" }).total;
    const items = 10000, inTok = 1300, outTok = 10;
    const clsPlain = items * P.cost(m, { normal: inTok, output: outTok }).total;
    const clsBatch = items * P.cost(m, { normal: inTok, output: outTok }, { batch: true }).total;
    const rows = [
      { name: "Chat: 30 messages, replying every few minutes", sub: "20k-token system prompt, 2k messages, 3k replies", plain: chat("none"), trick: chat("1h"), how: "1-hour cache" },
      { name: "Coding agent: 200 tool-call steps", sub: "Context grows from 20k to about 420k tokens", plain: agent("none"), trick: agent("1h"), how: "1-hour cache" },
      { name: "50 questions about one document", sub: "100k-token document, short questions a few minutes apart, 500-token answers", plain: docPlain, trick: docCached, how: "5-minute cache on the document" },
      { name: "Classify 10,000 short texts", sub: "1,300 tokens in and 10 out for each", plain: clsPlain, trick: clsBatch, how: "Batch API" },
    ];
    $("examples-body").replaceChildren(...rows.map(r => {
      const tr = el("tr");
      const name = el("td", "wrap");
      name.append(el("div", null, r.name), el("div", "muted", r.sub));
      const trick = el("td");
      trick.append(el("div", null, usd(r.trick)), el("div", "muted", r.how));
      tr.append(name, td(usd(r.plain)), trick, td(pct(1 - r.trick / r.plain), "best"));
      return tr;
    }));
  }

  // ---------- usage ----------
  function renderUsage() {
    const m = model();
    const u = { input_tokens: 3, cache_creation_input_tokens: 1850, cache_read_input_tokens: 142000, output_tokens: 1200 };
    $("usage-json").textContent = JSON.stringify({ usage: {
      input_tokens: u.input_tokens,
      cache_creation_input_tokens: u.cache_creation_input_tokens,
      cache_read_input_tokens: u.cache_read_input_tokens,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: u.cache_creation_input_tokens },
      output_tokens: u.output_tokens,
    } }, null, 2);
    const c = P.cost(m, { normal: u.input_tokens, write: u.cache_creation_input_tokens, read: u.cache_read_input_tokens, output: u.output_tokens });
    const prompt = u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;
    $("usage-math").textContent =
      `On ${m.name}, with prices per million tokens: 3 × ${money(c.rates.input)} + 1,850 × ${money(c.writeRate)} + ` +
      `142,000 × ${money(c.rates.read)} + 1,200 × ${money(c.rates.output)} = ${usd(c.total)}. ` +
      `The prompt was ${prompt.toLocaleString("en-US")} tokens, but only 3 were billed at the normal input price.` +
      (c.rates.longTier ? " The prompt is over 100,000 tokens, so these are Haiku 5.5's higher prices." : "");
  }

  // ---------- wiring ----------
  function renderAll() {
    renderPrices();
    renderTokens();
    renderResend();
    renderScenarios();
    renderCalc();
    renderGap();
    renderBreakeven();
    renderConversation();
    renderAgent();
    renderCompaction();
    renderExamples();
    renderUsage();
    requestAnimationFrame(() => C.fitStacks());
  }

  function on(ids, fn) {
    let raf = 0;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { fn(); C.fitStacks(); }); };
    for (const id of ids) {
      const nodes = id.startsWith("name:") ? document.querySelectorAll(`input[name="${id.slice(5)}"]`) : [$(id)];
      nodes.forEach(n => n.addEventListener("input", run));
      nodes.forEach(n => n.addEventListener("change", run));
    }
  }

  for (const id of ["checked-date", "footer-date"]) $(id).textContent = P.CHECKED;
  for (const id of ["source-link", "footer-source"]) $(id).href = P.SOURCE;
  initModelSelect();
  initToc();
  on(["tok-text"], renderTokens);
  on(["calc-history", "calc-new", "calc-tail", "calc-output", "calc-batch", "calc-fast", "calc-us", "name:calc-state", "name:calc-ttl"], renderCalc);
  on(["conv-start", "conv-user", "conv-reply", "conv-n"], renderConversation);
  on(["ag-start", "ag-steps", "ag-add", "ag-out", "ag-waits"], renderAgent);
  on(["cp-history", "cp-after", "cp-summary", "cp-n", "cp-user", "cp-reply", "name:cp-state"], renderCompaction);
  let resizeRaf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { lineCharts.forEach(f => f()); C.fitStacks(); });
  });
  renderAll();
})();
