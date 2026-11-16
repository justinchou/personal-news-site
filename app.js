(() => {
  const root = document.documentElement;
  root.classList.add("js");
  try { const t = localStorage.getItem("pn-theme"); if (t) root.setAttribute("data-theme", t); } catch (e) {}
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("pn-theme", next); } catch (e) {}
    });
  });

  // language toggle for scraped news (中文 / 原文)
  const setLang = (mode) => {
    root.setAttribute("data-lang-mode", mode);
    document.querySelectorAll("[data-lang-set]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.langSet === mode ? "true" : "false"));
    document.querySelectorAll("[data-lang-toggle]").forEach((b) => {
      const t = mode === "orig" ? "当前：原文，点击切换为中文" : "当前：中文，点击切换为原文";
      b.setAttribute("aria-label", t); b.setAttribute("title", t);
    });
  };
  setLang(root.getAttribute("data-lang-mode") === "orig" ? "orig" : "zh");
  document.querySelectorAll("[data-lang-toggle]").forEach((b) => b.addEventListener("click", () => {
    const next = root.getAttribute("data-lang-mode") === "orig" ? "zh" : "orig";
    setLang(next);
    try { localStorage.setItem("pn-lang", next); } catch (e) {}
  }));
  document.querySelectorAll("[data-lang-set]").forEach((b) => b.addEventListener("click", () => {
    setLang(b.dataset.langSet);
    try { localStorage.setItem("pn-lang", b.dataset.langSet); } catch (e) {}
  }));

  // date picker navigation (change tracker history)
  document.querySelectorAll("[data-nav-select]").forEach((sel) => sel.addEventListener("change", () => { if (sel.value) location.href = sel.value; }));

  // keep the active nav item visible on narrow screens
  document.querySelectorAll(".nav a.is-active, .subnav a.is-active").forEach((a) => {
    a.scrollIntoView({ block: "nearest", inline: "center" });
  });

  // product filters
  const grid = document.querySelector("[data-product-grid]");
  if (grid) {
    const cards = [...grid.querySelectorAll("[data-product]")];
    const blocks = [...grid.querySelectorAll("[data-cat-block]")];
    const count = document.querySelector("[data-filter-count]");
    const val = (sel) => ((document.querySelector(sel) || {}).value || "");
    const apply = () => {
      const country = val("[data-filter-country]");
      const oss = val("[data-filter-oss]");
      const q = val("[data-filter-q]").trim().toLowerCase();
      let n = 0;
      cards.forEach((card) => {
        const ok = (!country || card.dataset.country === country) && (!oss || card.dataset.oss === oss) &&
          (!q || (card.dataset.name || "").toLowerCase().includes(q));
        card.classList.toggle("hidden", !ok);
        if (ok) n++;
      });
      blocks.forEach((b) => { b.hidden = !b.querySelector("[data-product]:not(.hidden)"); });
      if (count) count.textContent = `${n} 个产品`;
    };
    document.querySelectorAll("[data-filter-country],[data-filter-oss],[data-filter-q]").forEach((el) => {
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });
  }

  // keyword search + category chips
  const kwQ = document.querySelector("[data-kw-q]");
  if (kwQ) {
    const kws = [...document.querySelectorAll("[data-kw]")];
    const secs = [...document.querySelectorAll("[data-kw-sec]")];
    const chips = [...document.querySelectorAll("[data-kw-cat]")];
    const count = document.querySelector("[data-kw-count]");
    const empty = document.querySelector("[data-kw-empty]");
    const map = document.querySelector(".kw-map");
    const heat = document.querySelector("#keyword-heat");
    let cat = "";
    const apply = () => {
      const q = kwQ.value.trim().toLowerCase();
      let n = 0;
      kws.forEach((el) => {
        const okCat = !cat || (cat === "added" ? el.hasAttribute("data-kw-added") : el.dataset.kwGroup === cat);
        const ok = okCat && (!q || el.dataset.search.includes(q));
        el.hidden = !ok;
        if (ok) n++;
      });
      secs.forEach((s) => { s.hidden = !s.querySelector("[data-kw]:not([hidden])"); });
      if (map) map.hidden = !!(q || cat);
      if (heat) heat.hidden = !!(q || cat);
      if (empty) empty.hidden = n > 0;
      if (count) count.textContent = q || cat ? `匹配 ${n} 个` : `共 ${kws.length} 个术语`;
    };
    chips.forEach((c) => c.addEventListener("click", () => {
      cat = c.dataset.kwCat;
      chips.forEach((x) => x.setAttribute("aria-pressed", x === c ? "true" : "false"));
      apply();
    }));
    kwQ.addEventListener("input", apply);
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== kwQ) { e.preventDefault(); kwQ.focus(); }
    });
    apply();
  }

  // tabs (X feed)
  document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll("button[data-tab]")];
    const panels = [...document.querySelectorAll(tabs.dataset.tabs)];
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
        panels.forEach((p) => { p.hidden = p.id !== btn.dataset.tab; });
      });
    });
  });

  // coding stepper: click / hover-intent / arrow keys / hash
  document.querySelectorAll("[data-stepper]").forEach((stepper) => {
    const steps = [...stepper.querySelectorAll("[data-stage]")];
    const panels = [...document.querySelectorAll("[data-stage-panel]")];
    const select = (n, focus) => {
      steps.forEach((s) => {
        const on = s.dataset.stage === String(n);
        s.setAttribute("aria-selected", on ? "true" : "false");
        s.tabIndex = on ? 0 : -1;
        if (on) {
          if (focus) s.focus();
          s.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        }
      });
      panels.forEach((p) => {
        if (p.dataset.stagePanel === String(n)) p.removeAttribute("data-inactive");
        else p.setAttribute("data-inactive", "");
      });
      history.replaceState(null, "", `#stage-${n}`);
    };
    steps.forEach((s, i) => {
      s.addEventListener("click", () => select(s.dataset.stage));
      s.addEventListener("keydown", (e) => {
        let j = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % steps.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + steps.length) % steps.length;
        if (e.key === "Home") j = 0;
        if (e.key === "End") j = steps.length - 1;
        if (j !== null) { e.preventDefault(); select(steps[j].dataset.stage, true); }
      });
    });
    const m = location.hash.match(/^#stage-(\d+)$/);
    if (m && steps.some((s) => s.dataset.stage === m[1])) select(m[1]);
  });

  // nav dropdowns (disclosure pattern): click / Enter / Space toggles, Escape and outside click close
  const groups = [...document.querySelectorAll("[data-nav-group]")];
  const closeAll = (except) => groups.forEach((g) => {
    if (g === except) return;
    g.classList.remove("is-open");
    const b = g.querySelector(".nav-group-btn");
    if (b) b.setAttribute("aria-expanded", "false");
  });
  groups.forEach((g) => {
    const btn = g.querySelector(".nav-group-btn");
    const links = [...g.querySelectorAll(".nav-menu a")];
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !g.classList.contains("is-open");
      closeAll(g);
      g.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && links.length) {
        e.preventDefault();
        e.stopPropagation();
        g.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        links[0].focus();
      }
    });
    g.addEventListener("keydown", (e) => {
      const i = links.indexOf(document.activeElement);
      if (e.key === "Escape") { closeAll(); btn.focus(); }
      else if (i >= 0 && e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      else if (i >= 0 && e.key === "ArrowUp") { e.preventDefault(); (i === 0 ? btn : links[i - 1]).focus(); }
    });
    g.addEventListener("focusout", (e) => { if (!g.contains(e.relatedTarget)) { g.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("[data-nav-group]")) closeAll(); });

  // archive tabs: 日报 / 周报 / 月报 (#daily / #weekly / #monthly)
  const archTabs = document.querySelector("[data-arch-tabs]");
  if (archTabs) {
    const tabs = [...archTabs.querySelectorAll("[data-arch-tab]")];
    const show = (id, push) => {
      if (!tabs.some((t) => t.dataset.archTab === id)) id = "daily";
      tabs.forEach((t) => { const on = t.dataset.archTab === id; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
      document.querySelectorAll(".arch-panel").forEach((p) => { p.hidden = p.id !== id; });
      if (push) history.replaceState(null, "", "#" + id);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", (e) => { e.preventDefault(); show(t.dataset.archTab, true); });
      t.addEventListener("keydown", (e) => {
        const j = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : null;
        if (j !== null) { e.preventDefault(); tabs[j].focus(); show(tabs[j].dataset.archTab, true); }
      });
    });
    show(location.hash.slice(1), false);
    window.addEventListener("hashchange", () => show(location.hash.slice(1), false));
  }

  // Beijing-time today / this week highlight for calendar blocks
  const bjDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  if (document.querySelector("[data-day],[data-wk]")) {
    const today = bjDate(new Date());
    const t = new Date(today + "T00:00:00Z");
    const mon = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
    document.querySelectorAll("[data-day]").forEach((el) => { el.classList.toggle("is-today", el.dataset.day === today); el.classList.toggle("is-past", el.dataset.day < today); });
    document.querySelectorAll("[data-wk]").forEach((el) => el.classList.toggle("is-this-week", el.dataset.wk === mon));
  }

  // macro calendar: views + filters
  const calBar = document.querySelector("[data-cal-toolbar]");
  if (calBar) {
    const state = { c: "", cat: "", imp: "" };
    const views = [...calBar.querySelectorAll("[data-cal-view]")];
    const evs = [...document.querySelectorAll("[data-cal-ev]")];
    const count = calBar.querySelector("[data-cal-count]");
    const rank = { high: 0, med: 1, low: 2 };
    const apply = () => {
      let n = 0;
      const seen = new Set();
      evs.forEach((el) => {
        const ok = (!state.c || el.dataset.c === state.c) && (!state.cat || el.dataset.cat === state.cat) && (!state.imp || rank[el.dataset.imp] <= rank[state.imp]);
        el.hidden = !ok;
        if (ok && el.closest('[data-view="list"]')) n++;
      });
      document.querySelectorAll('[data-view="list"] .cal-day').forEach((d) => { d.hidden = !d.querySelector("[data-cal-ev]:not([hidden])"); });
      document.querySelectorAll('[data-view="list"] .cal-week').forEach((w) => { w.hidden = !w.querySelector(".cal-day:not([hidden])"); });
      if (count) count.textContent = `${n} 项`;
    };
    calBar.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
      state[b.dataset.f] = b.dataset.v;
      calBar.querySelectorAll(`[data-f="${b.dataset.f}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      apply();
    }));
    const setView = (v) => {
      views.forEach((b) => b.setAttribute("aria-selected", b.dataset.calView === v ? "true" : "false"));
      document.querySelectorAll(".cal-view").forEach((p) => { p.hidden = p.dataset.view !== v; });
      try { localStorage.setItem("pn-cal-view", v); } catch (e) {}
    };
    views.forEach((b) => b.addEventListener("click", () => setView(b.dataset.calView)));
    let v0 = (location.hash.match(/^#view-(list|week|month)$/) || [])[1];
    try { v0 = v0 || localStorage.getItem("pn-cal-view"); } catch (e) {}
    if (v0 && views.some((b) => b.dataset.calView === v0)) setView(v0);
    apply();
    // #day-YYYY-MM-DD (from the home mini calendar): open the list view at that day
    const dm = location.hash.match(/^#day-(\d{4}-\d{2}-\d{2})$/);
    if (dm) {
      let el = document.querySelector(`[data-view="list"] .cal-day[data-day="${dm[1]}"]`);
      if (el) setView("list"); else { setView("month"); el = document.querySelector(`[data-view="month"] [data-day="${dm[1]}"]`); }
      if (el) { el.classList.add("is-target"); setTimeout(() => el.scrollIntoView({ block: "start" }), 50); }
    }
  }

  // indicator detail chart: range (1Y/5Y/10Y/全部) × series toggle, plain SVG
  document.querySelectorAll("[data-ind-chart]").forEach((wrap) => {
    const box = wrap.querySelector("[data-chart-canvas]");
    let data;
    try { data = JSON.parse(wrap.querySelector("[data-chart-data]").textContent); } catch (e) { return; }
    // initial state follows the buttons marked aria-pressed (fallback: 5Y / headline / first series)
    const pr = wrap.querySelector("[data-range][aria-pressed='true']"), ps = wrap.querySelector("[data-series][aria-pressed='true']");
    const state = { range: pr ? pr.dataset.range : "5", series: ps ? ps.dataset.series : (data.series.headline ? "headline" : Object.keys(data.series)[0]) };
    const toDate = (s) => { if (/^\d{4}$/.test(s)) return new Date(+s, 11, 31); const q = s.match(/^(\d{4})-Q(\d)$/); if (q) return new Date(+q[1], q[2] * 3 - 3, 1); return new Date(s.length === 7 ? s + "-01" : s); };
    const fmt = (v) => Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
    const draw = () => {
      const all = (data.series[state.series] || []).map(([d, v]) => [toDate(d), v, d]);
      if (!all.length) { box.innerHTML = "<p class='note'>暂无数据</p>"; return; }
      const end = all[all.length - 1][0];
      const pts = state.range === "max" ? all : all.filter((p) => p[0] >= new Date(end.getFullYear() - +state.range, end.getMonth(), end.getDate()));
      const W = box.clientWidth || 800, H = 300, L = 54, R = 14, T = 14, B = 28;
      const isLog = !!((data.log || {})[state.series]) && pts.every((p) => p[1] > 0);
      const tf = (v) => isLog ? Math.log10(v) : v, inv = (v) => isLog ? Math.pow(10, v) : v;
      let lo = Math.min(...pts.map((p) => tf(p[1]))), hi = Math.max(...pts.map((p) => tf(p[1])));
      const bands = (data.bands || {})[state.series] || [];
      bands.forEach(([bv]) => { if (bv > 0 || !isLog) { lo = Math.min(lo, tf(bv)); hi = Math.max(hi, tf(bv)); } });
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
      const t0 = pts[0][0].getTime(), t1 = Math.max(pts[pts.length - 1][0].getTime(), t0 + 1);
      const x = (t) => L + (t - t0) / (t1 - t0) * (W - L - R);
      const y = (v) => T + (hi - tf(v)) / (hi - lo) * (H - T - B);
      const path = pts.map((p, i) => (i ? "L" : "M") + x(p[0].getTime()).toFixed(1) + "," + y(p[1]).toFixed(1)).join("");
      let grid = "";
      for (let k = 0; k <= 4; k++) { const v = inv(lo + (hi - lo) * k / 4); grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
      bands.forEach(([bv, bl]) => { grid += `<line class="band" x1="${L}" x2="${W - R}" y1="${y(bv)}" y2="${y(bv)}"/><text class="band-t" x="${W - R - 4}" y="${y(bv) - 4}" text-anchor="end">${bl}</text>`; });
      const y0 = pts[0][0].getFullYear(), y1 = pts[pts.length - 1][0].getFullYear();
      const stepY = Math.max(1, Math.ceil((y1 - y0 + 1) / 8));
      let xl = "";
      if (y1 - y0 >= 1) { for (let yr = y0 + 1; yr <= y1; yr += stepY) { const t = new Date(yr, 0, 1).getTime(); if (t >= t0) xl += `<text x="${x(t)}" y="${H - 8}" text-anchor="middle">${yr}</text><line class="vx" x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${H - B}"/>`; } }
      else { xl = `<text x="${L}" y="${H - 8}">${pts[0][2]}</text><text x="${W - R}" y="${H - 8}" text-anchor="end">${pts[pts.length - 1][2]}</text>`; }
      const zero = !isLog && lo < 0 && hi > 0 ? `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>` : "";
      const unit = (data.units || {})[state.series] || "";
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><g class="grid">${grid}${xl}</g>${zero}<path class="line" d="${path}"/><g class="hover" visibility="hidden"><line class="hx" y1="${T}" y2="${H - B}"/><circle r="4"/><text class="ht" y="${T + 12}"></text></g><rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
      const svg = box.querySelector("svg"), hov = svg.querySelector(".hover"), hit = svg.querySelector(".hit");
      const move = (ev) => {
        const r = svg.getBoundingClientRect(); const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        const t = t0 + (px * W / r.width - L) / (W - L - R) * (t1 - t0);
        let best = 0; pts.forEach((p, i) => { if (Math.abs(p[0] - t) < Math.abs(pts[best][0] - t)) best = i; });
        const p = pts[best], cx = x(p[0].getTime()), cy = y(p[1]);
        hov.setAttribute("visibility", "visible");
        hov.querySelector("line").setAttribute("x1", cx); hov.querySelector("line").setAttribute("x2", cx);
        hov.querySelector("circle").setAttribute("cx", cx); hov.querySelector("circle").setAttribute("cy", cy);
        const tx = hov.querySelector("text"); tx.textContent = `${p[2]}  ${fmt(p[1])} ${unit}`;
        tx.setAttribute("x", cx > W / 2 ? cx - 8 : cx + 8); tx.setAttribute("text-anchor", cx > W / 2 ? "end" : "start");
      };
      hit.addEventListener("mousemove", move); hit.addEventListener("touchmove", move, { passive: true });
      hit.addEventListener("mouseleave", () => hov.setAttribute("visibility", "hidden"));
    };
    wrap.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
      state.range = b.dataset.range; wrap.querySelectorAll("[data-range]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); draw();
    }));
    wrap.querySelectorAll("[data-series]").forEach((b) => b.addEventListener("click", () => {
      state.series = b.dataset.series; wrap.querySelectorAll("[data-series]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); draw();
    }));
    draw();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(draw, 150); });
  });

  // cross-economy comparison chart: one indicator, many economies
  document.querySelectorAll("[data-cmp-chart]").forEach((wrap) => {
    const box = wrap.querySelector("[data-chart-canvas]");
    let data;
    try { data = JSON.parse(wrap.querySelector("[data-chart-data]").textContent); } catch (e) { return; }
    const COLORS = ["#5b9cff", "#ff6b6b", "#ffd166", "#06d6a0", "#c77dff", "#f78c40", "#4cc9f0", "#a3be8c", "#e5989b"];
    wrap.querySelectorAll(".cmp-key i").forEach((i) => { i.style.background = COLORS[+i.dataset.color % COLORS.length]; });
    const st = { ind: data.indicators[0].id, range: "20", off: new Set() };
    const toDate = (s) => (/^\d{4}$/.test(s) ? new Date(+s, 6, 1) : new Date(s.length === 7 ? s + "-01" : s));
    const fmt = (v) => Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toFixed(2);
    const draw = () => {
      const ind = data.indicators.find((x) => x.id === st.ind);
      const lines = [];
      data.economies.forEach((e, n) => {
        if (st.off.has(e.id)) return;
        const s = (ind.series[e.id] || []).map(([d, v]) => [toDate(d), v, d]);
        if (s.length) lines.push({ e, n, s });
      });
      if (!lines.length) { box.innerHTML = "<p class='note'>所选经济体没有该指标的数据</p>"; return; }
      const end = new Date(Math.max(...lines.map((l) => l.s[l.s.length - 1][0].getTime())));
      const from = st.range === "max" ? null : new Date(end.getFullYear() - +st.range, end.getMonth(), 1);
      lines.forEach((l) => { l.p = from ? l.s.filter((x) => x[0] >= from) : l.s; });
      const all = lines.flatMap((l) => l.p);
      if (!all.length) { box.innerHTML = "<p class='note'>该时间范围内没有数据</p>"; return; }
      const W = box.clientWidth || 800, H = 340, L = 56, R = 14, T = 14, B = 28;
      let lo = Math.min(...all.map((p) => p[1])), hi = Math.max(...all.map((p) => p[1]));
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
      const t0 = Math.min(...all.map((p) => p[0].getTime())), t1 = Math.max(t0 + 1, ...all.map((p) => p[0].getTime()));
      const x = (t) => L + (t - t0) / (t1 - t0) * (W - L - R), y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
      let g = "";
      for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
      const y0 = new Date(t0).getFullYear(), y1 = new Date(t1).getFullYear(), step = Math.max(1, Math.ceil((y1 - y0 + 1) / 8));
      for (let yr = y0 + 1; yr <= y1; yr += step) { const t = new Date(yr, 0, 1).getTime(); g += `<text x="${x(t)}" y="${H - 8}" text-anchor="middle">${yr}</text><line class="vx" x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${H - B}"/>`; }
      const zero = !isLog && lo < 0 && hi > 0 ? `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>` : "";
      const paths = lines.map((l) => `<path fill="none" stroke-width="1.8" stroke="${COLORS[l.n % COLORS.length]}" d="${l.p.map((p, i) => (i ? "L" : "M") + x(p[0].getTime()).toFixed(1) + "," + y(p[1]).toFixed(1)).join("")}"/>`).join("");
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><g class="grid">${g}</g>${zero}${paths}<g class="hover" visibility="hidden"><line class="hx" y1="${T}" y2="${H - B}"/><text class="ht" y="${T + 12}"></text></g><rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
      const svg = box.querySelector("svg"), hov = svg.querySelector(".hover"), hit = svg.querySelector(".hit");
      hit.addEventListener("mousemove", (ev) => {
        const r = svg.getBoundingClientRect(), t = t0 + ((ev.clientX - r.left) * W / r.width - L) / (W - L - R) * (t1 - t0);
        const bits = lines.map((l) => { let b = l.p[0]; l.p.forEach((p) => { if (Math.abs(p[0] - t) < Math.abs(b[0] - t)) b = p; }); return [l.e.zh, b]; });
        const cx = x(t); hov.setAttribute("visibility", "visible");
        hov.querySelector("line").setAttribute("x1", cx); hov.querySelector("line").setAttribute("x2", cx);
        const tx = hov.querySelector("text"); tx.textContent = bits.map(([n, b]) => `${n} ${fmt(b[1])} (${b[2]})`).join(" · ");
        tx.setAttribute("x", L + 4); tx.setAttribute("text-anchor", "start");
      });
      hit.addEventListener("mouseleave", () => hov.setAttribute("visibility", "hidden"));
    };
    wrap.querySelectorAll("[data-cmp-ind]").forEach((b) => b.addEventListener("click", () => {
      st.ind = b.dataset.cmpInd; wrap.querySelectorAll("[data-cmp-ind]").forEach((z) => z.setAttribute("aria-pressed", z === b ? "true" : "false")); draw();
    }));
    wrap.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
      st.range = b.dataset.range; wrap.querySelectorAll("[data-range]").forEach((z) => z.setAttribute("aria-pressed", z === b ? "true" : "false")); draw();
    }));
    wrap.querySelectorAll("[data-cmp-econ]").forEach((c) => c.addEventListener("change", () => { c.checked ? st.off.delete(c.dataset.cmpEcon) : st.off.add(c.dataset.cmpEcon); draw(); }));
    draw();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(draw, 150); });
  });

  // daily TOC scroll-spy
  const toc = document.querySelector(".toc");
  if (toc && "IntersectionObserver" in window) {
    const links = new Map([...toc.querySelectorAll("a[href^='#']")].map((a) => [a.getAttribute("href").slice(1), a]));
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); });
      const first = [...links.keys()].find((id) => visible.has(id));
      if (!first) return;
      links.forEach((a, id) => a.classList.toggle("is-current", id === first));
      const cur = links.get(first);
      if (cur && getComputedStyle(toc).flexDirection === "row") cur.scrollIntoView({ block: "nearest", inline: "center" });
    }, { rootMargin: "-120px 0px -55% 0px" });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }
})();

