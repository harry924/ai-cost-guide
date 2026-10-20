# model-cost-guide

An interactive guide to how AI model pricing works, using Claude's API prices as the example. Pick a model at the top and every example updates.

It covers:

- Tokens, and why input and output have different prices
- Why every request resends the whole conversation
- Prompt caching: cache reads, cache writes and normal input, and when each applies
- 5-minute vs 1-hour caches, and when caching pays off
- How cost grows over a conversation and in long agent runs
- Compaction, and when it saves money
- Batch API, fast mode, long prompts, US-only inference and tool pricing
- Reading the `usage` numbers in an API response

## Use it

Open `index.html` in a browser. There's no build step and nothing to install.

## Files

| File | What it is |
|---|---|
| `index.html` | The guide's text and layout |
| `js/pricing.js` | Prices for each model and the cost math |
| `js/charts.js` | Bar charts, line charts and tooltips |
| `js/app.js` | Connects the calculators and charts to the prices |
| `css/styles.css` | Styles, with light and dark themes |
| `tests/check.js` | Checks the cost math against worked examples |

## Prices

Prices come from [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing), checked 20 October 2026. To update them, edit `MODELS` and `CHECKED` in `js/pricing.js`, then run the checks:

```
node tests/check.js
```

The examples are simplified models of real usage. They show how costs behave, not what a bill will be.
