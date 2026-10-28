// Zona de Oferta — interacción mínima: tema, buscador y comparativas. Sin dependencias ni rastreo.
(function () {
  'use strict';

  // ---------- Tema: sistema → claro → oscuro ----------
  var KEY = 'zdo-theme';
  var LABELS = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' };
  var root = document.documentElement;

  function stored() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; }
  }
  function apply(mode) {
    if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    try { if (mode === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) { /* almacenamiento no disponible */ }
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', 'Cambiar tema. Actual: ' + LABELS[mode]);
      var lbl = btns[i].querySelector('[data-theme-label]');
      if (lbl) lbl.textContent = LABELS[mode];
    }
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var order = ['system', 'light', 'dark'];
    apply(order[(order.indexOf(stored()) + 1) % order.length]);
  });

  // ---------- Utilidades ----------
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  // Para buscar: además ignora guiones, de modo que "wifi" encuentra "Wi-Fi" y "usbc" encuentra "USB-C".
  function normSearch(s) {
    return norm(s).replace(/-/g, '');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  // Resalta ignorando tildes. norm() conserva la longitud de textos en NFC, así que los índices coinciden.
  function highlight(text, terms) {
    text = String(text).normalize('NFC');
    var n = norm(text), marks = [];
    terms.forEach(function (t) {
      if (t.length < 2) return;
      for (var i = n.indexOf(t); i !== -1; i = n.indexOf(t, i + t.length)) marks.push([i, i + t.length]);
    });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    marks.forEach(function (m) {
      if (m[0] < pos) return;
      out += esc(text.slice(pos, m[0])) + '<mark>' + esc(text.slice(m[0], m[1])) + '</mark>';
      pos = m[1];
    });
    return out + esc(text.slice(pos));
  }

  // ---------- Buscador ----------
  function initSearch(form) {
    var input = form.querySelector('input[name="q"]');
    var select = form.querySelector('select[name="cat"]');
    var list = document.querySelector('[data-search-results]');
    var status = document.querySelector('[data-search-status]');
    var index = null;
    var base = (document.querySelector('link[rel="icon"]').getAttribute('href') || '').replace(/\/assets\/favicon\.svg$/, '');

    var params = new URLSearchParams(location.search);
    input.value = params.get('q') || '';
    select.value = params.get('cat') || '';

    function run() {
      if (!index) return;
      var terms = normSearch(input.value).split(/\s+/).filter(Boolean);
      var cat = select.value;
      var url = new URL(location.href);
      url.searchParams.set('q', input.value);
      if (cat) url.searchParams.set('cat', cat); else url.searchParams.delete('cat');
      history.replaceState(null, '', url);

      if (!terms.length && !cat) { list.innerHTML = ''; status.textContent = 'Escribe un término o elige una sección.'; return; }
      var hits = [];
      index.forEach(function (d) {
        if (cat && d.c !== cat) return;
        var t = normSearch(d.t), de = normSearch(d.d), g = normSearch(d.g), b = normSearch(d.b);
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
          var w = terms[i], s = 0;
          if (t.indexOf(w) !== -1) s += 10;
          if (g.indexOf(w) !== -1) s += 6;
          if (de.indexOf(w) !== -1) s += 4;
          if (b.indexOf(w) !== -1) s += 1;
          if (!s) return; // todos los términos deben aparecer
          score += s;
        }
        hits.push({ d: d, s: score || 1 });
      });
      hits.sort(function (a, b) { return b.s - a.s; });
      status.textContent = hits.length === 1 ? '1 resultado' : hits.length + ' resultados';
      list.innerHTML = hits.map(function (h) {
        var d = h.d;
        return '<li><a href="' + esc(d.u) + '"><span class="kicker">' + esc(d.cn) + ' · ' + esc(d.k) + '</span>' +
          '<span class="r-title">' + highlight(d.t, terms) + '</span><span class="r-dek">' + highlight(d.d, terms) + '</span></a></li>';
      }).join('');
    }

    form.addEventListener('submit', function (ev) { ev.preventDefault(); run(); });
    input.addEventListener('input', run);
    select.addEventListener('change', run);

    status.textContent = 'Cargando índice…';
    fetch(base + '/search-index.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { index = data; run(); if (!input.value) input.focus(); })
      .catch(function () { status.textContent = 'No se pudo cargar el índice de búsqueda.'; });
  }

  // ---------- Comparativas ----------
  function initComparison(box) {
    var items = box.querySelectorAll('[data-cmp-item]');
    var diff = box.querySelector('[data-cmp-diff]');
    var rows = box.querySelectorAll('tr[data-row]');
    var status = box.querySelector('[data-cmp-status]');

    function update() {
      var visible = [];
      items.forEach(function (cb) { if (cb.checked) visible.push(cb.getAttribute('data-cmp-item')); });
      if (!visible.length) { items[0].checked = true; visible.push(items[0].getAttribute('data-cmp-item')); }
      box.querySelectorAll('[data-col]').forEach(function (cell) {
        cell.hidden = visible.indexOf(cell.getAttribute('data-col')) === -1;
      });
      var hiddenRows = 0;
      rows.forEach(function (row) {
        var vals = [];
        row.querySelectorAll('td').forEach(function (td) { if (!td.hidden) vals.push(td.textContent.trim()); });
        var differs = vals.some(function (v) { return v !== vals[0]; });
        row.classList.toggle('is-diff', differs && visible.length > 1);
        row.hidden = diff.checked && !differs && visible.length > 1;
        if (row.hidden) hiddenRows++;
      });
      status.textContent = 'Comparando ' + visible.length + ' de ' + items.length + ' opciones' +
        (hiddenRows ? ' · ' + hiddenRows + ' filas iguales ocultas' : '') + '. Las filas resaltadas tienen valores distintos.';
    }
    items.forEach(function (cb) { cb.addEventListener('change', update); });
    diff.addEventListener('change', update);
    update();
  }

  function init() {
    apply(stored());
    var form = document.querySelector('[data-search]');
    if (form) initSearch(form);
    document.querySelectorAll('[data-cmp]').forEach(initComparison);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
