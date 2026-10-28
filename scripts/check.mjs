// Comprobaciones sobre dist/ tras el build. Sale con código 1 si algo falla.
// Uso: npm run check  (ejecuta build + check)

import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProduct, checkAffiliateProgram } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(await readFile(path.join(ROOT, 'src/config/site.json'), 'utf8'));
const affiliates = JSON.parse(await readFile(path.join(ROOT, 'src/config/affiliates.json'), 'utf8'));

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
let checks = 0;
const ok = () => { checks++; };

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}
async function exists(p) { try { await stat(p); return true; } catch { return false; } }

function resolveLocal(href) {
  const clean = decodeURI(href.split('#')[0].split('?')[0]);
  const rel = clean.slice(site.basePath.length);
  return rel.endsWith('/') ? path.join(DIST, rel, 'index.html') : path.join(DIST, rel);
}

const files = await walk(DIST);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const canonicals = new Map();

for (const file of htmlFiles) {
  const rel = '/' + path.relative(DIST, file);
  const html = await readFile(file, 'utf8');

  const titles = html.match(/<title>[^<]+<\/title>/g) || [];
  titles.length === 1 ? ok() : fail(rel, `debe tener exactamente un <title> (tiene ${titles.length})`);
  /<html lang="es-ES">/.test(html) ? ok() : fail(rel, 'falta lang="es-ES"');
  const desc = html.match(/<meta name="description" content="([^"]*)">/);
  desc && desc[1].length >= 50 ? ok() : fail(rel, 'meta description ausente o demasiado corta');
  const h1s = html.match(/<h1[\s>]/g) || [];
  h1s.length === 1 ? ok() : fail(rel, `debe tener exactamente un <h1> (tiene ${h1s.length})`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)">/);
  if (!canon) fail(rel, 'falta canonical');
  else {
    ok();
    if (canonicals.has(canon[1]) && !rel.endsWith('404.html')) fail(rel, `canonical duplicado con ${canonicals.get(canon[1])}`);
    canonicals.set(canon[1], rel);
  }
  if (site.private) /<meta name="robots" content="noindex/.test(html) ? ok() : fail(rel, 'versión privada sin noindex');

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      data['@context'] === 'https://schema.org' && data['@type'] ? ok() : fail(rel, 'JSON-LD sin @context o @type');
      if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
        for (const k of ['headline', 'datePublished', 'dateModified', 'author', 'publisher']) data[k] ? ok() : fail(rel, `Article sin ${k}`);
        data.headline.length <= 110 ? ok() : fail(rel, 'headline de más de 110 caracteres');
      }
    } catch (err) { fail(rel, `JSON-LD no válido: ${err.message}`); }
  }

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    /\balt="/.test(m[0]) ? ok() : fail(rel, `imagen sin alt: ${m[0]}`);
    /\bwidth="\d+"/.test(m[0]) && /\bheight="\d+"/.test(m[0]) ? ok() : fail(rel, 'imagen sin dimensiones (CLS)');
  }

  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const attrs = m[1];
    const href = (attrs.match(/href="([^"]*)"/) || [])[1];
    if (!href) { fail(rel, `enlace sin href: ${m[0]}`); continue; }
    if (/class="[^"]*\baff\b/.test(attrs) && !/rel="sponsored/.test(attrs)) fail(rel, `enlace afiliado sin rel="sponsored": ${href}`);
    if (/target="_blank"/.test(attrs) && !/noopener/.test(attrs)) fail(rel, `target=_blank sin noopener: ${href}`);
    if (href.startsWith('/')) (await exists(resolveLocal(href))) ? ok() : fail(rel, `enlace interno roto: ${href}`);
    else if (href.startsWith('#')) {
      const id = href.slice(1);
      !id || html.includes(`id="${id}"`) ? ok() : fail(rel, `ancla inexistente: ${href}`);
    }
  }
  for (const m of html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="(\/[^"]+)"/g)) {
    (await exists(resolveLocal(m[1]))) ? ok() : fail(rel, `recurso no encontrado: ${m[1]}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*src="(\/[^"]+)"/g)) {
    (await exists(resolveLocal(m[1]))) ? ok() : fail(rel, `imagen no encontrada: ${m[1]}`);
  }

  // Elementos intrusivos prohibidos por la línea editorial
  for (const bad of [/<form\b(?![^>]*role="search")/, /<iframe\b/, /<dialog\b/, /window\.open\(/]) {
    bad.test(html) ? fail(rel, `elemento no permitido: ${bad}`) : ok();
  }
}

// Sitemap y robots
const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const p = m[1].replace(site.baseUrl.replace(/\/$/, ''), '');
  (await exists(resolveLocal(p))) ? ok() : fail('sitemap.xml', `URL sin página: ${m[1]}`);
}
const robots = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
if (site.private) /Disallow: \/\n/.test(robots) ? ok() : fail('robots.txt', 'la versión privada debe bloquear el rastreo');

// Índice de búsqueda
const index = JSON.parse(await readFile(path.join(DIST, 'search-index.json'), 'utf8'));
for (const d of index) (await exists(resolveLocal(d.u))) ? ok() : fail('search-index.json', `URL inexistente: ${d.u}`);
index.length > 0 ? ok() : fail('search-index.json', 'índice vacío');

// Secciones: ninguna página de categoría sin tarjetas
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (/class="section-head"/.test(html) && !/class="card /.test(html) && !/data-search/.test(html)) fail(path.relative(DIST, file), 'sección sin contenidos');
}

// Reglas comerciales: deben rechazar datos inventados o no verificados
function expectThrow(name, fn) {
  try { fn(); fail('reglas', `${name}: debía rechazarse y se aceptó`); } catch { ok(); }
}
const base = { slug: 'x', name: 'X', brand: 'B', reference: 'R-1', category: 'tecnologia', summary: 'Resumen' };
expectThrow('precio sin fecha de comprobación', () => validateProduct({ ...base, offers: [{ merchant: 'Tienda', url: 'https://example.com', price: 10 }] }, affiliates));
expectThrow('afiliado no verificado', () => validateProduct({ ...base, offers: [{ merchant: 'Tienda', url: 'https://example.com', checkedAt: '2026-10-28', affiliateProgram: 'amazon-es' }] }, affiliates));
expectThrow('disponibilidad inventada', () => validateProduct({ ...base, offers: [{ merchant: 'Tienda', url: 'https://example.com', checkedAt: '2026-10-28', availability: 'quedan pocas' }] }, affiliates));
expectThrow('enlace aff: con programa no verificado', () => checkAffiliateProgram('awin', affiliates));
try { validateProduct({ ...base, offers: [{ merchant: 'Tienda', url: 'https://example.com', price: 10, checkedAt: '2026-10-28' }] }, affiliates); ok(); }
catch (err) { fail('reglas', `producto válido rechazado: ${err.message}`); }
for (const prog of affiliates.programs) (prog.trackingId === null || prog.status === 'verificado') ? ok() : fail('affiliates.json', `${prog.id} tiene trackingId sin estar verificado`);

// Puerta de producción: con el estado actual (borradores, dominio pendiente) debe bloquearse
const prod = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--production'], { encoding: 'utf8' });
if (prod.status === 0) fail('build --production', 'se ha completado pese a haber bloqueos; revisar las puertas de publicación');
else { ok(); console.log('Puerta de producción activa. Bloqueos detectados:\n' + prod.stderr.trim().split('\n').slice(1, 6).join('\n') + '\n  …'); }

if (failures.length) {
  console.error(`\n✗ ${failures.length} fallos (${checks} comprobaciones correctas):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`\n✓ ${checks} comprobaciones superadas en ${htmlFiles.length} páginas HTML.`);
