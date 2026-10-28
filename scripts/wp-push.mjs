// Publica los contenidos de content/ en WordPress mediante la API REST.
// Crea o actualiza (por slug) entradas a partir de artículos y comparativas, y páginas a partir de content/pages.
//
// Variables de entorno:
//   WP_URL           URL del sitio WordPress (p. ej. https://pruebas.ejemplo.es)
//   WP_USER          usuario de WordPress
//   WP_APP_PASSWORD  contraseña de aplicación (Usuarios › Perfil › Contraseñas de aplicación)
//   WP_STATUS        estado de las entradas: pending (por defecto), draft o publish
//
// Uso: node scripts/wp-push.mjs [--pages] [--only=slug1,slug2] [--dry-run]

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, parseFrontMatter, escapeHtml as e } from './lib/markdown.mjs';
import { validateArticle, validateComparison, checkAffiliateProgram } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const WITH_PAGES = args.includes('--pages');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const STATUS = process.env.WP_STATUS || 'pending';
if (!['pending', 'draft', 'publish'].includes(STATUS)) throw new Error(`WP_STATUS no válido: ${STATUS}`);

const { WP_URL, WP_USER, WP_APP_PASSWORD } = process.env;
if (!DRY && (!WP_URL || !WP_USER || !WP_APP_PASSWORD)) {
  console.error('Faltan WP_URL, WP_USER o WP_APP_PASSWORD (o usa --dry-run).');
  process.exit(1);
}
const base = WP_URL ? WP_URL.replace(/\/$/, '') : 'https://example.invalid';
const basePath = new URL(base).pathname.replace(/\/$/, '');
const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const taxonomy = JSON.parse(await readFile(path.join(ROOT, 'wordpress/zona-core/taxonomy.json'), 'utf8'));
const affiliates = JSON.parse(await readFile(path.join(ROOT, 'content/affiliates.json'), 'utf8'));

