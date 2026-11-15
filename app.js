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
