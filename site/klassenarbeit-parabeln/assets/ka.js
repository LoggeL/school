/* Klassenarbeit Klasse 10 · gemeinsame Bausteine für alle Module.
   Stellt window.KA bereit: Koordinatensystem, Regler, Schrittfolgen,
   Aufgabenprüfung, Probearbeit, Fortschritt und Modulnavigation. */
(function () {
  'use strict';
  const BASE = '/klassenarbeit-parabeln/';
  const KA = (window.KA = {});
  KA.BASE = BASE;
  KA.MODULES = [
    {id: 'start', href: BASE, title: 'Übersicht', short: 'Start', minutes: 5, part: 0},
    {id: 'grundlagen', href: BASE + 'grundlagen/', title: 'Binome und Scheitelpunktform', short: 'Grundlagen', minutes: 35, part: 1},
    {id: 'zeichnen', href: BASE + 'zeichnen/', title: 'Parabeln und Geraden zeichnen', short: 'Zeichnen', minutes: 20, part: 1},
    {id: 'gleichungen', href: BASE + 'gleichungen/', title: 'Quadratische Gleichungen lösen', short: 'Gleichungen', minutes: 30, part: 1},
    {id: 'schnittpunkte', href: BASE + 'schnittpunkte/', title: 'Schnittpunkte berechnen', short: 'Schnittpunkte', minutes: 30, part: 2},
    {id: 'modellieren', href: BASE + 'modellieren/', title: 'Mathematisch modellieren', short: 'Modellieren', minutes: 20, part: 2},
    {id: 'probearbeit', href: BASE + 'probearbeit/', title: 'Probe-Klassenarbeit', short: 'Probearbeit', minutes: 40, part: 2},
  ];
  KA.COLORS = {f: '#2459c4', g: '#c2512d', p: '#6a4bbf', ok: '#1d7a4f', no: '#b23a2e', ink: '#1f3a34', dim: '#7b8a82', gold: '#a8791a', brand: '#235849'};

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const resolve = target => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) throw new Error('KA: Element nicht gefunden: ' + target);
    return el;
  };
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value == null) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) if (child != null) el.append(child);
    return el;
  };
  KA.h = h;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGE = document.body.dataset.kaPage || '';

  /* ---------- Speicher ---------- */
  const KEY = 'ka10.v1';
  let store = null;
  function data() {
    if (store) return store;
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (err) { console.warn('KA: Fortschritt nicht lesbar, starte ohne Speicher.', err); store = {}; }
    store.pages = store.pages || {}; store.prefs = store.prefs || {};
    return store;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data())); }
    catch (err) { console.warn('KA: Fortschritt kann auf diesem Gerät nicht gespeichert werden.', err); }
    document.dispatchEvent(new CustomEvent('ka:progress'));
  }
  const pageData = id => (data().pages[id] = data().pages[id] || {tasks: {}});
  KA.pref = (name, value) => {
    if (value !== undefined) { data().prefs[name] = value; save(); }
    return data().prefs[name];
  };
  KA.progress = id => {
    const page = data().pages[id];
    if (!page) return {solved: 0, total: 0, done: false, started: false};
    if (id === 'probearbeit') return {solved: page.exam ? 1 : 0, total: 1, done: !!page.exam, started: !!page.exam, exam: page.exam};
    // Knobel-Aufgaben (Level 3 oder data-optional) sind freiwillig: Sie zählen als Bonus, nicht zum Pflichtumfang.
    const required = page.required || [];
    const optional = page.optional || [];
    const ok = id => !!(page.tasks[id] && page.tasks[id].ok);
    const solved = required.filter(ok).length;
    const bonus = optional.filter(ok).length;
    const total = required.length;
    return {solved, total, bonus, bonusTotal: optional.length, done: total > 0 && solved >= total, started: solved + bonus > 0 || !!page.visited};
  };
  KA.reset = () => { store = {pages: {}, prefs: data().prefs}; save(); location.reload(); };

  /* ---------- Zahlen und Terme ---------- */
  KA.parseNumber = raw => {
    let s = String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/^[a-zA-Z]\w*=/, '').replace(',', '.');
    s = s.replace(/(\d)(m|cm|km|s|€|%|°)$/i, '$1');
    if (s === '') return NaN;
    const frac = s.match(/^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (frac) return +frac[1] / +frac[2];
    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? +s : NaN;
  };
  const canon = n => String(+(+n).toFixed(4));
  KA.fmt = (n, digits = 2) => {
    const rounded = +(+n).toFixed(digits);
    return String(Object.is(rounded, -0) ? 0 : rounded).replace('.', ',').replace('-', '−');
  };
  KA.signed = n => (n < 0 ? '− ' : '+ ') + KA.fmt(Math.abs(n));
  function poly(parts) {
    let out = '';
    for (const [coef, sym] of parts) {
      if (!coef) continue;
      const abs = Math.abs(coef);
      // 4 Nachkommastellen: Koeffizienten wie 0,005 aus Modellierungsaufgaben dürfen nicht zu 0,01 gerundet werden.
      const body = (abs === 1 && sym ? '' : KA.fmt(abs, 4)) + sym;
      out += out ? (coef < 0 ? ' − ' : ' + ') + body : (coef < 0 ? '−' : '') + body;
    }
    return out || '0';
  }
  /** x² − 6x + 5 */
  KA.quad = (a, b, c, v = 'x') => poly([[a, v + '²'], [b, v], [c, '']]);
  /** 2x − 3 */
  KA.linear = (m, b, v = 'x') => poly([[m, v], [b, '']]);
  /** (x − 3)² − 4, mit Streckfaktor a davor */
  KA.vertexForm = (a, d, e, v = 'x') => {
    const inner = d === 0 ? v + '²' : '(' + v + (d > 0 ? ' − ' : ' + ') + KA.fmt(Math.abs(d), 4) + ')²';
    const lead = a === 1 ? '' : a === -1 ? '−' : KA.fmt(a, 4) + (d === 0 ? '' : ' · ');
    return lead + inner + (e ? ' ' + (e < 0 ? '− ' : '+ ') + KA.fmt(Math.abs(e), 4) : '');
  };
  KA.point = (x, y, name = '') => name + '(' + KA.fmt(x) + ' | ' + KA.fmt(y) + ')';
  KA.tween = (from, to, ms, step, done) => {
    if (reducedMotion() || ms <= 0) { step(to); done && done(); return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / ms), eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      step(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick); else done && done();
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Koordinatensystem ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, text) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [key, value] of Object.entries(attrs || {})) if (value != null && value !== false) el.setAttribute(key, value);
    if (text != null) el.textContent = text;
    return el;
  };
  const pair = (value, fallback) => Array.isArray(value) ? value : [value ?? fallback, value ?? fallback];
  const color = name => KA.COLORS[name] || name || KA.COLORS.ink;
  const POS = {ne: [9, -9, 'start'], nw: [-9, -9, 'end'], se: [9, 19, 'start'], sw: [-9, 19, 'end'], n: [0, -12, 'middle'], s: [0, 23, 'middle'], e: [12, 5, 'start'], w: [-12, 5, 'end']};
  let plotCount = 0;

  KA.plot = function (target, o = {}) {
    const host = resolve(target);
    const [x0, x1] = o.x || [-5, 5], [y0, y1] = o.y || [-5, 5];
    // Auf schmalen Bildschirmen ein kleineres Koordinatenfeld, damit Schrift und Punkte lesbar bleiben.
    const W = o.width || Math.round(Math.min(560, Math.max(340, host.clientWidth || 560)));
    const pad = Object.assign({l: 34, r: 28, t: 26, b: 30}, o.pad);
    const ux = (W - pad.l - pad.r) / (x1 - x0);
    const uy = o.height ? (o.height - pad.t - pad.b) / (y1 - y0) : ux * (o.aspect || 1);
    const H = o.height || Math.round(pad.t + pad.b + uy * (y1 - y0));
    const X = x => pad.l + (x - x0) * ux, Y = y => pad.t + (y1 - y) * uy;
    const step = pair(o.step, 1), every = pair(o.labelEvery, 1);
    const minor = o.minor === false ? null : o.minor != null ? pair(o.minor) : [ux * step[0] >= 34 ? step[0] / 2 : null, uy * step[1] >= 34 ? step[1] / 2 : null];
    const id = 'ka-plot-' + (++plotCount);
    const axisX = Math.min(Math.max(0, y0), y1), axisY = Math.min(Math.max(0, x0), x1);

    host.classList.add('ka-plot');
    host.textContent = '';
    const svg = s('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label || 'Koordinatensystem'});
    const defs = s('defs');
    const clip = s('clipPath', {id: id + '-clip'});
    clip.append(s('rect', {x: X(x0), y: Y(y1), width: X(x1) - X(x0), height: Y(y0) - Y(y1)}));
    defs.append(clip); svg.append(defs);
    svg.append(s('rect', {x: X(x0), y: Y(y1), width: X(x1) - X(x0), height: Y(y0) - Y(y1), fill: '#fff'}));

    const grid = s('g', {fill: 'none'});
    const lines = (stepPair, stroke, width) => {
      let d = '';
      if (stepPair[0]) for (let x = Math.ceil(x0 / stepPair[0] - 1e-9) * stepPair[0]; x <= x1 + 1e-9; x += stepPair[0]) d += `M${X(x).toFixed(2)} ${Y(y1)}V${Y(y0)}`;
      if (stepPair[1]) for (let y = Math.ceil(y0 / stepPair[1] - 1e-9) * stepPair[1]; y <= y1 + 1e-9; y += stepPair[1]) d += `M${X(x0)} ${Y(y).toFixed(2)}H${X(x1)}`;
      if (d) grid.append(s('path', {d, stroke, 'stroke-width': width}));
    };
    if (minor) lines(minor, '#e6edf5', 1);
    lines(step, '#c9d6e6', 1);
    svg.append(grid);

    const under = s('g', {'clip-path': `url(#${id}-clip)`});
    svg.append(under);

    const axes = s('g');
    const ax = '#42574f';
    axes.append(s('path', {d: `M${X(x0)} ${Y(axisX)}H${X(x1) + 12}M${X(axisY)} ${Y(y0)}V${Y(y1) - 12}`, stroke: ax, 'stroke-width': 1.6, fill: 'none'}));
    axes.append(s('path', {d: `M${X(x1) + 18} ${Y(axisX)}l-9 -4.5v9zM${X(axisY)} ${Y(y1) - 18}l-4.5 9h9z`, fill: ax}));
    const labels = s('g', {'font-size': 12.5, fill: '#4c5f57'});
    const halo = {stroke: '#fff', 'stroke-width': 3.5, 'paint-order': 'stroke', 'stroke-linejoin': 'round'};
    const xl = step[0] * every[0], yl = step[1] * every[1];
    // Geschätzte Textboxen der x-Beschriftungen; y-Beschriftungen, die mit ihnen kollidieren (am Ursprung), entfallen.
    const xBoxes = [];
    const textWidth = text => text.length * 7.2;
    for (let x = Math.ceil(x0 / xl - 1e-9) * xl; x <= x1 + 1e-9; x += xl) {
      const value = +x.toFixed(6);
      if (value === 0 && x0 < 0 && x1 > 0) continue;
      const text = KA.fmt(value), base = Y(axisX) + 17;
      axes.append(s('path', {d: `M${X(value)} ${Y(axisX) - 3.5}v7`, stroke: ax, 'stroke-width': 1.2}));
      labels.append(s('text', Object.assign({x: X(value), y: base, 'text-anchor': 'middle'}, halo), text));
      xBoxes.push([X(value) - textWidth(text) / 2, base - 11, X(value) + textWidth(text) / 2, base + 2]);
    }
    for (let y = Math.ceil(y0 / yl - 1e-9) * yl; y <= y1 + 1e-9; y += yl) {
      const value = +y.toFixed(6);
      if (value === 0 && y0 < 0 && y1 > 0) continue;
      const text = KA.fmt(value), right = X(axisY) - 8, base = Y(value) + 4.5;
      axes.append(s('path', {d: `M${X(axisY) - 3.5} ${Y(value)}h7`, stroke: ax, 'stroke-width': 1.2}));
      const box = [right - textWidth(text), base - 11, right, base + 2];
      if (xBoxes.some(b => box[0] < b[2] + 2 && box[2] > b[0] - 2 && box[1] < b[3] + 2 && box[3] > b[1] - 2)) continue;
      labels.append(s('text', Object.assign({x: right, y: base, 'text-anchor': 'end'}, halo), text));
    }
    const names = o.axis || ['x', 'y'];
    labels.append(s('text', {x: X(x1) + 14, y: Y(axisX) + 19, 'text-anchor': 'middle', 'font-style': 'italic', 'font-size': 14, 'font-weight': 600}, names[0]));
    labels.append(s('text', {x: X(axisY) + 12, y: Y(y1) - 9, 'text-anchor': 'start', 'font-style': 'italic', 'font-size': 14, 'font-weight': 600}, names[1]));
    svg.append(axes, labels);

    const curves = s('g', {'clip-path': `url(#${id}-clip)`});
    const top = s('g');
    const handleLayer = s('g');
    svg.append(curves, top, handleLayer);
    host.append(svg);

    const sample = (f, from, to) => {
      const a = Math.max(x0, from ?? x0), b = Math.min(x1, to ?? x1), n = 220, span = y1 - y0;
      let d = '', pen = false;
      for (let i = 0; i <= n; i++) {
        const x = a + (b - a) * i / n, y = f(x);
        if (!Number.isFinite(y)) { pen = false; continue; }
        const cy = Math.min(Math.max(y, y0 - 3 * span), y1 + 3 * span);
        d += (pen ? 'L' : 'M') + X(x).toFixed(2) + ' ' + Y(cy).toFixed(2);
        pen = true;
      }
      return d;
    };
    const textAt = (layer, px, py, text, opts = {}) => {
      const [dx, dy, anchor] = POS[opts.pos || 'ne'];
      const node = s('text', Object.assign({x: px + dx, y: py + dy, 'text-anchor': anchor, fill: color(opts.color || 'ink'), 'font-size': opts.size || 14, 'font-weight': opts.bold === false ? 500 : 700}, halo, {'stroke-width': 4}), text);
      layer.append(node);
      return node;
    };
    const ctx = {
      X, Y,
      /** Funktionsgraph. opts: color, dash, width, from, to, label, labelAt, pos, under */
      fn(f, opts = {}) {
        const node = s('path', {d: sample(f, opts.from, opts.to), fill: 'none', stroke: color(opts.color || 'f'), 'stroke-width': opts.width || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': opts.dash ? (opts.dash === true ? '8 6' : opts.dash) : null, opacity: opts.opacity});
        (opts.under ? under : curves).append(node);
        if (opts.label != null) {
          const lx = opts.labelAt ?? (x1 - (x1 - x0) * .12);
          textAt(top, X(lx), Y(f(lx)), opts.label, {color: opts.color || 'f', pos: opts.pos || 'e'});
        }
        return node;
      },
      /** Strecke zwischen zwei Punkten. opts: color, dash, width, arrow, label, pos, clip */
      seg(xa, ya, xb, yb, opts = {}) {
        const layer = opts.clip === false ? top : curves;
        const c = color(opts.color || 'p');
        layer.append(s('line', {x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), stroke: c, 'stroke-width': opts.width || 2, 'stroke-linecap': 'round', 'stroke-dasharray': opts.dash ? (opts.dash === true ? '5 4' : opts.dash) : null, opacity: opts.opacity}));
        if (opts.arrow) {
          const ang = Math.atan2(Y(yb) - Y(ya), X(xb) - X(xa)), len = 10, w = .42;
          const px = X(xb), py = Y(yb);
          layer.append(s('path', {d: `M${px} ${py}L${px - len * Math.cos(ang - w)} ${py - len * Math.sin(ang - w)}L${px - len * Math.cos(ang + w)} ${py - len * Math.sin(ang + w)}Z`, fill: c}));
        }
        if (opts.label != null) textAt(top, (X(xa) + X(xb)) / 2, (Y(ya) + Y(yb)) / 2, opts.label, {color: opts.color || 'p', pos: opts.pos || 'e', size: opts.size});
      },
      vline(x, opts = {}) { ctx.seg(x, y0, x, y1, Object.assign({color: 'dim', dash: true, width: 1.6}, opts)); },
      hline(y, opts = {}) { ctx.seg(x0, y, x1, y, Object.assign({color: 'dim', dash: true, width: 1.6}, opts)); },
      /** Punkt. opts: label, color, open, r, pos */
      point(x, y, opts = {}) {
        const c = color(opts.color || 'p');
        top.append(s('circle', {cx: X(x), cy: Y(y), r: opts.r || 5.5, fill: opts.open ? '#fff' : c, stroke: opts.open ? c : '#fff', 'stroke-width': opts.open ? 2.4 : 2}));
        if (opts.label != null) textAt(top, X(x), Y(y), opts.label, {color: opts.color || 'p', pos: opts.pos, size: opts.size});
      },
      label(x, y, text, opts = {}) { return textAt(top, X(x), Y(y), text, Object.assign({pos: 'n'}, opts)); },
      /** Fläche zwischen zwei Funktionen (oder Funktion und Zahl) von a bis b. */
      area(f, g, a, b, opts = {}) {
        const lower = typeof g === 'function' ? g : () => g, n = 80;
        let d = '';
        for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; d += (i ? 'L' : 'M') + X(x).toFixed(2) + ' ' + Y(f(x)).toFixed(2); }
        for (let i = n; i >= 0; i--) { const x = a + (b - a) * i / n; d += 'L' + X(x).toFixed(2) + ' ' + Y(lower(x)).toFixed(2); }
        under.append(s('path', {d: d + 'Z', fill: color(opts.color || 'p'), opacity: opts.opacity ?? .14}));
      },
      /** Vieleck aus Mathe-Koordinaten [[x,y],…]. opts: fill, stroke, opacity, width, top */
      poly(points, opts = {}) {
        (opts.top ? top : under).append(s('polygon', {points: points.map(([x, y]) => X(x).toFixed(2) + ',' + Y(y).toFixed(2)).join(' '), fill: opts.fill ? color(opts.fill) : 'none', stroke: opts.stroke ? color(opts.stroke) : null, 'stroke-width': opts.width || 1.5, opacity: opts.opacity, 'stroke-linejoin': 'round'}));
      },
      /** Beliebiges SVG-Element; Koordinaten selbst mit X() und Y() umrechnen. layer: 'under' | 'curves' | 'top' */
      el(tag, attrs, layer = 'top', text) {
        const node = s(tag, attrs, text);
        ({under, curves, top})[layer].append(node);
        return node;
      },
    };

    let renderFn = null;
    const plot = {
      svg, X, Y, x: [x0, x1], y: [y0, y1], width: W, height: H,
      render(fn) { renderFn = fn; plot.update(); return plot; },
      update() {
        under.textContent = ''; curves.textContent = ''; top.textContent = '';
        if (renderFn) renderFn(ctx);
        for (const item of handles) item.place();
      },
      toMath(evt) {
        const rect = svg.getBoundingClientRect();
        return {x: x0 + ((evt.clientX - rect.left) * W / rect.width - pad.l) / ux, y: y1 - ((evt.clientY - rect.top) * H / rect.height - pad.t) / uy};
      },
      /** Ziehen über die ganze Fläche (z. B. Lineal). opts.axis 'x' lässt senkrechtes Scrollen zu. */
      onDrag(cb, opts = {}) {
        svg.dataset.drag = '';
        svg.style.touchAction = opts.axis === 'x' ? 'pan-y' : opts.axis === 'y' ? 'pan-x' : 'none';
        let active = false;
        const fire = (evt, type) => { const m = plot.toMath(evt); cb({x: Math.min(Math.max(m.x, x0), x1), y: Math.min(Math.max(m.y, y0), y1), type}); };
        svg.addEventListener('pointerdown', evt => { if (evt.target.closest('.ka-handle')) return; active = true; svg.setPointerCapture(evt.pointerId); svg.classList.add('dragging'); fire(evt, 'down'); });
        svg.addEventListener('pointermove', evt => { if (active) fire(evt, 'move'); });
        const end = evt => { if (!active) return; active = false; svg.classList.remove('dragging'); fire(evt, 'up'); };
        svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
        return plot;
      },
      /** Klick oder Tipp auf eine Stelle. opts.snap rastet ein (Zahl oder [sx, sy]). */
      onClick(cb, opts = {}) {
        svg.dataset.click = '';
        const snap = pair(opts.snap, 0);
        svg.addEventListener('click', evt => {
          if (evt.target.closest('.ka-handle')) return;
          const m = plot.toMath(evt);
          if (m.x < x0 - .3 || m.x > x1 + .3 || m.y < y0 - .3 || m.y > y1 + .3) return;
          cb({x: snap[0] ? Math.round(m.x / snap[0]) * snap[0] : m.x, y: snap[1] ? Math.round(m.y / snap[1]) * snap[1] : m.y});
        });
        return plot;
      },
      /** Ziehbarer Punkt, auch mit Pfeiltasten bedienbar.
          opts: x, y, snap, color, name, axis ('x'|'y'), bounds {x:[a,b], y:[a,b]}, constrain(x,y)→[x,y], onMove(handle) */
      handle(opts) {
        const snap = pair(opts.snap, .5);
        const bounds = {x: (opts.bounds && opts.bounds.x) || [x0, x1], y: (opts.bounds && opts.bounds.y) || [y0, y1]};
        const c = color(opts.color || 'p');
        const g = s('g', {class: 'ka-handle', tabindex: 0, role: 'slider', 'aria-label': opts.name || 'Punkt verschieben'});
        g.style.touchAction = 'none';
        g.append(s('circle', {r: 24, fill: 'transparent'}), s('circle', {class: 'ka-handle-ring', r: 14, fill: c, opacity: .16, stroke: c, 'stroke-width': 1.2}), s('circle', {r: 7.5, fill: c, stroke: '#fff', 'stroke-width': 2.2}));
        handleLayer.append(g);
        svg.setAttribute('role', 'group');
        const item = {
          x: opts.x, y: opts.y,
          place() { g.setAttribute('transform', `translate(${X(item.x)} ${Y(item.y)})`); g.setAttribute('aria-valuetext', KA.point(item.x, item.y)); },
          set(x, y, silent) {
            if (opts.axis === 'x') y = item.y;
            if (opts.axis === 'y') x = item.x;
            x = snap[0] ? Math.round(x / snap[0]) * snap[0] : x;
            y = snap[1] ? Math.round(y / snap[1]) * snap[1] : y;
            x = Math.min(Math.max(x, bounds.x[0]), bounds.x[1]);
            y = Math.min(Math.max(y, bounds.y[0]), bounds.y[1]);
            if (opts.constrain) [x, y] = opts.constrain(x, y);
            x = +x.toFixed(6); y = +y.toFixed(6);
            if (x === item.x && y === item.y) return;
            item.x = x; item.y = y;
            if (!silent && opts.onMove) opts.onMove(item);
            plot.update();
          },
        };
        let dragging = false;
        g.addEventListener('pointerdown', evt => { dragging = true; g.setPointerCapture(evt.pointerId); svg.classList.add('dragging'); evt.preventDefault(); g.focus({preventScroll: true}); });
        g.addEventListener('pointermove', evt => { if (dragging) { const m = plot.toMath(evt); item.set(m.x, m.y); } });
        const end = () => { dragging = false; svg.classList.remove('dragging'); };
        g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
        g.addEventListener('keydown', evt => {
          const move = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[evt.key];
          if (!move) return;
          evt.preventDefault();
          item.set(item.x + move[0] * (snap[0] || .25), item.y + move[1] * (snap[1] || .25));
        });
        handles.push(item); item.place();
        return item;
      },
    };
    const handles = [];
    return plot;
  };

  /* ---------- Regler und Umschalter ---------- */
  /** opts: label, min, max, step, value, format(v), onInput(v) */
  KA.slider = function (target, o) {
    const host = resolve(target);
    const fmt = o.format || (v => KA.fmt(v));
    const input = h('input', {type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value ?? 0, 'aria-label': o.aria || o.label});
    const out = h('output', {text: fmt(+input.value)});
    const set = (v, silent) => {
      input.value = v;
      out.textContent = fmt(+input.value);
      input.setAttribute('aria-valuetext', (o.label ? o.label + ' = ' : '') + out.textContent);
      if (!silent && o.onInput) o.onInput(+input.value);
    };
    const nudge = dir => set(+input.value + dir * (+input.step || 1));
    const row = h('div', {class: 'ka-slider'},
      h('span', {class: 'ka-slider-name', text: o.label || ''}),
      h('button', {type: 'button', 'aria-label': (o.label || 'Wert') + ' verkleinern', text: '−', onclick: () => nudge(-1)}),
      input,
      h('button', {type: 'button', 'aria-label': (o.label || 'Wert') + ' vergrößern', text: '+', onclick: () => nudge(1)}),
      out);
    input.addEventListener('input', () => set(+input.value));
    host.append(row);
    input.setAttribute('aria-valuetext', (o.label ? o.label + ' = ' : '') + out.textContent);
    return {get value() { return +input.value; }, set, input};
  };
  /** opts: options [{value, label}], value, label (aria), onChange(value) */
  KA.seg = function (target, o) {
    const host = resolve(target);
    const group = h('div', {class: 'ka-seg', role: 'group', 'aria-label': o.label || 'Auswahl'});
    let current = o.value ?? o.options[0].value;
    const paint = () => $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === String(current))));
    for (const opt of o.options) group.append(h('button', {type: 'button', 'data-value': opt.value, text: opt.label, onclick: () => { current = opt.value; paint(); o.onChange && o.onChange(opt.value); }}));
    paint(); host.append(group);
    return {get value() { return current; }, set(v, silent) { current = v; paint(); if (!silent && o.onChange) o.onChange(v); }};
  };

  /* ---------- Schrittfolgen ---------- */
  function initSteps(box) {
    const steps = $$('[data-step]', box);
    if (!steps.length) return;
    let shown = 1;
    const back = h('button', {type: 'button', class: 'ka-btn', text: '← Zurück'});
    const next = h('button', {type: 'button', class: 'ka-btn primary'});
    const all = h('button', {type: 'button', class: 'ka-btn', text: 'Alle zeigen'});
    const out = h('output');
    const paint = fresh => {
      steps.forEach((step, i) => { step.hidden = i >= shown; step.classList.toggle('is-new', fresh && i === shown - 1); });
      back.disabled = shown <= 1; next.disabled = shown >= steps.length; all.hidden = shown >= steps.length;
      next.textContent = shown >= steps.length ? 'Fertig ✓' : (steps[shown].dataset.step || 'Nächster Schritt') + ' →';
      out.textContent = `Schritt ${shown} von ${steps.length}`;
      box.dispatchEvent(new CustomEvent('ka:step', {bubbles: true, detail: {index: shown - 1, total: steps.length}}));
    };
    back.onclick = () => { shown = Math.max(1, shown - 1); paint(false); };
    next.onclick = () => { shown = Math.min(steps.length, shown + 1); paint(true); };
    all.onclick = () => { shown = steps.length; paint(false); };
    box.append(h('div', {class: 'ka-steps-nav'}, back, next, all, out));
    box.kaGoto = index => { shown = Math.min(steps.length, Math.max(1, index + 1)); paint(false); };
    paint(false);
  }

  /* ---------- Aufgaben ---------- */
  const LEVELS = {1: 'Einstieg', 2: 'Standard', 3: 'Knobeln · freiwillig'};
  const normExpr = raw => String(raw).toLowerCase().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/\^2|\*\*2/g, '²').replace(/[*·⋅]/g, '').replace(/,/g, '.').replace(/^(y|[fgh]\(x\))=/, '');
  /* Kleiner Termparser für den Gleichwertigkeitstest: Zahlen, Buchstaben als Variablen, + − · / ², ^n, Klammern,
     implizite Multiplikation. Liefert eine Funktion vars → Zahl oder null, wenn der Text kein Term ist. */
  function compileExpr(text) {
    const src = normExpr(text).replace(/²/g, '^2').replace(/³/g, '^3').replace(/½/g, '(1/2)');
    if (!src || /[^0-9a-z.+\-/^()]/.test(src)) return null;
    let i = 0;
    const peek = () => src[i];
    const atomStart = c => c != null && /[0-9a-z.(]/.test(c);
    function expr() {
      let node = term();
      while (peek() === '+' || peek() === '-') { const op = src[i++]; const l = node, r = term(); node = op === '+' ? v => l(v) + r(v) : v => l(v) - r(v); }
      return node;
    }
    function term() {
      let node = unary();
      for (;;) {
        if (peek() === '/') { i++; const l = node, r = unary(); node = v => l(v) / r(v); }
        else if (atomStart(peek())) { const l = node, r = power(); node = v => l(v) * r(v); }
        else return node;
      }
    }
    function unary() {
      if (peek() === '-') { i++; const n = unary(); return v => -n(v); }
      if (peek() === '+') { i++; return unary(); }
      return power();
    }
    function power() {
      const base = atom();
      if (peek() !== '^') return base;
      i++;
      const m = src.slice(i).match(/^\d+/);
      if (!m) throw new Error('Hochzahl erwartet');
      i += m[0].length;
      const n = +m[0];
      return v => Math.pow(base(v), n);
    }
    function atom() {
      const c = peek();
      if (c === '(') { i++; const n = expr(); if (src[i++] !== ')') throw new Error('Klammer fehlt'); return n; }
      const num = src.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
      if (num) { i += num[0].length; const value = +num[0]; return () => value; }
      if (c && /[a-z]/.test(c)) { i++; return v => v[c]; }
      throw new Error('Unerwartetes Zeichen');
    }
    try {
      const fn = expr();
      return i === src.length ? fn : null;
    } catch (err) { return null; }
  }
  /** Grobe Form eines Terms: Quadrat einer Klammer, Produkt, ausmultipliziert. */
  const exprShape = text => {
    const s = normExpr(text).replace(/\^2/g, '²');
    if (/\)²/.test(s)) return 'square';
    if (/\)\(|[0-9a-z]\(|\)[0-9a-z]/.test(s)) return 'product';
    return 'expanded';
  };
  /** Prüft zwei Terme an mehreren Belegungen aller vorkommenden Buchstaben auf Gleichheit. */
  function equivalent(a, b) {
    const fa = compileExpr(a), fb = compileExpr(b);
    if (!fa || !fb) return false;
    const letters = [...new Set((normExpr(a) + normExpr(b)).match(/[a-z]/g) || [])];
    const samples = [-2.7, -1.3, 0.4, 1.9, 3.1];
    return samples.every((t, k) => {
      const vars = {};
      letters.forEach((letter, j) => { vars[letter] = t + j * 0.61 + k * 0.17; });
      const x = fa(vars), y = fb(vars);
      return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= 1e-7 * Math.max(1, Math.abs(y));
    });
  }
  KA.equivalent = equivalent;

  const parseSet = raw => {
    const text = String(raw).replace(/[{}]/g, '').replace(/^\s*[a-zA-Z]\s*=/, '').trim();
    if (!text || /^(leer|keine)/i.test(text)) return [];
    return text.split(/;|\bund\b|\boder\b/).map(part => KA.parseNumber(part.replace(/^\s*x[₁₂12]?\s*=/, '')));
  };
  const canonSet = list => [...new Set(list.map(canon))].sort((a, b) => a - b).join(';');
  const parsePoint = raw => String(raw).replace(/[()]/g, '').split('|').map(KA.parseNumber);
  const canonPoints = list => list.map(p => canon(p[0]) + '|' + canon(p[1])).sort().join(';');
  let answerCount = 0;

  function buildAnswer(el, exam) {
    const type = el.dataset.type || 'number';
    const uid = 'ka-a' + (++answerCount);
    const label = el.dataset.label;
    const field = extra => h('input', Object.assign({type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false'}, extra));
    const api = {el, type, inputs: []};
    if (type === 'number' || type === 'expr') {
      const input = field({id: uid, 'aria-label': label ? null : (el.dataset.aria || 'Antwort')});
      if (label) el.append(h('label', {for: uid, text: label}));
      el.append(input);
      if (el.dataset.unit) el.append(h('span', {text: el.dataset.unit}));
      api.inputs = [input];
      api.read = () => input.value.trim();
      api.write = v => { input.value = v || ''; };
    } else if (type === 'set') {
      const input = field({id: uid, placeholder: 'z. B. −2; 3', 'aria-label': 'Lösungen, mit Semikolon getrennt'});
      const none = h('input', {type: 'checkbox', id: uid + 'n'});
      el.append(h('label', {for: uid, text: label || 'L ='}), h('span', {text: '{'}), input, h('span', {text: '}'}), h('label', {class: 'ka-empty', for: uid + 'n'}, none, 'keine Lösung'));
      none.addEventListener('change', () => { input.disabled = none.checked; if (none.checked) input.value = ''; });
      api.inputs = [input, none];
      api.read = () => none.checked ? 'leer' : input.value.trim();
      api.write = v => { none.checked = v === 'leer'; input.disabled = none.checked; input.value = v === 'leer' ? '' : (v || ''); };
    } else if (type === 'point' || type === 'points') {
      const count = type === 'point' ? 1 : el.dataset.answer.split(';').length;
      const names = (el.dataset.names || (type === 'point' ? (label || 'S') : Array.from({length: count}, (_, i) => 'S' + '₁₂₃₄'[i]).join(','))).split(',');
      for (let i = 0; i < count; i++) {
        const xi = field({'aria-label': 'x-Koordinate von ' + names[i]}), yi = field({'aria-label': 'y-Koordinate von ' + names[i]});
        el.append(h('span', {class: 'ka-pt'}, names[i] + ' (', xi, '|', yi, ')'));
        api.inputs.push(xi, yi);
      }
      api.read = () => { const vals = api.inputs.map(i => i.value.trim()); return vals.every(v => !v) ? '' : vals.join('|'); };
      api.write = v => { const vals = (v || '').split('|'); api.inputs.forEach((input, i) => { input.value = vals[i] || ''; }); };
    } else if (type === 'choice') {
      const multi = el.hasAttribute('data-multi');
      el.setAttribute('role', 'group');
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Antwort wählen');
      const buttons = $$('button', el);
      buttons.forEach(b => { b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => {
        if (el.dataset.locked) return;
        if (multi) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        else buttons.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        el.dispatchEvent(new CustomEvent('ka:choice', {bubbles: true}));
      }); });
      api.buttons = buttons;
      api.read = () => buttons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.value).sort().join(';');
      api.write = v => { const picked = (v || '').split(';'); buttons.forEach(b => b.setAttribute('aria-pressed', String(picked.includes(b.dataset.value)))); };
    } else if (type === 'custom') {
      // Eigene Interaktion (z. B. Punkte im Koordinatensystem). Das Seitenskript setzt el.kaValue (Text, wird gespeichert)
      // und el.kaJudge = value => ({ok, msg}). Beim Wiederherstellen feuert 'ka:restore' mit dem gespeicherten Wert.
      api.read = () => el.kaValue || '';
      api.write = v => { el.kaValue = v || ''; el.dispatchEvent(new CustomEvent('ka:restore', {detail: el.kaValue})); };
    } else if (type === 'self' && exam) {
      el.append(h('span', {class: 'ka-small', text: 'Diese Teilaufgabe löst du auf Papier. Nach der Abgabe vergleichst du mit der Lösung und gibst dir selbst Punkte.'}));
      api.read = () => '';
      api.write = () => {};
    } else if (type === 'self') {
      el.setAttribute('role', 'group');
      const yes = h('button', {type: 'button', class: 'ka-btn', text: 'Stimmt bei mir ✓'});
      const no = h('button', {type: 'button', class: 'ka-btn', text: 'Noch nicht'});
      const pick = value => { api.value = value; yes.setAttribute('aria-pressed', String(value === 'ja')); no.setAttribute('aria-pressed', String(value === 'nein')); el.dispatchEvent(new CustomEvent('ka:choice', {bubbles: true})); };
      yes.onclick = () => pick('ja'); no.onclick = () => pick('nein');
      el.append(h('span', {text: el.dataset.label || 'Vergleiche mit dem Lösungsweg:'}), yes, no);
      api.selfButtons = [yes, no];
      api.read = () => api.value || '';
      api.write = v => { if (v) { api.value = v; yes.setAttribute('aria-pressed', String(v === 'ja')); no.setAttribute('aria-pressed', String(v === 'nein')); } };
    } else throw new Error('KA: unbekannter Antworttyp "' + type + '"');
    return api;
  }

  function wrongMap(el, canonKey) {
    if (!el.dataset.wrong) return {};
    let raw;
    try { raw = JSON.parse(el.dataset.wrong); }
    catch (err) { throw new Error('KA: data-wrong ist kein gültiges JSON: ' + el.dataset.wrong); }
    const out = {};
    for (const [key, msg] of Object.entries(raw)) out[canonKey(key)] = msg;
    return out;
  }

  /** Bewertet eine Antwort: {empty} | {ok, msg} */
  function judge(api) {
    const el = api.el, raw = api.read(), target = el.dataset.answer ?? '';
    if (raw === '') return {empty: true};
    const tol = +(el.dataset.tol || 0.001);
    if (api.type === 'number') {
      const v = KA.parseNumber(raw);
      if (Number.isNaN(v)) return {ok: false, msg: 'Gib eine Zahl ein, zum Beispiel −2 oder 1,5.'};
      const goal = KA.parseNumber(target);
      if (Math.abs(v - goal) <= tol) return {ok: true};
      const special = wrongMap(el, k => canon(KA.parseNumber(k)))[canon(v)];
      return {ok: false, msg: special || (Math.abs(v + goal) <= tol && goal !== 0 ? 'Der Betrag stimmt. Prüfe das Vorzeichen.' : '')};
    }
    if (api.type === 'expr') {
      const v = normExpr(raw);
      const alts = target.split('||');
      if (alts.some(alt => normExpr(alt) === v)) return {ok: true};
      const special = wrongMap(el, normExpr)[v];
      if (special) return {ok: false, msg: special};
      // Gleichwertige Umstellung in derselben Form (z. B. 10x + x² + 25 statt x² + 10x + 25) gilt als richtig.
      // Erlaubte Formen: die der hinterlegten Lösungen, die wirklich gleichwertig sind (Tipp-Toleranzen wie „x2“ zählen nicht).
      const shapes = el.dataset.shape ? el.dataset.shape.split('|') : [...new Set(alts.filter(alt => alt === alts[0] || equivalent(alt, alts[0])).map(exprShape))];
      if (equivalent(raw, alts[0])) {
        if (shapes.includes('any') || shapes.includes(exprShape(raw))) return {ok: true};
        const want = {square: 'als Quadrat einer Klammer (Binom oder Scheitelpunktform)', product: 'als Produkt', expanded: 'ausmultipliziert, ohne Klammern'}[shapes[0]];
        return {ok: false, msg: 'Dein Term ist gleichwertig, aber gefragt ist er ' + want + '.'};
      }
      return {ok: false, msg: ''};
    }
    if (api.type === 'set') {
      const list = parseSet(raw), goal = parseSet(target);
      if (list.some(Number.isNaN)) return {ok: false, msg: 'Trenne mehrere Lösungen mit einem Semikolon, zum Beispiel −2; 3.'};
      const a = canonSet(list), b = canonSet(goal);
      if (a === b) return {ok: true};
      const special = wrongMap(el, k => canonSet(parseSet(k)))[a];
      if (special) return {ok: false, msg: special};
      const goalKeys = b ? b.split(';') : [], mine = a ? a.split(';') : [];
      if (!goalKeys.length) return {ok: false, msg: 'Prüfe, ob die Gleichung überhaupt eine Lösung hat.'};
      if (!mine.length) return {ok: false, msg: 'Doch, hier gibt es mindestens eine Lösung.'};
      if (mine.length < goalKeys.length && mine.every(m => goalKeys.includes(m))) return {ok: false, msg: 'Das stimmt, aber es fehlt noch eine Lösung.'};
      if (canonSet(list.map(n => -n)) === b) return {ok: false, msg: 'Die Beträge stimmen. Prüfe die Vorzeichen.'};
      if (mine.some(m => goalKeys.includes(m))) return {ok: false, msg: 'Eine Lösung stimmt, die andere noch nicht.'};
      return {ok: false, msg: ''};
    }
    if (api.type === 'point' || api.type === 'points') {
      const nums = raw.split('|').map(v => v === '' ? NaN : KA.parseNumber(v));
      if (nums.some(Number.isNaN)) return {ok: false, msg: 'Fülle beide Koordinaten mit Zahlen aus.'};
      const mine = []; for (let i = 0; i < nums.length; i += 2) mine.push([nums[i], nums[i + 1]]);
      const goal = target.split(';').map(parsePoint);
      const a = canonPoints(mine), b = canonPoints(goal);
      if (a === b) return {ok: true};
      const special = wrongMap(el, k => canonPoints(k.split(';').map(parsePoint)))[a];
      if (special) return {ok: false, msg: special};
      if (canonPoints(mine.map(p => [p[1], p[0]])) === b) return {ok: false, msg: 'Du hast x und y vertauscht. Zuerst kommt x, dann y.'};
      const xs = l => l.map(p => canon(p[0])).sort().join(';');
      if (xs(mine) === xs(goal)) return {ok: false, msg: 'Die x-Koordinate stimmt. Setze x noch einmal in die Funktion ein, um y zu berechnen.'};
      return {ok: false, msg: ''};
    }
    if (api.type === 'choice') {
      const goal = target.split(';').sort().join(';');
      const picked = api.buttons.filter(b => b.getAttribute('aria-pressed') === 'true');
      if (raw === goal) return {ok: true, msg: picked.map(b => b.dataset.fb).filter(Boolean).join(' ')};
      // Bei falscher Auswahl nur zu den falsch gewählten Knöpfen etwas sagen, sonst stehen Lob und Fehler in einem Satz.
      const goalSet = goal.split(';');
      const wrongPicks = picked.filter(b => !goalSet.includes(b.dataset.value));
      if (wrongPicks.length) return {ok: false, msg: wrongPicks.map(b => b.dataset.fb).filter(Boolean).join(' ')};
      return {ok: false, msg: 'Deine Auswahl stimmt, aber es fehlt noch mindestens eine richtige Antwort.'};
    }
    if (api.type === 'custom') {
      if (typeof el.kaJudge !== 'function') throw new Error('KA: Antworttyp "custom" braucht el.kaJudge = value => ({ok, msg}).');
      const verdict = el.kaJudge(raw);
      return {ok: !!verdict.ok, msg: verdict.msg || ''};
    }
    if (api.type === 'self') return {ok: raw === 'ja', msg: raw === 'ja' ? '' : 'Lies den Lösungsweg noch einmal durch und versuche es dann erneut auf Papier.'};
    throw new Error('KA: unbekannter Antworttyp');
  }
  const paintAnswer = (api, verdict) => {
    api.el.classList.toggle('is-right', !!verdict && verdict.ok === true);
    api.el.classList.toggle('is-wrong', !!verdict && verdict.ok === false);
    if (api.type === 'choice') api.buttons.forEach(b => {
      const pressed = b.getAttribute('aria-pressed') === 'true';
      b.classList.toggle('is-right', !!verdict && pressed && verdict.ok === true);
      b.classList.toggle('is-wrong', !!verdict && pressed && verdict.ok === false);
    });
  };

  let taskNo = 0;
  function initTask(task, exam) {
    const id = task.dataset.task;
    if (!id) throw new Error('KA: .ka-task braucht data-task mit eindeutiger Kennung.');
    const apis = $$('.ka-answer', task).map(el => buildAnswer(el, exam));
    const no = task.dataset.no || String(++taskNo);
    const pointsLabel = task.dataset.points ? ` · ${KA.fmt(+task.dataset.points)} ${+task.dataset.points === 1 ? 'Punkt' : 'Punkte'}` : '';
    const head = h('div', {class: 'ka-task-head'}, h('span', {class: 'ka-task-no', text: 'Aufgabe ' + no + (exam ? pointsLabel : '')}));
    if (!exam && task.dataset.level) head.append(h('span', {class: 'ka-task-level', text: LEVELS[task.dataset.level] || ''}));
    task.prepend(head);
    task.kaApis = apis;
    if (exam) return;

    const saved = pageData(PAGE).tasks[id];
    const feedback = h('p', {class: 'ka-feedback', role: 'status'});
    const instant = apis.length > 0 && apis.every(a => a.type === 'choice' && !a.el.hasAttribute('data-multi') || a.type === 'self');
    const button = h('button', {type: 'button', class: 'ka-btn primary', text: 'Prüfen'});
    const actions = h('div', {class: 'ka-task-actions'}, instant ? null : button, feedback);
    if (apis.length) task.insertBefore(actions, $('details', task) && $('details', task).parentNode === task ? $('details', task) : null);
    let tries = saved ? saved.tries || 0 : 0;

    const check = silent => {
      const verdicts = apis.map(judge);
      if (verdicts.some(v => v.empty)) {
        if (!silent) { feedback.className = 'ka-feedback'; feedback.textContent = instant ? '' : 'Fülle zuerst alle Felder aus.'; }
        return;
      }
      apis.forEach((api, i) => paintAnswer(api, verdicts[i]));
      const ok = verdicts.every(v => v.ok);
      if (!silent) tries++;
      if (ok) {
        feedback.className = 'ka-feedback ok';
        feedback.textContent = ['Richtig!', verdicts.map(v => v.msg).filter(Boolean).join(' ') || task.dataset.success || ''].join(' ').trim();
        task.classList.add('is-solved');
        if (!silent) { task.classList.add('just-solved'); setTimeout(() => task.classList.remove('just-solved'), 600); }
      } else {
        const specific = verdicts.filter(v => v.ok === false).map(v => v.msg).filter(Boolean)[0];
        feedback.className = 'ka-feedback no';
        feedback.textContent = specific || (tries >= 2 ? 'Noch nicht. Öffne einen Tipp oder vergleiche mit dem Lösungsweg.' : 'Noch nicht ganz. Rechne die Schritte noch einmal nach.');
        task.classList.remove('is-solved');
        if (tries >= 2 && !silent) { const help = $('details.ka-hint:not([open])', task) || $('details.ka-solution:not([open])', task); if (help) { help.classList.remove('nudge'); void help.offsetWidth; help.classList.add('nudge'); } }
      }
      if (!silent) {
        pageData(PAGE).tasks[id] = {ok, tries, values: apis.map(a => a.read())};
        save();
        task.dispatchEvent(new CustomEvent(ok ? 'ka:solved' : 'ka:missed', {bubbles: true, detail: {id}}));
      }
    };
    button.addEventListener('click', () => check(false));
    task.addEventListener('keydown', evt => { if (evt.key === 'Enter' && evt.target.matches('input[type=text]')) { evt.preventDefault(); check(false); } });
    if (instant) task.addEventListener('ka:choice', () => check(false));
    if (saved && saved.values) { apis.forEach((api, i) => api.write(saved.values[i])); if (saved.ok) check(true); }
  }

  /* ---------- Probe-Klassenarbeit ---------- */
  const GRADES = [[87, '1', 'sehr gut'], [73, '2', 'gut'], [59, '3', 'befriedigend'], [45, '4', 'ausreichend'], [18, '5', 'mangelhaft'], [0, '6', 'ungenügend']];
  function initExam(exam) {
    const body = $('.ka-exam-body', exam);
    if (!body) throw new Error('KA: [data-ka-exam] braucht ein Kind .ka-exam-body.');
    const minutes = +(exam.dataset.minutes || 40);
    const tasks = $$('.ka-task', body);
    tasks.forEach((task, i) => { if (!task.dataset.no) task.dataset.no = String(i + 1); initTask(task, true); });
    let state = 'idle', left = minutes * 60, timer = null;
    const clock = h('span', {class: 'ka-exam-clock', role: 'timer', 'aria-label': 'Restzeit'});
    const info = h('span', {class: 'ka-small'});
    const start = h('button', {type: 'button', class: 'ka-btn primary', text: 'Arbeit starten'});
    const submit = h('button', {type: 'button', class: 'ka-btn primary', text: 'Abgeben und auswerten', hidden: true});
    const again = h('button', {type: 'button', class: 'ka-btn', text: 'Neu starten', hidden: true});
    const headBar = h('div', {class: 'ka-exam-head'}, h('div', {}, clock, ' ', info), h('div', {class: 'ka-btnrow', style: 'margin:0'}, start, submit, again));
    const result = h('div', {class: 'ka-result', hidden: true, 'aria-live': 'polite'});
    exam.insertBefore(headBar, body); exam.insertBefore(result, body);
    const total = tasks.reduce((sum, t) => sum + +(t.dataset.points || 0), 0);
    const paintClock = () => {
      const m = Math.floor(Math.abs(left) / 60), sec = Math.abs(left) % 60;
      clock.textContent = (left < 0 ? '+' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      clock.classList.toggle('low', left <= 300);
      info.textContent = state === 'idle' ? `${minutes} Minuten · ${KA.fmt(total)} Punkte · ohne Taschenrechner` : state === 'running' ? (left < 0 ? 'Zeit abgelaufen. Gib ab, wenn du fertig bist.' : 'Die Zeit läuft.') : 'Ausgewertet.';
    };
    const setState = next => {
      state = next; exam.dataset.state = next;
      start.hidden = next !== 'idle'; submit.hidden = next !== 'running'; again.hidden = next !== 'done';
      paintClock();
    };
    const score = () => {
      let points = 0;
      const topics = {};
      for (const task of tasks) {
        const max = +(task.dataset.points || 0), apis = task.kaApis;
        const each = apis.map(a => a.el.dataset.points != null ? +a.el.dataset.points : null);
        const open = max - each.filter(v => v != null).reduce((a, b) => a + b, 0), unset = each.filter(v => v == null).length;
        let got = 0;
        apis.forEach((api, i) => {
          const worth = each[i] != null ? each[i] : open / unset;
          if (api.type === 'self') got += Math.min(worth, +(api.selfPoints || 0));
          else { const verdict = judge(api); paintAnswer(api, verdict.empty ? {ok: false} : verdict); if (verdict.ok) got += worth; }
        });
        // Auf Viertelpunkte abrunden: Ein falscher Teil darf nicht durch Rundung wieder volle Punkte bringen.
        got = Math.floor(got * 4 + 1e-9) / 4;
        points += got;
        const topic = task.dataset.topic || 'sonstiges';
        topics[topic] = topics[topic] || {got: 0, max: 0};
        topics[topic].got += got; topics[topic].max += max;
        let badge = $('.ka-exam-points', task);
        if (!badge) { badge = h('span', {class: 'ka-exam-points'}); $('.ka-task-head', task).append(badge); }
        badge.textContent = `${KA.fmt(got)} / ${KA.fmt(max)} P.`;
        badge.className = 'ka-exam-points ' + (got >= max ? 'full' : got > 0 ? 'part' : 'zero');
      }
      const percent = total ? Math.round(points / total * 100) : 0;
      const grade = GRADES.find(g => percent >= g[0]);
      result.hidden = false; result.textContent = '';
      const bars = h('div', {class: 'ka-result-bars'});
      const weak = [];
      for (const [topic, value] of Object.entries(topics)) {
        const mod = KA.MODULES.find(m => m.id === topic);
        const share = value.max ? value.got / value.max : 0;
        if (mod && share < .6) weak.push(mod);
        bars.append(h('div', {class: 'ka-result-bar'}, h('span', {text: mod ? mod.short : 'Weitere'}), h('i', {}, h('b', {style: `width:${Math.round(share * 100)}%`})), h('span', {text: `${KA.fmt(value.got)} / ${KA.fmt(value.max)}`})));
      }
      const advice = h('p', {style: 'margin-top:14px'});
      if (weak.length) { advice.append('Das lohnt sich noch einmal: '); weak.forEach((mod, i) => advice.append(i ? ', ' : '', h('a', {href: mod.href, text: mod.title}))); advice.append('.'); }
      else advice.textContent = 'Starke Leistung in allen Bereichen. Schau dir trotzdem jeden Lösungsweg an, bei dem dir Punkte fehlen.';
      result.append(
        h('div', {class: 'ka-result-top'}, h('div', {class: 'ka-grade', text: grade[1]}), h('div', {},
          h('h3', {style: 'margin:0', text: `${KA.fmt(points)} von ${KA.fmt(total)} Punkten · ${percent} %`}),
          h('p', {text: `Das entspricht etwa der Note ${grade[1]} (${grade[2]}). Der Schlüssel dient zur Orientierung, deine Lehrkraft kann anders bewerten.`}))),
        bars, advice);
      pageData('probearbeit').exam = {points, total, percent, grade: grade[1]};
      save();
    };
    start.onclick = () => {
      setState('running');
      timer = setInterval(() => { left--; paintClock(); }, 1000);
      body.scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start'});
    };
    submit.onclick = () => {
      clearInterval(timer);
      setState('done');
      for (const task of tasks) {
        for (const api of task.kaApis) {
          api.inputs.forEach(input => { input.disabled = true; });
          if (api.type === 'choice') api.el.dataset.locked = '1';
          if (api.type === 'self') {
            const max = +(api.el.dataset.points || task.dataset.points || 1);
            api.el.textContent = '';
            const row = h('div', {class: 'ka-self-points', role: 'group', 'aria-label': 'Punkte selbst vergeben'}, h('span', {text: 'Vergleiche mit der Lösung und gib dir Punkte:'}));
            for (let p = 0; p <= max; p++) row.append(h('button', {type: 'button', text: String(p), 'aria-pressed': 'false', onclick: evt => { api.selfPoints = p; $$('button', row).forEach(b => b.setAttribute('aria-pressed', String(b === evt.currentTarget))); score(); }}));
            api.el.append(row);
          }
        }
        $$('details.ka-solution', task).forEach(d => { d.open = true; });
      }
      score();
      result.scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start'});
    };
    again.onclick = () => location.reload();
    setState('idle');
  }

  /* ---------- Leiste, Timer, Navigation ---------- */
  function initBar() {
    const bar = $('[data-ka-bar]');
    if (!bar) return;
    bar.classList.add('ka-bar');
    const mods = h('nav', {class: 'ka-bar-mods', 'aria-label': 'Module der Lerneinheit'});
    KA.MODULES.slice(1).forEach((mod, i) => mods.append(h('a', {href: mod.href, 'data-mod': mod.id, 'aria-current': mod.id === PAGE ? 'page' : null, title: mod.title}, h('i', {text: String(i + 1)}), h('span', {text: mod.short}))));
    const count = h('span', {class: 'ka-bar-count'});
    const side = h('div', {class: 'ka-bar-side'}, count);
    const mod = KA.MODULES.find(m => m.id === PAGE);
    if (mod && PAGE !== 'start' && PAGE !== 'probearbeit') {
      const page = pageData(PAGE);
      let elapsed = page.seconds || 0, running = false, tick = null;
      const time = h('time');
      const toggle = h('button', {type: 'button'});
      const box = h('div', {class: 'ka-timer'}, time, toggle);
      const paint = () => {
        time.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')} / ${mod.minutes}′`;
        toggle.textContent = running ? '❚❚' : '▶';
        toggle.setAttribute('aria-label', running ? 'Modulzeit anhalten' : `Modulzeit starten (geplant: ${mod.minutes} Minuten)`);
        box.classList.toggle('over', elapsed > mod.minutes * 60);
      };
      toggle.onclick = () => {
        running = !running;
        clearInterval(tick);
        if (running) tick = setInterval(() => { elapsed++; if (elapsed % 10 === 0) { page.seconds = elapsed; save(); } paint(); }, 1000);
        else { page.seconds = elapsed; save(); }
        paint();
      };
      paint(); side.append(box);
    }
    const track = h('div');
    bar.append(h('div', {class: 'ka-bar-inner'}, h('a', {class: 'ka-bar-home', href: BASE, text: 'Klassenarbeit 10'}), mods, side), h('div', {class: 'ka-bar-track', 'aria-hidden': 'true'}, track));
    const paintBar = () => {
      $$('a', mods).forEach(a => a.classList.toggle('is-done', KA.progress(a.dataset.mod).done));
      const prog = KA.progress(PAGE);
      const show = PAGE !== 'start' && PAGE !== 'probearbeit' && prog.total > 0;
      count.textContent = show ? `${prog.solved}/${prog.total}` + (prog.bonus ? ` +${prog.bonus}` : '') : '';
      count.title = show ? `${prog.solved} von ${prog.total} Pflichtaufgaben gelöst` + (prog.bonusTotal ? `, ${prog.bonus} von ${prog.bonusTotal} Knobelaufgaben` : '') : '';
      track.style.width = show ? (prog.solved / prog.total * 100) + '%' : '0';
    };
    document.addEventListener('ka:progress', paintBar);
    paintBar();
    const current = $('[aria-current=page]', mods);
    if (current && current.scrollIntoView) current.scrollIntoView({block: 'nearest', inline: 'center'});
  }
  function initNext() {
    const host = $('[data-ka-next]');
    if (!host) return;
    const index = KA.MODULES.findIndex(m => m.id === PAGE);
    if (index < 0) return;
    host.classList.add('ka-next');
    host.setAttribute('aria-label', 'Weiter in der Lerneinheit');
    const prev = KA.MODULES[index - 1], next = KA.MODULES[index + 1];
    host.append(prev ? h('a', {href: prev.href}, h('small', {text: '← Zurück'}), h('b', {text: prev.title})) : h('span', {class: 'gap'}));
    host.append(next ? h('a', {class: 'fwd', href: next.href}, h('small', {text: `Weiter · ${next.minutes} Minuten →`}), h('b', {text: next.title})) : h('a', {class: 'fwd', href: BASE}, h('small', {text: 'Geschafft →'}), h('b', {text: 'Zur Übersicht'})));
  }
  function initFormel() {
    const apply = () => { document.body.dataset.formel = KA.pref('formel') || 'pq'; };
    apply();
    $$('[data-ka-formel]').forEach(host => {
      host.textContent = '';
      KA.seg(host, {label: 'Welche Lösungsformel nutzt deine Klasse?', value: document.body.dataset.formel, options: [{value: 'pq', label: 'p-q-Formel'}, {value: 'abc', label: 'abc-Formel (Mitternachtsformel)'}], onChange: value => { KA.pref('formel', value); apply(); $$('[data-ka-formel] .ka-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value))); document.dispatchEvent(new CustomEvent('ka:formel', {detail: value})); }});
    });
  }

  function boot() {
    initFormel();
    $$('.ka-steps').forEach(initSteps);
    $$('[data-ka-exam]').forEach(initExam);
    const tasks = $$('.ka-task').filter(task => !task.closest('[data-ka-exam]'));
    const ids = new Set();
    for (const task of tasks) {
      if (ids.has(task.dataset.task)) throw new Error('KA: doppelte Aufgabenkennung ' + task.dataset.task);
      ids.add(task.dataset.task);
      initTask(task, false);
    }
    if (PAGE && PAGE !== 'start') {
      const page = pageData(PAGE);
      page.visited = true;
      if (PAGE !== 'probearbeit') {
        const isOptional = task => task.dataset.level === '3' || task.hasAttribute('data-optional');
        page.required = tasks.filter(task => !isOptional(task)).map(task => task.dataset.task);
        page.optional = tasks.filter(isOptional).map(task => task.dataset.task);
        delete page.total;
        for (const key of Object.keys(page.tasks)) if (!ids.has(key)) delete page.tasks[key];
      }
      save();
    }
    initBar();
    initNext();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