// ===== round 13: global search, up/down color convention, back-to-top, sticky tables =====
(() => {
  const root = document.documentElement;
  const curDomain = document.body.getAttribute("data-domain") || "ai";
  const DOM = { ai: "AI 情报", macro: "全球宏观" };

  // --- 涨跌颜色：默认红涨绿跌（中国习惯），可切换为绿涨红跌 ---
  const setUD = (m) => {
    root.setAttribute("data-updown", m);
    document.querySelectorAll("[data-updown-toggle]").forEach((b) => { b.textContent = m === "us" ? "绿涨" : "红涨"; b.setAttribute("aria-label", m === "us" ? "当前绿涨红跌，点击切换为红涨绿跌" : "当前红涨绿跌，点击切换为绿涨红跌"); });
  };
  setUD(root.getAttribute("data-updown") === "us" ? "us" : "cn");
  document.querySelectorAll("[data-updown-toggle]").forEach((b) => b.addEventListener("click", () => {
    const n = root.getAttribute("data-updown") === "us" ? "cn" : "us";
    setUD(n);
    try { localStorage.setItem("pn-updown", n); } catch (e) {}
  }));

  // --- back to top ---
  const top = document.querySelector("[data-back-top]");
  if (top) {
    const onScroll = () => top.classList.toggle("is-on", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // --- tall tables get a bounded scroll box so the sticky header works ---
  document.querySelectorAll(".table-wrap").forEach((w) => { if (w.querySelectorAll("tbody tr").length > 14) w.classList.add("is-tall"); });

  // --- global search ---
  const dlg = document.querySelector("[data-search-dialog]");
  if (!dlg) return;
  const input = dlg.querySelector("input[type=search]");
  const out = dlg.querySelector("[data-search-results]");
  const scopeBtns = [...dlg.querySelectorAll("[data-scope]")];
  let index = null, loading = null, scope = "all", active = -1, flat = [];
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = () => loading || (loading = fetch(dlg.getAttribute("data-index"), { cache: "no-cache" }).then((r) => r.json()).then((j) => {
    index = j; index.items.forEach((e) => { e._t = (e.t || "").toLowerCase(); e._s = (e.s || "").toLowerCase(); }); return j;
  }).catch(() => { out.innerHTML = '<p class="sr-empty">搜索索引加载失败，请刷新重试。</p>'; }));
  const hl = (s, terms) => {
    let h = esc(s);
    terms.forEach((t) => { if (t) h = h.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), (m) => `<mark>${m}</mark>`); });
    return h;
  };
  const search = (q) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean).map((t) => esc(t));
    const raw = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!raw.length || !index) return [[], []];
    const res = [];
    for (const e of index.items) {
      if (scope !== "all" && e.d !== scope) continue;
      let sc = 0, ok = true;
      for (const t of raw) {
        const ti = e._t.indexOf(t);
        if (ti === 0) sc += e._t === t ? 120 : 60;
        else if (ti > 0) sc += 35;
        else if (e._s.indexOf(t) >= 0) sc += 8;
        else { ok = false; break; }
      }
      if (!ok) continue;
      if (e.d === curDomain) sc += 4;
      sc -= Math.min(e.t.length, 60) / 30;
      res.push([sc, e]);
    }
    res.sort((a, b) => b[0] - a[0]);
    return [res.slice(0, 80).map((r) => r[1]), terms];
  };
  const render = () => {
    const q = input.value.trim();
    if (!q) { out.innerHTML = '<p class="sr-empty">输入关键词：页面、指标（如 CPI、10年期）、标的（如 NVDA、腾讯）、国家、议题、关键词、事件、日报条目。<br>快捷键 <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> 打开，<kbd>↑</kbd><kbd>↓</kbd> 选择，<kbd>Enter</kbd> 打开。</p>'; flat = []; return; }
    if (!index) { out.innerHTML = '<p class="sr-empty">正在加载索引…</p>'; load().then(render); return; }
    const [items, terms] = search(q);
    if (!items.length) { out.innerHTML = `<p class="sr-empty">没有找到「${esc(q)}」。试试更短的词或切换范围。</p>`; flat = []; return; }
    const groups = new Map();
    items.forEach((e) => { if (!groups.has(e.k)) groups.set(e.k, []); groups.get(e.k).push(e); });
    const order = index.types || [];
    const keys = [...groups.keys()].sort((a, b) => {
      const ba = groups.get(a)[0], bb = groups.get(b)[0];
      return items.indexOf(ba) - items.indexOf(bb) || order.indexOf(a) - order.indexOf(b);
    });
    flat = []; let html = "";
    keys.forEach((k) => {
      const list = groups.get(k).slice(0, 8);
      html += `<div class="sr-group"><p class="sr-type">${esc(k)} <span>${groups.get(k).length}</span></p><ul>`;
      list.forEach((e) => {
        const i = flat.push(e) - 1;
        html += `<li><a class="sr-item" href="${esc(e.u)}" data-i="${i}"><span class="sr-dom d-${esc(e.d)}">${esc(DOM[e.d] || e.d)}</span><b>${hl(e.t, terms)}</b>${e.s ? `<small>${hl(e.s, terms)}</small>` : ""}</a></li>`;
      });
      html += "</ul></div>";
    });
    out.innerHTML = html; active = -1; move(0);
  };
  const move = (d) => {
    const els = out.querySelectorAll(".sr-item");
    if (!els.length) return;
    active = Math.max(0, Math.min(els.length - 1, active + d));
    els.forEach((el, i) => el.classList.toggle("is-active", i === active));
    els[active].scrollIntoView({ block: "nearest" });
  };
  const open = () => {
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    load(); setTimeout(() => { input.focus(); input.select(); }, 0); render();
  };
  const close = () => { if (dlg.open && dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
  document.querySelectorAll("[data-search-open]").forEach((b) => b.addEventListener("click", open));
  dlg.querySelectorAll("[data-search-close]").forEach((b) => b.addEventListener("click", close));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 80); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { const el = out.querySelectorAll(".sr-item")[active]; if (el) { e.preventDefault(); location.href = el.getAttribute("href"); close(); } }
  });
  scopeBtns.forEach((b) => b.addEventListener("click", () => {
    scope = b.dataset.scope; scopeBtns.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); render(); input.focus();
  }));
  out.addEventListener("click", (e) => { const a = e.target.closest(".sr-item"); if (a) close(); });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); dlg.open ? close() : open(); }
    else if (e.key === "/" && !dlg.open && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); open(); }
  });
  const q0 = new URLSearchParams(location.search).get("q");
  if (q0) { input.value = q0; open(); }
})();

