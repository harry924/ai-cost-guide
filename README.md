# ai-cost-guide

An interactive guide to what AI models actually cost, in two parts.

**Live site: https://harry924.github.io/ai-cost-guide/**


- **API pricing** (`index.html`): how pay-per-token pricing works, using Claude's API prices. Pick a model at the top and every example updates.
- **Subscriptions** (`subscriptions.html`): what Claude and ChatGPT/Codex plans are worth at API prices, how their limits work, what changed in autumn 2026, and the key points from two of Theo's (t3.gg) videos on plan value and AI costs.

The API pricing page covers:

- Tokens, and why input and output have different prices
- Why every request resends the whole conversation
- Prompt caching: cache reads, cache writes and normal input, and when each applies
- 5-minute vs 1-hour caches, and when caching pays off
- How cost grows over a conversation and in long agent runs
- Compaction, and when it saves money
- Batch API, fast mode, long prompts, US-only inference and tool pricing
- Reading the `usage` numbers in an API response

The subscriptions page covers:

- How plan limits work: 5-hour windows, weekly limits, model weights and speed modes
- Claude Pro, Max 5x, Max 20x and Team; ChatGPT Free, Go, Plus, Pro $100/$200/$500 and Business
- Each plan's measured value at API prices, and value per task rather than per dollar
- A calculator for whether a plan or pay-as-you-go is cheaper for your usage
- Why plans are so heavily subsidized, and why that's starting to change
- Summaries of Theo's "Does the $200 Codex plan suck now?" and "I thought AI was gonna get cheaper?"

## Use it

Open the [live site](https://harry924.github.io/ai-cost-guide/), or open `index.html` from this folder. There's no build step and nothing to install.

Zoom with `Ctrl/⌘ +` and `Ctrl/⌘ −`, or the −/100%/+ buttons in the top bar. The guide keeps its own zoom, shared by both pages and every open tab, because Chrome saves its zoom separately for every local file and every `#section` link. `Ctrl/⌘ 0` resets both the guide's zoom and Chrome's.

## Files

| File | What it is |
|---|---|
| `index.html` | API pricing page |
| `subscriptions.html` | Subscriptions page |
| `js/pricing.js` | Claude API prices and the cost math |
| `js/app.js` | Calculators and charts on the API pricing page |
| `js/subscriptions.js` | Plan data, charts and calculator on the subscriptions page |
| `js/charts.js` | Bar charts, line charts and tooltips |
| `js/boot.js` | Applies the saved theme and zoom before the page draws, and sets the zoom-aware width classes the layout uses |
| `js/zoom.js` | The guide's own zoom: buttons and keyboard shortcuts |
| `js/theme.js` | Light and dark mode |
| `css/styles.css` | Styles |
| `tests/check.js` | Checks the cost math against worked examples |

## Keeping it current

API prices come from [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing), checked 20 October 2026. To update them, edit `MODELS` and `CHECKED` in `js/pricing.js`, then run:

```
node tests/check.js
```

Subscription values are third-party measurements (Wokey, SemiAnalysis) and Theo's own figures, as of 20 October 2026. They live at the top of `js/subscriptions.js`, and the page lists every source.

The examples are simplified models of real usage. They show how costs behave, not what a bill will be.
