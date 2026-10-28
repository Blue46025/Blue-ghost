// Tema Zona: selector de tema, índice del artículo y comparativas interactivas. Sin dependencias ni rastreo.
(function () {
	'use strict';

	var KEY = 'zona-theme';
	var LABELS = { system: 'sistema', light: 'claro', dark: 'oscuro' };
	var root = document.documentElement;

	function stored() {
		try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; }
	}
	function apply(mode) {
		if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
		try { if (mode === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) { /* sin almacenamiento */ }
		document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
			b.setAttribute('aria-label', 'Cambiar tema. Actual: ' + LABELS[mode]);
		});
	}
	document.addEventListener('click', function (ev) {
		if (!ev.target.closest || !ev.target.closest('[data-theme-toggle]')) return;
		var order = ['system', 'light', 'dark'];
		apply(order[(order.indexOf(stored()) + 1) % order.length]);
	});

	function slug(s) {
		return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	// Índice: se construye con los h2 del artículo si hay al menos tres.
	function buildToc() {
		var nav = document.querySelector('[data-toc]');
		if (!nav) return;
		var heads = nav.parentElement.querySelectorAll(':scope > h2, :scope > .wp-block-group h2');
		if (heads.length < 3) return;
		var list = nav.querySelector('ol');
		heads.forEach(function (h) {
			if (!h.id) h.id = slug(h.textContent);
			var li = document.createElement('li');
			var a = document.createElement('a');
			a.href = '#' + h.id;
			a.textContent = h.textContent;
			li.appendChild(a);
			list.appendChild(li);
		});
		nav.hidden = false;
	}

	// Comparativas: cualquier tabla dentro de .zona-cmp con cabecera de columnas.
	function enhanceComparison(box) {
		var table = box.querySelector('table');
		if (!table || !table.tHead) return;
		var headCells = Array.prototype.slice.call(table.tHead.rows[0].cells, 1);
		if (headCells.length < 2) return;
		var rows = Array.prototype.slice.call(table.tBodies[0].rows);

		var controls = document.createElement('div');
		controls.className = 'cmp-controls';
		var items = document.createElement('div');
		items.className = 'cmp-controls__items';
		items.setAttribute('role', 'group');
		items.setAttribute('aria-label', 'Elige qué comparar');
		var boxes = headCells.map(function (cell, i) {
			var label = document.createElement('label');
			label.className = 'chip';
			var cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.checked = true;
			cb.dataset.col = String(i + 1);
			label.appendChild(cb);
			// El nombre es el <strong> de la cabecera si existe (el resto es un resumen opcional).
			label.appendChild(document.createTextNode(' ' + (cell.querySelector('strong') || cell).textContent.trim()));
			items.appendChild(label);
			return cb;
		});
		var diffLabel = document.createElement('label');
		diffLabel.className = 'chip';
		var diff = document.createElement('input');
		diff.type = 'checkbox';
		diffLabel.appendChild(diff);
		diffLabel.appendChild(document.createTextNode(' Solo diferencias'));
		controls.appendChild(items);
		controls.appendChild(diffLabel);
		var status = document.createElement('p');
		status.className = 'cmp-status';
		status.setAttribute('aria-live', 'polite');
		box.insertBefore(controls, box.firstChild);
		box.insertBefore(status, controls.nextSibling);

		function update() {
			var visible = boxes.filter(function (b) { return b.checked; }).map(function (b) { return +b.dataset.col; });
			if (!visible.length) { boxes[0].checked = true; visible = [1]; }
			Array.prototype.forEach.call(table.rows, function (row) {
				Array.prototype.forEach.call(row.cells, function (cell, idx) {
					if (idx > 0) cell.hidden = visible.indexOf(idx) === -1;
				});
			});
			var hiddenRows = 0;
			rows.forEach(function (row) {
				var vals = visible.map(function (i) { return row.cells[i] ? row.cells[i].textContent.trim() : ''; });
				var differs = vals.some(function (v) { return v !== vals[0]; });
				row.classList.toggle('is-diff', differs && visible.length > 1);
				row.hidden = diff.checked && !differs && visible.length > 1;
				if (row.hidden) hiddenRows++;
			});
			status.textContent = 'Comparando ' + visible.length + ' de ' + boxes.length + ' opciones' +
				(hiddenRows ? ' · ' + hiddenRows + ' filas iguales ocultas' : '') + '. Las filas resaltadas tienen valores distintos.';
		}
		boxes.forEach(function (b) { b.addEventListener('change', update); });
		diff.addEventListener('change', update);
		update();
	}

	function init() {
		apply(stored());
		buildToc();
		document.querySelectorAll('.zona-cmp').forEach(enhanceComparison);
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
