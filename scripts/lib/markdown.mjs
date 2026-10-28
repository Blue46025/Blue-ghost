// Conversor Markdown mínimo y sin dependencias. Cubre solo lo que usa el contenido:
// encabezados ##/###, párrafos, listas, citas (> ), tablas, negrita, cursiva, código y enlaces.
// Enlaces de afiliación: [texto](aff:programa:https://...) → se resuelven con resolveLink().

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inline(text, ctx) {
  const codes = [];
  let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => ctx.resolveLink(label, href.replace(/&amp;/g, '&')));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}

/**
 * @returns {{ html: string, headings: {level:number,id:string,text:string}[] }}
 */
export function renderMarkdown(src, ctx) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  const usedIds = new Set();
  let i = 0;

  const para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '), ctx)}</p>`);
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { flushPara(); i++; continue; }

    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = h[1].length;
      let id = slugify(h[2]);
      while (usedIds.has(id)) id += '-2';
      usedIds.add(id);
      headings.push({ level, id, text: h[2] });
      out.push(`<h${level} id="${id}">${inline(h[2], ctx)}</h${level}>`);
      i++; continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const ordered = /^\s*\d+\.\s+/.test(line);
      const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i].replace(re, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item, ctx)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      let cls = 'note';
      let first = buf[0] || '';
      const m = first.match(/^\[!(nota|aviso|clave)\]\s*(.*)$/i);
      if (m) { cls = m[1].toLowerCase(); buf[0] = m[2]; }
      const inner = buf.join('\n').split(/\n\s*\n/).map(p => `<p>${inline(p.replace(/\n/g, ' '), ctx)}</p>`).join('');
      out.push(`<aside class="callout callout--${cls}">${inner}</aside>`);
      continue;
    }

    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushPara();
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla"><table><thead><tr>${head.map(c => `<th scope="col">${inline(c, ctx)}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows.map(r => `<tr>${r.map((c, j) => j === 0 ? `<th scope="row">${inline(c, ctx)}</th>` : `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      );
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return { html: out.join('\n'), headings };
}

export function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: falta el bloque de metadatos (front matter)`);
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { throw new Error(`${file}: metadatos JSON no válidos: ${e.message}`); }
  return { data, body: m[2] };
}

export function plainText(md) {
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`>|]/g, ' ')
    .replace(/\[!\w+\]/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
