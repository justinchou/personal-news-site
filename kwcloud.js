// Keyword heat cloud: organic layout via vendored d3-cloud (BSD-3), sorted mode is pure CSS.
import CloudLayout from "./vendor/d3-cloud.js";

const root = document.documentElement;
root.classList.add("cloud-js");
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

function hashStr(t) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// One layout attempt at font scale k; returns placed words (or null if any word was dropped).
function attempt(words, W, H, k, opt) {
  const layout = new CloudLayout().size([W, H]).overflow(false).strategy("archimedean").random(mulberry32(20261115));
  const placed = [];
  const rnd = mulberry32(7);
  for (const w of words) {
    const size = Math.max(opt.minPx, Math.round(k * (1 + w.s * opt.ratio)));
    const rotate = !w.p && w.s < 0.35 && opt.rotate && hashStr(w.t) % 6 === 0 ? 90 : 0;
    const sp = layout.getSprite(w.t, { size, font: opt.family, fontWeight: w.s > 0.55 ? 700 : 500, padding: opt.pad, rotate, datum: w });
    if (!sp) return null;
    // seed near the centre so the cloud grows outward along the (aspect-stretched) spiral
    const p = layout.place(sp, { x: Math.round((rnd() - 0.5) * W * 0.12), y: Math.round((rnd() - 0.5) * H * 0.12) });
    if (!p) return null;
    placed.push(p);
  }
  return { placed, bounds: layout.bounds() };
}

function layoutPanel(panel) {
  const host = panel.querySelector("[data-cloud-organic]");
  const dataEl = panel.querySelector(".hm-data");
  if (!host || !dataEl || panel.hidden) return;
  host.style.removeProperty("height");
  if (!host.clientWidth || !host.clientHeight) return; // not displayed yet
  const W = Math.max(260, Math.round(host.clientWidth || 600));
  let H = Math.max(200, Math.round(host.clientHeight || W * 0.55));
  const key = `${W}x${H}`;
  if (host.dataset.key === key) return;
  const words = JSON.parse(dataEl.textContent || "[]").sort((a, b) => b.s - a.s || b.n - a.n);
  if (!words.length) return;
  const mobile = W < 560;
  const opt = { family: fontFamily(), minPx: mobile ? 12 : 13, ratio: mobile ? 2.6 : 3.4, pad: 1, rotate: !mobile };
  let best = null;
  let bestK = 0;
  for (let grow = 0; grow < 4 && !best; grow++) {
    // binary search the largest scale at which every word still fits
    let lo = opt.minPx * 0.98;
    let hi = Math.min(W, H) / (1 + opt.ratio) * 0.9;
    const floor = attempt(words, W, H, lo, opt);
    if (!floor) { H = Math.round(H * 1.25); continue; } // never drop words: give the cloud more room
    best = floor; bestK = lo;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      const r = attempt(words, W, H, mid, opt);
      if (r) { best = r; bestK = mid; lo = mid; } else { hi = mid; }
      if (hi - lo < 0.15) break;
    }
  }
  if (!best) { root.classList.remove("cloud-js"); return; } // fall back to the sorted (CSS) cloud
  if (H > Math.round(host.clientHeight) + 1) host.style.height = `${H}px`;
  const colors = catColors();
  const svg = document.createElementNS(NS, "svg");
  const b = best.bounds;
  const m = 4;
  let fill = 0;
  if (b) {
    const [min, max] = b;
    const bw = max.x - min.x, bh = max.y - min.y;
    fill = (bw * bh) / (W * H);
    svg.setAttribute("viewBox", `${min.x - m} ${min.y - m} ${bw + 2 * m} ${bh + 2 * m}`);
  } else {
    svg.setAttribute("viewBox", `${-W / 2} ${-H / 2} ${W} ${H}`);
  }
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "list");
  for (const p of best.placed) {
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
    text.setAttribute("font-weight", p.weight ?? 500);
    text.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${p.rotate || 0})`);
    text.setAttribute("fill", colors[w.g]);
    text.style.setProperty("--o", (0.6 + 0.4 * w.s).toFixed(2));
    text.textContent = w.t;
    a.append(text);
    if (w.p && !p.rotate) {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "pri");
      dot.setAttribute("r", Math.max(2, p.size * 0.1));
      dot.setAttribute("cx", p.x + (p.x1 ?? p.size) + 1);
      dot.setAttribute("cy", p.y + (p.y0 ?? -p.size * 0.7) + 3);
      a.append(dot);
    }
    svg.append(a);
  }
  host.replaceChildren(svg);
  Object.assign(host.dataset, { key: `${W}x${Math.round(host.clientHeight)}`, fill: fill.toFixed(2), placed: `${best.placed.length}/${words.length}`, scale: bestK.toFixed(1) });
  host.classList.add("is-ready");
  panel.classList.add("has-organic");
}

// sorted mode: scale chip fonts so the CSS flex cloud fills the same height as the organic one
function fitSorted(panel) {
  const box = panel.querySelector("[data-cloud-sorted]");
  if (!box || panel.hidden || window.innerWidth < 560) { if (box) { box.classList.remove("is-fit"); box.style.removeProperty("--k"); } return; }
  box.classList.add("is-fit");
  const fits = (k) => { box.style.setProperty("--k", k); return box.scrollHeight <= box.clientHeight + 1; };
  let lo = 0.7, hi = 1.7;
  if (!fits(lo)) { box.classList.remove("is-fit"); box.style.setProperty("--k", 1); return; }
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  box.style.setProperty("--k", (lo * 0.97).toFixed(3));
}

function layoutAll() {
  if (root.dataset.cloudMode !== "organic") {
    document.querySelectorAll(".hm-panel").forEach((p) => { try { fitSorted(p); } catch (e) { /* ignore */ } });
    return;
  }
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
