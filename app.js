(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem("pn-theme");
  if (stored) root.setAttribute("data-theme", stored);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      localStorage.setItem("pn-theme", next);
    });
  });

  const grid = document.querySelector("[data-product-grid]");
  if (grid) {
    const cards = [...grid.querySelectorAll("[data-product]")];
    const apply = () => {
      const cat = (document.querySelector("[data-filter-cat]") || {}).value || "";
      const country = (document.querySelector("[data-filter-country]") || {}).value || "";
      const oss = (document.querySelector("[data-filter-oss]") || {}).value || "";
      const q = ((document.querySelector("[data-filter-q]") || {}).value || "").toLowerCase();
      cards.forEach((card) => {
        const ok =
          (!cat || card.dataset.cat === cat) &&
          (!country || card.dataset.country === country) &&
          (!oss || card.dataset.oss === oss) &&
          (!q || (card.dataset.name || "").toLowerCase().includes(q));
        card.classList.toggle("hidden", !ok);
      });
    };
    document.querySelectorAll("[data-filter-cat],[data-filter-country],[data-filter-oss],[data-filter-q]").forEach((el) => {
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });
  }

  document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll("button[data-tab]")];
    const panels = [...document.querySelectorAll(tabs.dataset.tabs)];
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
        panels.forEach((p) => {
          p.hidden = p.id !== btn.dataset.tab;
        });
      });
    });
  });
})();
