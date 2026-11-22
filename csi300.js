/* 沪深300基金跟踪：一张主图。缩放只改时间窗口，分位在完整 262 日序列上算好。 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    var el = document.getElementById("c3-chart");
    if (el) api.mount(el);
  }
})(function () {
  var WINDOW = 262;
  var MIN_SPAN = 20;
  var PALETTE = ["#d26a4a", "#3d7ea6", "#c4a15a", "#6a8f4e", "#8d6aa8"];

  function zoomAround(view, cursor, factor, minSpan) {
    var span = view.i1 - view.i0;
    var next = Math.round(span * factor);
    if (next < minSpan) next = minSpan;
    if (next > view.len - 1) next = view.len - 1;
    var left = span <= 0 ? 0 : (cursor - view.i0) / span;
    var i0 = Math.round(cursor - left * next);
    var i1 = i0 + next;
    if (i0 < 0) { i1 -= i0; i0 = 0; }
    if (i1 > view.len - 1) { i0 -= i1 - (view.len - 1); i1 = view.len - 1; }
    if (i0 < 0) i0 = 0;
    if (i1 <= i0) i1 = Math.min(view.len - 1, i0 + minSpan);
    return { i0: i0, i1: i1 };
  }

  function pan(view, di) {
    var span = view.i1 - view.i0;
    var i0 = view.i0 + di;
    if (i0 < 0) i0 = 0;
    if (i0 + span > view.len - 1) i0 = Math.max(0, view.len - 1 - span);
    return { i0: i0, i1: i0 + span };
  }

  function pctAt(values, i, win) {
    win = win || WINDOW;
    if (i < win - 1) return null;
    var xs = [];
    for (var k = i - win + 1; k <= i; k++) {
      if (values[k] == null) return null;
      xs.push(values[k]);
    }
    var v = xs[xs.length - 1], less = 0, eq = 0;
    for (var n = 0; n < xs.length; n++) {
      if (xs[n] < v) less++;
      else if (xs[n] === v) eq++;
    }
    return (less + 0.5 * eq) / win * 100;
  }

  function mount(root) {
    var raw = root.querySelector("[data-c3-data]");
    if (!raw) return;
    var data = JSON.parse(raw.textContent);
    var cal = data.calendar || [];
    if (!cal.length) return;
    var cap = {};
    (data.cap || []).forEach(function (p) { cap[p[0]] = p[1]; });
    var index = {};
    (data.index || []).forEach(function (p) { index[p[0]] = p[1]; });
    var funds = (data.funds || []).filter(function (f) { return f.history; });
    var aum = {};
    funds.forEach(function (f) {
      var m = {};
      (f.aum || []).forEach(function (p) { m[p[0]] = p[1]; });
      aum[f.code] = m;
    });
    var len = cal.length;
    var state = {
      funds: {},
      aumMode: "present",
      ratioMode: "present",
      pctMode: "common",
      indexOn: true,
      gesture: "pan",
      i0: 0,
      i1: len - 1,
      hidden: {}
    };
    funds.forEach(function (f) { state.funds[f.code] = true; });

    var main = root.querySelector("[data-c3-main]");
    var overview = root.querySelector("[data-c3-overview]");
    var tip = root.querySelector("[data-c3-tip]");
    var read = root.querySelector("[data-c3-read]");
    var cache = { key: "", series: [] };

    function selected() { return funds.filter(function (f) { return state.funds[f.code]; }); }

    function ratioOn(day, codes, mode) {
      if (cap[day] == null || !codes.length) return null;
      var sum = 0, n = 0, miss = false;
      for (var i = 0; i < codes.length; i++) {
        var v = aum[codes[i].code][day];
        if (v == null) miss = true;
        else { sum += v; n++; }
      }
      if (!n) return null;
      if (mode === "common" && (miss || n !== codes.length)) return null;
      return sum / cap[day] * 100;
    }

    function rebuild() {
      var codes = selected();
      var key = [state.aumMode, state.ratioMode, state.pctMode, state.indexOn, codes.map(function (f) { return f.code; }).join(",")].join("|");
      if (cache.key === key) return;
      var series = [];
      function push(id, name, color, axis, mapOrPts) {
        var pts = mapOrPts;
        if (!Array.isArray(mapOrPts)) {
          pts = [];
          for (var i = 0; i < len; i++) if (mapOrPts[cal[i]] != null) pts.push([i, mapOrPts[cal[i]]]);
        }
        series.push({ id: id, name: name, color: color, axis: axis, pts: pts });
      }
      if (state.aumMode === "split") {
        codes.forEach(function (f, i) {
          push("aum:" + f.code, f.short + " 规模", PALETTE[i % PALETTE.length], "aum", aum[f.code]);
        });
      } else if (state.aumMode !== "off") {
        var am = {};
        for (var i = 0; i < len; i++) {
          var day = cal[i], sum = 0, n = 0, miss = false;
          codes.forEach(function (f) {
            var v = aum[f.code][day];
            if (v == null) miss = true; else { sum += v; n++; }
          });
          if (state.aumMode === "common") { if (!miss && n === codes.length && n) am[day] = sum; }
          else if (n) am[day] = sum;
        }
        push("aum:sum", state.aumMode === "common" ? "规模·共同有数据期" : "规模·当日有效合计", PALETTE[0], "aum", am);
      }
      if (state.ratioMode === "split") {
        codes.forEach(function (f, i) {
          var rm = {};
          for (var i2 = 0; i2 < len; i2++) {
            var r = ratioOn(cal[i2], [f], "common");
            if (r != null) rm[cal[i2]] = r;
          }
          push("ratio:" + f.code, f.short + " 占比", PALETTE[i % PALETTE.length], "ratio", rm);
        });
      } else if (state.ratioMode !== "off") {
        var rm2 = {};
        for (var j = 0; j < len; j++) {
          var rv = ratioOn(cal[j], codes, state.ratioMode);
          if (rv != null) rm2[cal[j]] = rv;
        }
        push("ratio:sum", state.ratioMode === "common" ? "占比·共同有数据期" : "占比·当日有效合计", "#3d7ea6", "ratio", rm2);
      }
      if (state.pctMode === "split") {
        codes.forEach(function (f, i) {
          var dense = new Array(len);
          for (var i3 = 0; i3 < len; i3++) dense[i3] = ratioOn(cal[i3], [f], "common");
          var pm = {};
          for (var i4 = 0; i4 < len; i4++) {
            var pv = pctAt(dense, i4);
            if (pv != null) pm[cal[i4]] = pv;
          }
          push("pct:" + f.code, f.short + " 分位", PALETTE[i % PALETTE.length], "pct", pm);
        });
      } else if (state.pctMode !== "off") {
        var dense2 = new Array(len);
        for (var i5 = 0; i5 < len; i5++) dense2[i5] = ratioOn(cal[i5], codes, "common");
        var pm2 = {};
        for (var i6 = 0; i6 < len; i6++) {
          var pv2 = pctAt(dense2, i6);
          if (pv2 != null) pm2[cal[i6]] = pv2;
        }
        push("pct:common", "分位·共同有数据期合计", "#6a8f4e", "pct", pm2);
      }
      if (state.indexOn) push("idx", "沪深300收盘", "#9aa0a6", "idx", index);
      series.forEach(function (s) { if (state.hidden[s.id]) s.hidden = true; });
      cache.key = key;
      cache.series = series;
      var denseP = new Array(len);
      var lastPct = null;
      for (var ip = 0; ip < len; ip++) denseP[ip] = ratioOn(cal[ip], codes, "common");
      for (var iq = len - 1; iq >= 0; iq--) {
        var got = pctAt(denseP, iq);
        if (got != null) { lastPct = got; break; }
      }
      root.dataset.probePct = lastPct == null ? "" : String(lastPct);
      root.dataset.probeFunds = codes.map(function (f) { return f.code; }).join(",");
    }

    function visibleSeries() { return cache.series.filter(function (s) { return !s.hidden && !state.hidden[s.id]; }); }

    function layout(w) {
      var show = { aum: false, ratio: false, pct: false, idx: false };
      visibleSeries().forEach(function (s) { show[s.axis] = true; });
      var left = 8, right = 8, axes = [];
      if (show.aum) { left += 64; axes.push({ side: "left", id: "aum", title: "亿元", slot: 0 }); }
      if (show.pct) { left += 36; axes.push({ side: "left", id: "pct", title: "分位", slot: show.aum ? 1 : 0 }); }
      if (show.idx) { right += 52; axes.push({ side: "right", id: "idx", title: "点", slot: 0 }); }
      if (show.ratio) { right += 42; axes.push({ side: "right", id: "ratio", title: "%", slot: show.idx ? 1 : 0 }); }
      return { left: left, right: right, top: 12, bottom: 26, axes: axes, show: show, w: w };
    }

    function yScale(id, pts) {
      if (id === "pct") return { lo: 0, hi: 100 };
      var lo = Infinity, hi = -Infinity;
      pts.forEach(function (p) {
        if (p[0] < state.i0 - 1 || p[0] > state.i1 + 1) return;
        if (p[1] < lo) lo = p[1];
        if (p[1] > hi) hi = p[1];
      });
      if (!isFinite(lo) || lo === hi) { lo = (lo || 0) - 1; hi = (hi || 1) + 1; }
      var pad = (hi - lo) * 0.08 || 1;
      if (id === "aum" || id === "ratio") lo = Math.max(0, lo - pad);
      else lo -= pad;
      hi += pad;
      return { lo: lo, hi: hi };
    }

    function drawMain() {
      rebuild();
      var dpr = window.devicePixelRatio || 1;
      var cssW = main.clientWidth || 640;
      var cssH = cssW < 640 ? 300 : 420;
      main.width = Math.round(cssW * dpr);
      main.height = Math.round(cssH * dpr);
      main.style.height = cssH + "px";
      var ctx = main.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cs = getComputedStyle(root);
      var ink = cs.color || "#ddd";
      var grid = cs.borderColor || "rgba(128,128,128,.35)";
      ctx.clearRect(0, 0, cssW, cssH);
      var box = layout(cssW);
      var plotW = cssW - box.left - box.right;
      var plotH = cssH - box.top - box.bottom;
      function xOf(i) { return box.left + (i - state.i0) / Math.max(1, state.i1 - state.i0) * plotW; }
      var scales = {};
      box.axes.forEach(function (ax) {
        var pts = [];
        visibleSeries().forEach(function (s) { if (s.axis === ax.id) pts = pts.concat(s.pts); });
        scales[ax.id] = yScale(ax.id, pts);
      });
      function yOf(id, v) {
        var sc = scales[id];
        return box.top + (sc.hi - v) / (sc.hi - sc.lo) * plotH;
      }
      ctx.strokeStyle = grid;
      ctx.fillStyle = ink;
      ctx.font = "11px sans-serif";
      ctx.lineWidth = 1;
      box.axes.forEach(function (ax) {
        var sc = scales[ax.id];
        for (var k = 0; k <= 4; k++) {
          var v = sc.lo + (sc.hi - sc.lo) * k / 4;
          var y = yOf(ax.id, v);
          if (ax.slot === 0) {
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(box.left, y);
            ctx.lineTo(cssW - box.right, y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          var label = ax.id === "pct" ? v.toFixed(0) : (ax.id === "ratio" ? v.toFixed(2) : (Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(1)));
          ctx.globalAlpha = 0.85;
          var lx = ax.side === "left" ? 2 + ax.slot * 64 : cssW - box.right + 4 + ax.slot * 48;
          if (y > box.top + 8 && y < box.top + plotH - 4) ctx.fillText(label, lx, y + 3);
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 0.7;
        var titleY = 11;
        var tx = ax.side === "left" ? 2 + ax.slot * 64 : cssW - box.right + 4 + ax.slot * 48;
        ctx.fillText(ax.title, tx, titleY);
        ctx.globalAlpha = 1;
      });
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.left, box.top, plotW, plotH);
      ctx.clip();
      visibleSeries().forEach(function (s) {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.axis === "idx" ? 1.2 : 1.7;
        if (s.axis === "idx") ctx.setLineDash([4, 3]);
        else if (s.axis === "ratio") ctx.setLineDash([2, 2]);
        else ctx.setLineDash([]);
        var pen = false;
        for (var k = 0; k < s.pts.length; k++) {
          var i = s.pts[k][0];
          if (i < state.i0 - 1 || i > state.i1 + 1) { pen = false; continue; }
          var x = xOf(i), y = yOf(s.axis, s.pts[k][1]);
          var prev = k ? s.pts[k - 1][0] : null;
          if (!pen || prev !== i - 1) { ctx.moveTo(x, y); pen = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      if (state.box && state.box.x1 != null) {
        var a = Math.min(state.box.x0, state.box.x1), b = Math.max(state.box.x0, state.box.x1);
        ctx.fillStyle = "rgba(61,126,166,.18)";
        ctx.fillRect(a, box.top, b - a, plotH);
      }
      if (state.hover != null && state.hover >= state.i0 && state.hover <= state.i1) {
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xOf(state.hover), box.top);
        ctx.lineTo(xOf(state.hover), box.top + plotH);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      var y0 = cal[state.i0], y1 = cal[state.i1];
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.75;
      ctx.fillText(y0, box.left, cssH - 8);
      ctx.fillText(y1, cssW - box.right - 72, cssH - 8);
      ctx.globalAlpha = 1;
      root.dataset.i0 = String(state.i0);
      root.dataset.i1 = String(state.i1);
      root._c3 = { xOf: xOf, box: box, cssW: cssW, cssH: cssH };
      drawOverview(cssW);
      drawLegend();
    }

    function drawOverview(cssW) {
      var dpr = window.devicePixelRatio || 1;
      var cssH = 72;
      overview.width = Math.round(cssW * dpr);
      overview.height = Math.round(cssH * dpr);
      overview.style.height = cssH + "px";
      var ctx = overview.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      var L = 8, R = 8, T = 8, B = 16;
      function xOf(i) { return L + i / Math.max(1, len - 1) * (cssW - L - R); }
      var pts = [];
      for (var i = 0; i < len; i++) if (index[cal[i]] != null) pts.push([i, index[cal[i]]]);
      var lo = Infinity, hi = -Infinity;
      pts.forEach(function (p) { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; });
      if (!isFinite(lo)) { lo = 0; hi = 1; }
      function yOf(v) { return T + (hi - v) / Math.max(1e-6, hi - lo) * (cssH - T - B); }
      ctx.strokeStyle = "#9aa0a6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach(function (p, k) {
        var x = xOf(p[0]), y = yOf(p[1]);
        if (!k || pts[k - 1][0] !== p[0] - 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      var x0 = xOf(state.i0), x1 = xOf(state.i1);
      ctx.fillStyle = "rgba(61,126,166,.18)";
      ctx.fillRect(x0, T, Math.max(2, x1 - x0), cssH - T - B);
      ctx.strokeStyle = "#3d7ea6";
      ctx.strokeRect(x0, T, Math.max(2, x1 - x0), cssH - T - B);
      ctx.fillStyle = "#3d7ea6";
      ctx.fillRect(x0 - 4, T, 8, cssH - T - B);
      ctx.fillRect(x1 - 4, T, 8, cssH - T - B);
      overview._c3 = { xOf: xOf, L: L, R: R, cssW: cssW };
    }

    function drawLegend() {
      var host = root.querySelector("[data-c3-legend]");
      if (!host) return;
      host.innerHTML = cache.series.map(function (s) {
        var on = !state.hidden[s.id];
        return '<button type="button" class="c3-leg" data-c3-leg="' + s.id + '" aria-pressed="' + (on ? "true" : "false") + '">'
          + '<i style="background:' + s.color + '"></i>' + s.name + "</button>";
      }).join("");
    }

    function indexAt(px, cssW, box) {
      var plotW = cssW - box.left - box.right;
      var t = (px - box.left) / Math.max(1, plotW);
      var i = Math.round(state.i0 + t * (state.i1 - state.i0));
      if (i < 0) i = 0;
      if (i > len - 1) i = len - 1;
      return i;
    }

    function showTip(i, clientX, clientY) {
      if (i == null) { tip.hidden = true; return; }
      state.hover = i;
      var lines = [cal[i]];
      visibleSeries().forEach(function (s) {
        var hit = null;
        for (var k = 0; k < s.pts.length; k++) if (s.pts[k][0] === i) hit = s.pts[k][1];
        var unit = s.axis === "aum" ? " 亿元" : s.axis === "ratio" ? "%" : s.axis === "pct" ? " 分位" : " 点";
        lines.push(s.name + " " + (hit == null ? "—" : (s.axis === "pct" || s.axis === "ratio" ? hit.toFixed(2) : hit.toFixed(2)) + unit));
      });
      var codes = selected();
      var have = 0;
      codes.forEach(function (f) { if (aum[f.code][cal[i]] != null && cap[cal[i]] != null) have++; });
      lines.push("当天有占比 " + have + "/" + codes.length);
      tip.hidden = false;
      tip.textContent = lines.join("\n");
      var rect = main.getBoundingClientRect();
      var x = clientX - rect.left + 12, y = clientY - rect.top + 12;
      if (x + 220 > rect.width) x = clientX - rect.left - 220;
      tip.style.left = Math.max(0, x) + "px";
      tip.style.top = Math.max(0, y) + "px";
      if (read) read.textContent = lines.join(" · ");
    }

    function applyRange(next) {
      state.i0 = next.i0;
      state.i1 = next.i1;
      root.querySelectorAll("[data-c3-range]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      drawMain();
    }

    main.addEventListener("wheel", function (ev) {
      if (!root._c3) return;
      ev.preventDefault();
      var rect = main.getBoundingClientRect();
      var i = indexAt(ev.clientX - rect.left, root._c3.cssW, root._c3.box);
      var factor = ev.deltaY > 0 ? 1.18 : 0.82;
      applyRange(zoomAround({ i0: state.i0, i1: state.i1, len: len }, i, factor, MIN_SPAN));
    }, { passive: false });

    var drag = null;
    main.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "touch") return;
      var rect = main.getBoundingClientRect();
      var x = ev.clientX - rect.left;
      drag = { x: x, i0: state.i0, i1: state.i1, mode: state.gesture };
      if (state.gesture === "box") state.box = { x0: x, x1: x };
      try { main.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    main.addEventListener("pointermove", function (ev) {
      if (!root._c3) return;
      var rect = main.getBoundingClientRect();
      var x = ev.clientX - rect.left;
      if (!drag) {
        showTip(indexAt(x, root._c3.cssW, root._c3.box), ev.clientX, ev.clientY);
        drawMain();
        return;
      }
      if (drag.mode === "pan") {
        var di = Math.round((drag.x - x) / Math.max(1, root._c3.cssW - root._c3.box.left - root._c3.box.right) * (drag.i1 - drag.i0));
        var next = pan({ i0: drag.i0, i1: drag.i1, len: len }, di);
        state.i0 = next.i0; state.i1 = next.i1;
        drawMain();
      } else {
        state.box.x1 = x;
        drawMain();
      }
    });
    function endMain(ev) {
      if (!drag) return;
      if (drag.mode === "box" && state.box && root._c3) {
        var rect = main.getBoundingClientRect();
        var a = indexAt(Math.min(state.box.x0, state.box.x1), root._c3.cssW, root._c3.box);
        var b = indexAt(Math.max(state.box.x0, state.box.x1), root._c3.cssW, root._c3.box);
        if (b - a >= MIN_SPAN) applyRange({ i0: a, i1: b });
      }
      state.box = null;
      drag = null;
      drawMain();
    }
    main.addEventListener("pointerup", endMain);
    main.addEventListener("pointercancel", endMain);
    main.addEventListener("pointerleave", function () { if (!drag) { state.hover = null; if (tip) tip.hidden = true; } });

    main.addEventListener("touchstart", function (ev) {
      if (ev.touches.length === 2) {
        var r = main.getBoundingClientRect();
        var x = (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left;
        state.pinch = {
          dist: Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY),
          i0: state.i0, i1: state.i1,
          cursor: root._c3 ? indexAt(x, root._c3.cssW, root._c3.box) : state.i0
        };
        ev.preventDefault();
      } else if (ev.touches.length === 1) {
        state.touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, i0: state.i0, i1: state.i1, lock: "" };
      }
    }, { passive: false });
    main.addEventListener("touchmove", function (ev) {
      if (ev.touches.length === 2 && state.pinch && root._c3) {
        var dist = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
        var factor = state.pinch.dist / Math.max(1, dist);
        var next = zoomAround({ i0: state.pinch.i0, i1: state.pinch.i1, len: len }, state.pinch.cursor, factor, MIN_SPAN);
        state.i0 = next.i0; state.i1 = next.i1;
        drawMain();
        ev.preventDefault();
      } else if (ev.touches.length === 1 && state.touch && root._c3) {
        var dx = ev.touches[0].clientX - state.touch.x;
        var dy = ev.touches[0].clientY - state.touch.y;
        if (!state.touch.lock) state.touch.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (state.touch.lock === "x") {
          var di = Math.round(-dx / Math.max(1, root._c3.cssW - root._c3.box.left - root._c3.box.right) * (state.touch.i1 - state.touch.i0));
          var next = pan({ i0: state.touch.i0, i1: state.touch.i1, len: len }, di);
          state.i0 = next.i0; state.i1 = next.i1;
          drawMain();
          ev.preventDefault();
        }
      }
    }, { passive: false });
    main.addEventListener("touchend", function () { state.pinch = null; state.touch = null; });

    var brush = null;
    function brushHit(px) {
      var meta = overview._c3;
      if (!meta) return "";
      var x0 = meta.xOf(state.i0), x1 = meta.xOf(state.i1);
      if (Math.abs(px - x0) < 16) return "left";
      if (Math.abs(px - x1) < 16) return "right";
      if (px > x0 && px < x1) return "mid";
      return "out";
    }
    function indexFromOverview(px) {
      var meta = overview._c3;
      var inner = meta.cssW - meta.L - meta.R;
      var t = (px - meta.L) / Math.max(1, inner);
      var i = Math.round(t * (len - 1));
      if (i < 0) i = 0;
      if (i > len - 1) i = len - 1;
      return i;
    }
    overview.addEventListener("pointerdown", function (ev) {
      var rect = overview.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var hit = brushHit(px);
      if (hit === "out") {
        var span = state.i1 - state.i0;
        var c = indexFromOverview(px);
        var i0 = c - Math.round(span / 2);
        applyRange(pan({ i0: i0, i1: i0 + span, len: len }, 0));
        hit = "mid";
      }
      brush = { hit: hit, x: px, i0: state.i0, i1: state.i1 };
      try { overview.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    overview.addEventListener("pointermove", function (ev) {
      if (!brush || !overview._c3) return;
      var rect = overview.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var di = indexFromOverview(px) - indexFromOverview(brush.x);
      if (brush.hit === "mid") {
        var next = pan({ i0: brush.i0, i1: brush.i1, len: len }, di);
        state.i0 = next.i0; state.i1 = next.i1;
      } else if (brush.hit === "left") {
        var i0 = brush.i0 + di;
        if (i0 < 0) i0 = 0;
        if (brush.i1 - i0 < MIN_SPAN) i0 = brush.i1 - MIN_SPAN;
        state.i0 = i0; state.i1 = brush.i1;
      } else if (brush.hit === "right") {
        var i1 = brush.i1 + di;
        if (i1 > len - 1) i1 = len - 1;
        if (i1 - brush.i0 < MIN_SPAN) i1 = brush.i0 + MIN_SPAN;
        state.i0 = brush.i0; state.i1 = i1;
      }
      drawMain();
    });
    overview.addEventListener("pointerup", function () { brush = null; });

    root.addEventListener("click", function (ev) {
      var leg = ev.target.closest("[data-c3-leg]");
      if (leg) {
        var id = leg.getAttribute("data-c3-leg");
        state.hidden[id] = !state.hidden[id];
        cache.key = "";
        drawMain();
        return;
      }
      var b = ev.target.closest("[data-c3-aum],[data-c3-ratio],[data-c3-pct],[data-c3-gesture],[data-c3-range]");
      if (!b) return;
      if (b.hasAttribute("data-c3-aum")) {
        state.aumMode = b.getAttribute("data-c3-aum");
        root.querySelectorAll("[data-c3-aum]").forEach(function (el) { el.setAttribute("aria-pressed", el === b ? "true" : "false"); });
      } else if (b.hasAttribute("data-c3-ratio")) {
        state.ratioMode = b.getAttribute("data-c3-ratio");
        root.querySelectorAll("[data-c3-ratio]").forEach(function (el) { el.setAttribute("aria-pressed", el === b ? "true" : "false"); });
      } else if (b.hasAttribute("data-c3-pct")) {
        state.pctMode = b.getAttribute("data-c3-pct");
        root.querySelectorAll("[data-c3-pct]").forEach(function (el) { el.setAttribute("aria-pressed", el === b ? "true" : "false"); });
      } else if (b.hasAttribute("data-c3-gesture")) {
        state.gesture = b.getAttribute("data-c3-gesture");
        root.querySelectorAll("[data-c3-gesture]").forEach(function (el) { el.setAttribute("aria-pressed", el === b ? "true" : "false"); });
        main.dataset.gesture = state.gesture;
        return;
      } else if (b.hasAttribute("data-c3-range")) {
        var spec = b.getAttribute("data-c3-range");
        root.querySelectorAll("[data-c3-range]").forEach(function (el) { el.setAttribute("aria-pressed", el === b ? "true" : "false"); });
        if (spec === "max") { state.i0 = 0; state.i1 = len - 1; }
        else {
          var end = cal[len - 1];
          var cut = (Number(end.slice(0, 4)) - Number(spec)) + end.slice(4);
          var i0 = 0;
          for (var i = 0; i < len; i++) if (cal[i] >= cut) { i0 = i; break; }
          state.i0 = i0; state.i1 = len - 1;
        }
      }
      cache.key = "";
      drawMain();
    });
    root.addEventListener("change", function (ev) {
      var code = ev.target.getAttribute("data-c3-fund");
      if (code) { state.funds[code] = ev.target.checked; cache.key = ""; drawMain(); }
      if (ev.target.hasAttribute("data-c3-index")) { state.indexOn = ev.target.checked; cache.key = ""; drawMain(); }
    });
    window.addEventListener("resize", drawMain);
    drawMain();
  }

  return { zoomAround: zoomAround, pan: pan, pctAt: pctAt, mount: mount };
});