async function api(method, route, body) {
  if (DRY) return method === 'GET' ? [] : { id: 0, link: '(simulado)' };
  const res = await fetch(`${base}/wp-json/wp/v2/${route}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${route} → HTTP ${res.status}: ${data?.message || text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Carga y validación ----------
async function loadDir(dir, ext) {
  const full = path.join(ROOT, dir);
  return (await readdir(full)).filter(f => f.endsWith(ext)).sort().map(f => path.join(full, f));
}

const items = [];
for (const file of await loadDir('content/articles', '.md')) {
  const { data, body } = parseFrontMatter(await readFile(file, 'utf8'), file);
  validateArticle(data, taxonomy, path.relative(ROOT, file));
  items.push({ kind: 'article', ...data, body });
}
for (const file of await loadDir('content/comparisons', '.json')) {
  const c = JSON.parse(await readFile(file, 'utf8'));
  validateComparison(c, taxonomy, path.relative(ROOT, file));
  items.push({ kind: 'comparison', type: 'comparativa', ...c });
}
const bySlug = new Map(items.map(i => [i.slug, i]));

function permalinkPath(item) {
  return `${basePath}/${item.category}/${item.subcategory ? item.subcategory + '/' : ''}${item.slug}/`;
}

function linkResolver(where) {
  return (label, href) => {
    if (href.startsWith('aff:')) {
      const [, program, ...rest] = href.split(':');
      checkAffiliateProgram(program, affiliates); // falla si el programa no está verificado
      return `<a href="${e(rest.join(':'))}">${label}</a>`; // el plugin añade rel="sponsored" y la etiqueta
    }
    if (href.startsWith('art:')) {
      const target = bySlug.get(href.slice(4));
      if (!target) throw new Error(`${where}: enlace a contenido inexistente ${href}`);
      return `<a href="${permalinkPath(target)}">${label}</a>`;
    }
    if (href.startsWith('/')) return `<a href="${basePath}${href}">${label}</a>`;
    if (/^https?:\/\//.test(href)) return `<a href="${e(href)}" rel="noopener">${label}</a>`;
    throw new Error(`${where}: enlace no admitido ${href}`);
  };
}

function comparisonHtml(c) {
  const resolveLink = linkResolver(c.slug);
  const intro = renderMarkdown(c.intro || '', { resolveLink }).html;
  const verdict = renderMarkdown(c.verdict || '', { resolveLink }).html;
  const head = `<tr><th scope="col">Característica</th>${c.items.map(it => `<th scope="col"><strong>${e(it.name)}</strong>${it.summary ? `<br><small>${e(it.summary)}</small>` : ''}</th>`).join('')}</tr>`;
  const rows = c.attributes.map(a => `<tr><th scope="row">${e(a.label)}${a.help ? `<br><small>${e(a.help)}</small>` : ''}</th>${c.items.map(it => `<td>${e(String(c.values[it.id][a.key]))}</td>`).join('')}</tr>`).join('');
  return `${intro}\n<figure class="wp-block-table zona-cmp"><table><thead>${head}</thead><tbody>${rows}</tbody></table></figure>\n${verdict ? `<h2>Conclusión</h2>\n${verdict}` : ''}`;
}

// ---------- Categorías y etiquetas ----------
const catCache = new Map();
async function categoryId(slug) {
  if (catCache.has(slug)) return catCache.get(slug);
  const found = await api('GET', `categories?slug=${encodeURIComponent(slug)}`);
  if (!DRY && !found.length) throw new Error(`La categoría "${slug}" no existe en WordPress. Activa el plugin Zona de Oferta · Núcleo.`);
  const id = found[0]?.id || 0;
  catCache.set(slug, id);
  return id;
}

let canCreateTags = true;
async function tagIds(names = []) {
  const ids = [];
  for (const name of names) {
    const found = await api('GET', `tags?search=${encodeURIComponent(name)}&per_page=20`);
    const exact = found.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (exact) { ids.push(exact.id); continue; }
    if (!canCreateTags) continue;
    try {
      ids.push((await api('POST', 'tags', { name })).id);
    } catch (err) {
      if (err.status === 401 || err.status === 403) canCreateTags = false; // el rol no puede crear etiquetas: se omiten
      else throw err;
    }
  }
  return ids;
}

async function upsert(type, slug, payload) {
  const existing = await api('GET', `${type}?slug=${encodeURIComponent(slug)}&status=any&context=edit`);
  if (existing.length) {
    const res = await api('POST', `${type}/${existing[0].id}`, payload);
    return { action: 'actualizado', res };
  }
  return { action: 'creado', res: await api('POST', type, { slug, ...payload }) };
}

// ---------- Envío ----------
let done = 0;
for (const item of items) {
  if (ONLY.length && !ONLY.includes(item.slug)) continue;
  const html = item.kind === 'comparison'
    ? comparisonHtml(item)
    : renderMarkdown(item.body, { resolveLink: linkResolver(item.slug) }).html;
  const payload = {
    title: item.title,
    content: html,
    excerpt: item.dek,
    status: STATUS,
    categories: [await categoryId(item.subcategory || item.category)],
    tags: await tagIds(item.tags),
    meta: { zona_formato: item.type, zona_fuentes: JSON.stringify(item.sources || []) },
  };
  const { action, res } = await upsert('posts', item.slug, payload);
  console.log(`${action}: ${item.slug} (${STATUS}) ${res.link || ''}`);
  done++;
}

if (WITH_PAGES) {
  for (const file of await loadDir('content/pages', '.md')) {
    const { data, body } = parseFrontMatter(await readFile(file, 'utf8'), file);
    if (ONLY.length && !ONLY.includes(data.slug)) continue;
    const { html } = renderMarkdown(body, { resolveLink: linkResolver(data.slug) });
    // Las páginas legales llevan datos [PENDIENTE]: se suben siempre como borrador.
    const status = /\[PENDIENTE/.test(body) ? 'draft' : STATUS;
    const { action, res } = await upsert('pages', data.slug, { title: data.title, content: html, excerpt: data.description, status });
    console.log(`${action}: página ${data.slug} (${status}) ${res.link || ''}`);
    done++;
  }
}

console.log(`${DRY ? 'Simulación' : 'Envío'} completado: ${done} elementos.`);
