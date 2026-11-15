// Keyword heat cloud: organic layout via vendored d3-cloud (BSD-3), sorted mode is pure CSS.
import CloudLayout from "./vendor/d3-cloud.js";

const root = document.documentElement;
const KEY = "pn-cloud";
const NS = "http://www.w3.org/2000/svg";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fontFamily() {
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

function catColors() {
  const cs = getComputedStyle(root);
  return Array.from({ length: 10 }, (_, i) => cs.getPropertyValue(`--kc${i}`).trim() || "#e8945a");
}

function layoutPanel(panel) {
  const host = panel.querySelector("[data-cloud-organic]");
  const dataEl = panel.querySelector(".hm-data");
  if (!host || !dataEl || panel.hidden) return;
  const width = Math.max(260, Math.round(host.clientWidth || panel.clientWidth || 600));
  if (host.dataset.w === String(width)) return;
  const words = JSON.parse(dataEl.textContent || "[]");
  if (!words.length) return;
  const mobile = width < 560;
  const compact = !!panel.closest(".heat-compact");
  const height = Math.round(width * (mobile ? 0.95 : compact ? 0.42 : 0.5));
  const minPx = mobile ? 13 : 13;
  let maxPx = Math.min(mobile ? 34 : 60, Math.max(22, width / (mobile ? 7 : 11)));
  const family = fontFamily();
  const colors = catColors();
  let placed = [];
  let layout;
  for (let attempt = 0; attempt < 4; attempt++) {
    layout = new CloudLayout().size([width, height]).overflow(false).random(mulberry32(20261115));
    const sprites = words
      .map((w) => layout.getSprite(w.t, {
        size: Math.round(minPx + (maxPx - minPx) * w.s),
        font: family, fontWeight: w.s > 0.55 ? 700 : 500, padding: mobile ? 2 : 3, rotate: 0, datum: w,
      }))
      .filter(Boolean);
    placed = [];
    for (const sp of sprites) { const p = layout.place(sp); if (p) placed.push(p); }
    if (placed.length >= words.length) break;
    maxPx *= 0.82; // shrink and retry until every word fits
  }
  const svg = document.createElementNS(NS, "svg");
  const b = layout.bounds();
  const m = 6;
  if (b) {
    const [min, max] = b;
    svg.setAttribute("viewBox", `${min.x - m} ${min.y - m} ${max.x - min.x + 2 * m} ${max.y - min.y + 2 * m}`);
  } else {
    svg.setAttribute("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`);
  }
  svg.setAttribute("role", "list");
  for (const p of placed) {
    const w = p.datum;
    const a = document.createElementNS(NS, "a");
    a.setAttribute("href", w.h);
    a.setAttribute("class", `hc c${w.g}${w.p ? " is-pri" : ""}`);
    a.setAttribute("role", "listitem");
    a.setAttribute("aria-label", `${w.th}，${w.tm}`);
    Object.assign(a.dataset, { tipH: w.th, tipM: w.tm, tipD: w.td });
    const text = document.createElementNS(NS, "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-family", p.font);
    text.setAttribute("font-size", p.size);
    text.setAttribute("font-weight", p.fontWeight ?? p.weight ?? 500);
    text.setAttribute("transform", `translate(${p.x},${p.y})`);
    text.setAttribute("fill", colors[w.g]);
    text.style.setProperty("--o", (0.55 + 0.45 * w.s).toFixed(2));
    text.textContent = w.t;
    a.append(text);
    if (w.p) {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "pri");
      dot.setAttribute("r", Math.max(2, p.size * 0.11));
      dot.setAttribute("cx", p.x + (p.x1 ?? p.size) + 1);
      dot.setAttribute("cy", p.y + (p.y0 ?? -p.size * 0.7) + 3);
      a.append(dot);
    }
    svg.append(a);
  }
  host.replaceChildren(svg);
  host.dataset.w = String(width);
  host.classList.add("is-ready");
  panel.classList.add("has-organic");
}

function layoutAll() {
  if (root.dataset.cloudMode !== "organic") return;
  document.querySelectorAll(".hm-panel").forEach((p) => {
    try { layoutPanel(p); } catch (e) { console.warn("cloud layout failed", e); }
  });
}

function setMode(mode) {
  root.dataset.cloudMode = mode;
  try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
  document.querySelectorAll("[data-cloud-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cloudSet === mode)));
  layoutAll();
}

// tooltip shared by both modes
function initTips() {
  document.querySelectorAll("#keyword-heat").forEach((sec) => {
    const tip = sec.querySelector(".hm-tip");
    if (!tip) return;
    const show = (el) => {
      const d = el.dataset;
      if (!d.tipH) return;
      tip.innerHTML = "";
      const h = document.createElement("b"); h.textContent = d.tipH;
      const mm = document.createElement("span"); mm.textContent = d.tipM;
      tip.append(h, mm);
      if (d.tipD) { const p = document.createElement("p"); p.textContent = d.tipD; tip.append(p); }
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const sr = sec.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let left = r.left - sr.left + r.width / 2 - tw / 2;
      left = Math.max(4, Math.min(left, sr.width - tw - 4));
      let top = r.top - sr.top - tip.offsetHeight - 8;
      if (top < 0) top = r.bottom - sr.top + 8;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    const target = (e) => e.target.closest && e.target.closest("[data-tip-h]");
    sec.addEventListener("mouseover", (e) => { const el = target(e); if (el) show(el); });
    sec.addEventListener("mouseout", (e) => { const el = target(e); if (el && !el.contains(e.relatedTarget)) tip.hidden = true; });
    sec.addEventListener("focusin", (e) => { const el = target(e); if (el) show(el); });
    sec.addEventListener("focusout", () => { tip.hidden = true; });
  });
}

document.querySelectorAll("[data-cloud-set]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.cloudSet)));
document.querySelectorAll("#keyword-heat [data-tab]").forEach((b) => b.addEventListener("click", () => requestAnimationFrame(layoutAll)));
initTips();
const start = () => setMode(root.dataset.cloudMode === "sorted" ? "sorted" : "organic");
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
let rt;
window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layoutAll, 200); });
