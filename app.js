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
  };
  setLang(root.getAttribute("data-lang-mode") === "orig" ? "orig" : "zh");
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
  }

  // indicator detail chart: range (1Y/5Y/10Y/全部) × series toggle, plain SVG
  document.querySelectorAll("[data-ind-chart]").forEach((wrap) => {
    const box = wrap.querySelector("[data-chart-canvas]");
    let data;
    try { data = JSON.parse(wrap.querySelector("[data-chart-data]").textContent); } catch (e) { return; }
    const state = { range: "5", series: "headline" };
    const toDate = (s) => { if (/^\d{4}$/.test(s)) return new Date(+s, 11, 31); const q = s.match(/^(\d{4})-Q(\d)$/); if (q) return new Date(+q[1], q[2] * 3 - 3, 1); return new Date(s.length === 7 ? s + "-01" : s); };
    const fmt = (v) => Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
    const draw = () => {
      const all = (data.series[state.series] || []).map(([d, v]) => [toDate(d), v, d]);
      if (!all.length) { box.innerHTML = "<p class='note'>暂无数据</p>"; return; }
      const end = all[all.length - 1][0];
      const pts = state.range === "max" ? all : all.filter((p) => p[0] >= new Date(end.getFullYear() - +state.range, end.getMonth(), end.getDate()));
      const W = box.clientWidth || 800, H = 300, L = 54, R = 14, T = 14, B = 28;
      let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
      const t0 = pts[0][0].getTime(), t1 = Math.max(pts[pts.length - 1][0].getTime(), t0 + 1);
      const x = (t) => L + (t - t0) / (t1 - t0) * (W - L - R);
      const y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
      const path = pts.map((p, i) => (i ? "L" : "M") + x(p[0].getTime()).toFixed(1) + "," + y(p[1]).toFixed(1)).join("");
      let grid = "";
      for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
      const y0 = pts[0][0].getFullYear(), y1 = pts[pts.length - 1][0].getFullYear();
      const stepY = Math.max(1, Math.ceil((y1 - y0 + 1) / 8));
      let xl = "";
      if (y1 - y0 >= 1) { for (let yr = y0 + 1; yr <= y1; yr += stepY) { const t = new Date(yr, 0, 1).getTime(); if (t >= t0) xl += `<text x="${x(t)}" y="${H - 8}" text-anchor="middle">${yr}</text><line class="vx" x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${H - B}"/>`; } }
      else { xl = `<text x="${L}" y="${H - 8}">${pts[0][2]}</text><text x="${W - R}" y="${H - 8}" text-anchor="end">${pts[pts.length - 1][2]}</text>`; }
      const zero = lo < 0 && hi > 0 ? `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>` : "";
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
      const zero = lo < 0 && hi > 0 ? `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>` : "";
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
