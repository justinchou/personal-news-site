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
