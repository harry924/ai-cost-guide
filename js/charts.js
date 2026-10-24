/* Small chart helpers: a shared tooltip, stacked bars and a line chart with a crosshair. */
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function sv(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  // The guide's own zoom (js/boot.js). Pointer and getBoundingClientRect coordinates are zoomed;
  // chart layout and style.left/top are not, so convert by dividing by it.
  const zoom = () => window.AICG_ZOOM || 1;

  // Tooltip. Rows: { color, value, name }. Text goes in with textContent only. x, y: pointer coordinates.
  let tipEl = null;
  function showTip(title, rows, x, y) {
    if (!tipEl) {
      tipEl = el("div", "tip");
      tipEl.setAttribute("role", "tooltip");
      document.body.append(tipEl);
    }
    tipEl.replaceChildren();
    if (title) tipEl.append(el("div", "tip-title", title));
    for (const r of rows) {
      const row = el("div", "tip-row");
      const key = el("span", "tip-key");
      key.style.background = r.color;
      row.append(key, el("span", "tip-val", r.value), el("span", "tip-name", r.name));
      tipEl.append(row);
    }
    tipEl.style.display = "block";
    const b = tipEl.getBoundingClientRect();
    let left = x + 14, top = y - b.height - 12;
    if (left + b.width > window.innerWidth - 6) left = x - b.width - 14;
    if (left < 6) left = 6;
    if (top < 6) top = y + 18;
    tipEl.style.left = `${left / zoom()}px`;
    tipEl.style.top = `${top / zoom()}px`;
  }
  function hideTip() {
    if (tipEl) tipEl.style.display = "none";
  }

  // Ink for a label sitting inside a colored fill: white or near-black, whichever contrasts more.
  function relLum(rgb) {
    const c = rgb.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function inkFor(node) {
    const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!m) return "#0b0b0b";
    const L = relLum(m.slice(0, 3).map(Number));
    return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.0533) ? "#ffffff" : "#0b0b0b";
  }

  // Stacked horizontal bar. segments: { color, size, short, name, value }.
  // Width is size / max (size can be tokens or dollars). Labels only show when they fit; the tooltip and tables carry the rest.
  function stack(segments, max) {
    const track = el("div", "stack");
    for (const s of segments) {
      if (!(s.size > 0)) continue;
      const seg = el("div", "seg");
      seg.style.width = `${(s.size / max) * 100}%`;
      seg.style.background = s.color;
      seg.tabIndex = 0;
      seg.setAttribute("aria-label", window.Lang.t(`${s.name}: ${s.value}`, `${s.name}：${s.value}`));
      seg.append(el("span", "seg-label", s.short));
      const rows = [{ color: s.color, value: s.value, name: s.name }];
      seg.addEventListener("pointermove", e => showTip(null, rows, e.clientX, e.clientY));
      seg.addEventListener("pointerleave", hideTip);
      seg.addEventListener("focus", () => {
        const r = seg.getBoundingClientRect();
        showTip(null, rows, r.left + r.width / 2, r.top);
      });
      seg.addEventListener("blur", hideTip);
      track.append(seg);
    }
    return track;
  }
  function fitStacks(scope) {
    for (const seg of (scope || document).querySelectorAll(".seg")) {
      const lab = seg.firstChild;
      seg.style.color = inkFor(seg);
      lab.style.visibility = "visible";
      if (lab.offsetWidth + 4 > seg.clientWidth) lab.style.visibility = "hidden";
    }
  }

  // Axis helpers.
  function yTicks(max) {
    if (!(max > 0)) max = 1;
    const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw);
    const top = Math.ceil(max / step - 1e-9) * step, arr = [];
    for (let i = 0; i * step <= top + 1e-9; i++) arr.push(+(i * step).toFixed(8));
    return { step, top, arr };
  }
  function xTicks(n) {
    const step = [5, 10, 20, 25, 50, 100, 200, 250, 500].find(s => n / s <= 4) || 1000;
    const t = [1];
    for (let k = step; k <= n; k += step) t.push(k);
    if (n - t[t.length - 1] >= step / 2) t.push(n);
    return t;
  }

  // Line chart. o: { n, series: [{ name, color, values, flag?(k) }], yt, yFormat, tipTitle(k),
  //                  valueFormat, annotations: [{ k, label }], height, ariaLabel }
  function line(holder, o) {
    holder.replaceChildren();
    const W = Math.max(220, holder.clientWidth), H = o.height || 190;
    const m = { l: 48, r: 10, t: 12, b: 22 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = k => m.l + (o.n === 1 ? 0 : ((k - 1) / (o.n - 1)) * iw);
    const y = v => m.t + ih - (v / o.yt.top) * ih;
    const svg = sv("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, tabindex: 0, role: "img",
      "aria-label": window.Lang.t(`${o.ariaLabel}. Use the arrow keys to step through it.`, `${o.ariaLabel}。可用左右方向键逐条查看。`) });

    for (const v of o.yt.arr) {
      svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v === 0 ? "axis" : "gridline" }));
      const t = sv("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end", class: "tick" });
      t.textContent = o.yFormat(v, o.yt.step);
      svg.append(t);
    }
    for (const k of xTicks(o.n)) {
      const t = sv("text", { x: x(k), y: H - 5, "text-anchor": "middle", class: "tick" });
      t.textContent = k;
      svg.append(t);
    }
    for (const a of o.annotations || []) {
      svg.append(sv("line", { x1: x(a.k), x2: x(a.k), y1: m.t, y2: m.t + ih, class: "annot" }));
      const t = sv("text", { x: x(a.k) - 4, y: m.t + 9, "text-anchor": "end", class: "tick" });
      t.textContent = a.label;
      svg.append(t);
    }
    for (const s of [...o.series].reverse()) {
      const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join("");
      svg.append(sv("path", { d, class: "line", style: `stroke:${s.color}` }));
      const n = s.values.length;
      svg.append(sv("circle", { cx: x(n), cy: y(s.values[n - 1]), r: 4, class: "dot", style: `fill:${s.color}` }));
    }

    const cross = sv("line", { y1: m.t, y2: m.t + ih, class: "cross", visibility: "hidden" });
    const dots = o.series.map(s => sv("circle", { r: 4, class: "dot", style: `fill:${s.color}`, visibility: "hidden" }));
    svg.append(cross, ...dots, sv("rect", { x: m.l - 10, y: 0, width: iw + 20, height: H, fill: "transparent" }));

    let cur = o.n;
    const show = (k, px, py) => {
      cur = k;
      cross.setAttribute("x1", x(k));
      cross.setAttribute("x2", x(k));
      cross.setAttribute("visibility", "visible");
      o.series.forEach((s, i) => {
        dots[i].setAttribute("cx", x(k));
        dots[i].setAttribute("cy", y(s.values[k - 1]));
        dots[i].setAttribute("visibility", "visible");
      });
      showTip(o.tipTitle(k), o.series.map(s => ({
        color: s.color,
        value: o.valueFormat(s.values[k - 1]),
        name: s.name + (s.flag && s.flag(k) ? ` · ${s.flag(k)}` : ""),
      })), px, py);
    };
    const hide = () => {
      cross.setAttribute("visibility", "hidden");
      dots.forEach(d => d.setAttribute("visibility", "hidden"));
      hideTip();
    };
    const kAt = cx => {
      const r = svg.getBoundingClientRect();
      return Math.min(o.n, Math.max(1, Math.round((((cx - r.left) / zoom() - m.l) / iw) * (o.n - 1)) + 1));
    };
    const anchor = k => {
      const r = svg.getBoundingClientRect();
      return [r.left + x(k) * zoom(), r.top + m.t * zoom()];
    };
    svg.addEventListener("pointermove", e => show(kAt(e.clientX), e.clientX, e.clientY));
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("focus", () => show(cur, ...anchor(cur)));
    svg.addEventListener("blur", hide);
    svg.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const k = Math.min(o.n, Math.max(1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      show(k, ...anchor(k));
    });
    holder.append(svg);
  }

  root.Charts = { el, stack, fitStacks, line, yTicks, xTicks, showTip, hideTip };
})(window);
