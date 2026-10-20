// Checks the cost math against numbers worked out by hand. Run: node tests/check.js
const P = require("../js/pricing.js");

let failed = 0;
function near(actual, expected, label, tol = 0.006) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${actual.toFixed(4)} (expected ${expected})`);
}

const opus = P.byId("opus-5-5");

// One message: 200k history + 10k new, Opus 5.5, 1-hour cache.
near(P.cost(opus, { read: 200000, write: 10000 }).total, 0.12, "warm cache");
near(P.cost(opus, { write: 210000 }).total, 1.68, "expired cache");
near(P.cost(opus, { normal: 210000 }).total, 0.84, "no caching");
near(P.cost(opus, { write: 210000 }, { ttl: "5m" }).total, 1.05, "expired cache, 5-minute write");

// Chat: 20k start, 2k messages, 3k replies, 30 messages.
const chat = (gap, caching) =>
  P.simulate(opus, { start: 20000, add: 2000, out: 3000, n: 30, gap: () => gap }, caching).at(-1).cum;
near(chat(2, "1h"), 3.67, "chat every 2 min, 1-hour cache");
near(chat(2, "5m"), 3.17, "chat every 2 min, 5-minute cache");
near(chat(2, "none"), 13.14, "chat, no caching");
near(chat(20, "5m"), 15.975, "chat every 20 min, 5-minute cache");
near(chat(120, "1h"), 24.48, "chat every 2 hours, 1-hour cache");

// Agent: 200 steps, context starts at 20k and grows 2k a step (0.5k of it output).
const agent = caching =>
  P.simulate(opus, { start: 18500, add: 1500, out: 500, n: 200, gap: () => 0.5 }, caching).at(-1).cum;
near(agent("1h"), 14.02, "agent, 1-hour cache");
near(agent("5m"), 12.77, "agent, 5-minute cache");
near(agent("none"), 177.2, "agent, no caching");

// Warm start reads the old context and writes only the new part.
const warm = P.simulate(opus, { start: 100000, add: 5000, out: 10000, n: 1, cachedStart: true }, "1h")[0];
near(warm.cost.read + warm.cost.write, 0.06, "warm first request: 100k read + 5k write");

// Modifiers.
near(P.rates(opus, { fast: true }).w1, 16, "fast mode 1-hour write rate");
near(P.rates(opus, { fast: true }).read, 0.4, "fast mode read rate");
near(P.rates(opus, { batch: true }).input, 2, "batch input rate");
near(P.rates(opus, { fast: true, batch: true }).input, 8, "fast mode ignores batch");
near(P.rates(opus, { usOnly: true }).output, 22, "US-only output rate");

// Haiku 5.5 charges its higher tier for prompts over 100k tokens, cached parts included.
const haiku = P.byId("haiku-5-5");
near(P.cost(haiku, { normal: 100000 }).total, 0.01, "Haiku 5.5 at 100k");
near(P.cost(haiku, { read: 120000, normal: 1000 }).total, 0.0065, "Haiku 5.5 over 100k", 0.00001);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