// ===== round 16: intraday prices from justinchou/personal-news-data (same-origin /live/prices.json) =====
(() => {
  const els = document.querySelectorAll("[data-live-key]");
  const panel = document.querySelector("[data-live-panel]");
  if (!els.length && !panel) return;
  const root = document.documentElement;
  const en = () => root.getAttribute("data-lang-mode") === "orig";
  const L = (zh, e) => (en() ? e : zh);
  const GROUPS = { us_equity: ["美股", "US stocks"], hk_equity: ["港股", "Hong Kong"], cn_equity: ["A 股", "China A-shares"], futures_fx: ["期货 / 汇率", "Futures / FX"], crypto: ["加密货币", "Crypto"] };
  const CB = { btc: "BTC-USD", eth: "ETH-USD" };
  let doc = null;
  const browserCrypto = {};
  const hm = (iso) => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return "—";
    const p = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).slice(5);
    const md = `${g("month")}-${g("day")}`;
    return (md === today ? "" : md + " ") + `${g("hour")}:${g("minute")}`; };
  const bjLabel = () => L("北京时间", "Beijing time");
  const fmtNum = (v) => (v == null ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: v >= 1000 ? 2 : (v < 10 ? 4 : 2), maximumFractionDigits: v < 10 ? 4 : 2 }));
  const quote = (k) => browserCrypto[k] || (doc && doc.quotes && doc.quotes[k]);
  const srcInfo = (q) => { const s = ((doc && doc.sources) || {})[q.source] || {}; return { name: L(s.name || q.source, s.name_en || q.source), delay: L(s.delay || "", s.delay_en || ""), url: s.url }; };
  const render = () => {
    els.forEach((el) => {
      const q = quote(el.dataset.liveKey); if (!q) return;
      const f = el.dataset.liveField;
      if (f === "price") {
        el.textContent = fmtNum(q.price);
        let tag = el.nextElementSibling && el.nextElementSibling.classList.contains("live-tag") ? el.nextElementSibling : null;
        if (!tag) { tag = document.createElement("small"); tag.className = "live-tag"; el.after(tag); }
        tag.textContent = hm(q.quote_time);
        tag.title = `${L("行情时间", "Quote time")} ${hm(q.quote_time)} ${bjLabel()} · ${srcInfo(q).name} · ${L("延迟", "delay")}: ${srcInfo(q).delay}`;
      } else if (f === "pct" && q.change_pct != null) {
        el.innerHTML = ""; const s = document.createElement("span");
        s.className = q.change_pct > 0 ? "is-up" : (q.change_pct < 0 ? "is-down" : "");
        s.textContent = (q.change_pct > 0 ? "+" : "") + q.change_pct.toFixed(1) + "%" + (q.change_basis === "24h" ? L("（24 小时）", " (24h)") : "");
        el.appendChild(s);
      } else if (f === "asof") {
        const si = srcInfo(q);
        el.textContent = `${hm(q.quote_time)} ${bjLabel()}`;
        const sm = document.createElement("small"); sm.className = "meta live-src";
        sm.textContent = `${L("来源", "source")}: ${si.name} · ${L("延迟", "delay")}: ${si.delay}`;
        el.appendChild(sm);
      }
    });
    if (doc) document.querySelectorAll("[data-live-market]").forEach((b) => {
      const g = (doc.groups || {})[b.dataset.liveMarket]; if (!g) return;
      b.textContent = g.open ? L("交易中", "Open") : L("休市", "Closed");
      b.classList.toggle("tag-ok", !!g.open); b.hidden = false;
    });
    if (panel && doc) {
      const box = panel.querySelector("[data-live-groups]"); box.innerHTML = "";
      Object.entries(doc.groups || {}).sort((x, y) => Object.keys(GROUPS).indexOf(x[0]) - Object.keys(GROUPS).indexOf(y[0])).forEach(([gid, g]) => {
        const s = ((doc.sources || {})[g.source]) || {};
        const live = gid === "crypto" && Object.keys(browserCrypto).length;
        const row = document.createElement("div"); row.className = "live-group";
        const state = g.open ? L("交易中", "Open") : (g.next_open_bj ? L(`休市 · 下次开盘 ${g.next_open_bj.slice(5)}`, `Closed · opens ${g.next_open_bj.slice(5)}`) : L("休市", "Closed"));
        const asof = live ? hm(new Date().toISOString()) : hm(g.fetched_at);
        row.innerHTML = `<b></b><span class="tag ${g.open ? "tag-ok" : ""}"></span><span class="meta"></span>`;
        row.children[0].textContent = L(...(GROUPS[gid] || [gid, gid]));
        row.children[1].textContent = state;
        row.children[2].textContent = `${L("截至", "as of")} ${asof} ${bjLabel()} · ${L("来源", "source")}: ${live ? "Coinbase Exchange（" + L("浏览器直连", "in browser") + "）" : L(s.name || g.source, s.name_en || g.source)} · ${L("延迟", "delay")}: ${L(s.delay || "", s.delay_en || "")}` + (g.error ? ` · ${L("上次抓取失败，沿用此前数据", "last fetch failed, showing previous data")}` : "");
        box.appendChild(row);
      });
      panel.querySelector("[data-live-head]").textContent = `${L("更新于", "updated")} ${hm(doc.generated_at)} ${bjLabel()}`;
      panel.hidden = false;
    }
  };
  const load = () => fetch("/live/prices.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.quotes) { doc = d; render(); } }).catch(() => {});
  const crypto = () => {
    const keys = [...new Set([...els].map((e) => e.dataset.liveKey).filter((k) => CB[k]))];
    if (!keys.length && !panel) return;
    (keys.length ? keys : Object.keys(CB)).reduce((p, k) => p.then(() => fetch(`https://api.exchange.coinbase.com/products/${CB[k]}/stats`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const last = d && parseFloat(d.last), op = d && parseFloat(d.open);
      if (last > 0) browserCrypto[k] = { price: last, prev_close: op, change_pct: op > 0 ? (last / op - 1) * 100 : null, change_basis: "24h", quote_time: new Date().toISOString(), source: "coinbase" };
    }).catch(() => {})), Promise.resolve()).then(render);
  };
  load(); crypto();
  setInterval(() => { if (!document.hidden) crypto(); }, 60000);
  setInterval(() => { if (!document.hidden) load(); }, 300000);
  document.querySelectorAll("[data-lang-toggle],[data-lang-set]").forEach((b) => b.addEventListener("click", () => setTimeout(render, 0)));
})();

// ===== round 17: copy-to-clipboard buttons ([data-copy]) =====
document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
  const v = b.dataset.copy, old = b.textContent;
  const done = () => { b.textContent = "已复制"; setTimeout(() => { b.textContent = old; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, () => window.prompt("复制链接", v));
  else window.prompt("复制链接", v);
}));
