/* Claude API prices and the cost math used by every widget.
   Prices are USD per million tokens, from Anthropic's pricing page. */
(function (root) {
  "use strict";

  const CHECKED = "20 October 2026";
  const SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

  // w5 / w1 = 5-minute / 1-hour cache write. read = cache hit. long = Haiku 5.5's higher
  // prices, which apply to a whole request once its prompt is over 100,000 tokens.
  const MODELS = [
    { id: "fable-5-1", name: "Claude Fable 5.1", input: 10, w5: 12.5, w1: 20, read: 0.25, output: 50 },
    { id: "fable-5", name: "Claude Fable 5", input: 10, w5: 12.5, w1: 20, read: 1, output: 50 },
    { id: "opus-5-5", name: "Claude Opus 5.5", input: 4, w5: 5, w1: 8, read: 0.2, output: 20,
      fast: { input: 8, output: 40 } },
    { id: "opus-5", name: "Claude Opus 5", input: 5, w5: 6.25, w1: 10, read: 0.5, output: 25,
      fast: { input: 10, output: 50 } },
    { id: "opus-4-8", name: "Claude Opus 4.8", input: 5, w5: 6.25, w1: 10, read: 0.5, output: 25,
      fast: { input: 10, output: 50 } },
    { id: "sonnet-5-5", name: "Claude Sonnet 5.5", input: 2, w5: 2.5, w1: 4, read: 0.1, output: 10 },
    { id: "sonnet-5", name: "Claude Sonnet 5", input: 2, w5: 2.5, w1: 4, read: 0.2, output: 10 },
    { id: "sonnet-4-6", name: "Claude Sonnet 4.6", input: 3, w5: 3.75, w1: 6, read: 0.3, output: 15 },
    { id: "haiku-5-5", name: "Claude Haiku 5.5", input: 0.1, w5: 0.125, w1: 0.2, read: 0.01, output: 0.5,
      long: { over: 100000, input: 0.5, w5: 0.625, w1: 1, read: 0.05, output: 2.5 } },
    { id: "haiku-4-5", name: "Claude Haiku 4.5", input: 1, w5: 1.25, w1: 2, read: 0.1, output: 5 },
  ];

  const byId = id => MODELS.find(m => m.id === id);

  // Per-million rates for one request after every modifier.
  // opt: { fast, batch, usOnly }. promptTokens picks Haiku 5.5's price tier.
  function rates(model, opt, promptTokens) {
    opt = opt || {};
    const longTier = !!(model.long && promptTokens > model.long.over);
    const tier = longTier ? model.long : model;
    const fast = !!(opt.fast && model.fast);
    let r = { input: tier.input, w5: tier.w5, w1: tier.w1, read: tier.read, output: tier.output };
    if (fast) {
      // Cache multipliers apply on top of fast-mode prices.
      const f = model.fast.input;
      r = { input: f, w5: f * 1.25, w1: f * 2, read: f * (tier.read / tier.input), output: model.fast.output };
    }
    const batch = !!(opt.batch && !fast); // Fast mode isn't available with the Batch API.
    let mult = 1;
    if (batch) mult *= 0.5;
    if (opt.usOnly) mult *= 1.1;
    for (const k of Object.keys(r)) r[k] *= mult;
    return Object.assign(r, { fast, batch, usOnly: !!opt.usOnly, longTier });
  }

  // Cost of one request. t: { read, write, normal, output } in tokens.
  // opt.ttl: "5m" or "1h" (default) decides the cache-write price.
  function cost(model, t, opt) {
    opt = opt || {};
    const read = t.read || 0, write = t.write || 0, normal = t.normal || 0, output = t.output || 0;
    const r = rates(model, opt, read + write + normal);
    const writeRate = opt.ttl === "5m" ? r.w5 : r.w1;
    const c = {
      read: (read * r.read) / 1e6,
      write: (write * writeRate) / 1e6,
      normal: (normal * r.input) / 1e6,
      output: (output * r.output) / 1e6,
    };
    c.total = c.read + c.write + c.normal + c.output;
    c.rates = r;
    c.writeRate = writeRate;
    return c;
  }

  // A run of requests that each resend the whole context: a chat or an agent loop.
  // p: { start, add, out, n, gap(k), cachedStart }
  //   start: tokens already in the context before request 1
  //   add:   new input each request (your message, or a tool result)
  //   out:   output each request; it stays in the context for the next request
  //   gap(k): minutes between request k-1 and request k
  //   cachedStart: request 1 finds `start` still cached
  // caching: "1h", "5m" or "none".
  function simulate(model, p, caching, opt) {
    const ttl = caching === "5m" ? 5 : caching === "1h" ? 60 : 0;
    const gap = p.gap || (() => 1);
    const o = Object.assign({}, opt, { ttl: caching === "5m" ? "5m" : "1h" });
    const steps = [];
    let cum = 0, prev = 0;
    for (let k = 1; k <= p.n; k++) {
      const inp = p.start + p.add + (k - 1) * (p.add + p.out);
      let t;
      if (!ttl) t = { normal: inp };
      else if (k === 1 && p.cachedStart) t = { read: p.start, write: inp - p.start };
      else if (k > 1 && gap(k) < ttl) t = { read: prev, write: inp - prev };
      else t = { write: inp };
      t.output = p.out;
      const c = cost(model, t, o);
      cum += c.total;
      steps.push({ k, input: inp, tokens: t, cost: c, cum, rewrote: !!ttl && !t.read });
      prev = inp;
    }
    return steps;
  }

  function sumSteps(steps) {
    const s = { read: 0, write: 0, normal: 0, output: 0, total: 0 };
    for (const st of steps) for (const k of Object.keys(s)) s[k] += st.cost[k];
    return s;
  }

  const api = { CHECKED, SOURCE, MODELS, DEFAULT_MODEL: "opus-5-5", byId, rates, cost, simulate, sumSteps };
  root.Pricing = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
