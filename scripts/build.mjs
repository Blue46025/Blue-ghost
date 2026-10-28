// Genera el sitio estático en dist/. Uso: node scripts/build.mjs [--production]
// En modo privado (por defecto) todas las páginas llevan noindex y robots.txt bloquea el rastreo.
// --production aplica las puertas de publicación: dominio definitivo, sin borradores y sin textos legales pendientes.

import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, parseFrontMatter, plainText, escapeHtml as e } from './lib/markdown.mjs';
import { validateArticle, validateComparison, validateProduct, checkAffiliateProgram, ARTICLE_TYPES } from './lib/validate.mjs';
import { createTemplates, coverSvg, formatDate } from './lib/templates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PRODUCTION = process.argv.includes('--production');

const readJson = async p => JSON.parse(await readFile(path.join(SRC, p), 'utf8'));
const site = await readJson('config/site.json');
const taxonomy = await readJson('config/taxonomy.json');
const affiliates = await readJson('config/affiliates.json');
const products = await readJson('content/products.json');

if (PRODUCTION) site.private = false;

const url = p => site.basePath + p;
const abs = p => site.baseUrl.replace(/\/$/, '') + site.basePath + p;

// ---------- Carga de contenidos ----------
async function loadMarkdownDir(dir) {
  const files = (await readdir(path.join(SRC, dir))).filter(f => f.endsWith('.md')).sort();
  return Promise.all(files.map(async f => {
    const raw = await readFile(path.join(SRC, dir, f), 'utf8');
    return { file: `${dir}/${f}`, ...parseFrontMatter(raw, f) };
  }));
}

const articles = [];
for (const { file, data, body } of await loadMarkdownDir('content/articles')) {
  validateArticle(data, taxonomy, file);
  const cat = taxonomy.categories.find(c => c.slug === data.category);
  const sub = data.subcategory ? cat.children.find(s => s.slug === data.subcategory) : null;
  const words = plainText(body).split(' ').length;
  articles.push({
    ...data, body, file, cat, sub, kind: 'article',
    path: `/${cat.slug}/${sub ? sub.slug + '/' : ''}${data.slug}/`,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    words,
  });
}

const comparisons = [];
for (const f of (await readdir(path.join(SRC, 'content/comparisons'))).filter(f => f.endsWith('.json')).sort()) {
  const c = await readJson(`content/comparisons/${f}`);
  validateComparison(c, taxonomy, f);
  const cat = taxonomy.categories.find(x => x.slug === c.category);
  const sub = c.subcategory ? cat.children.find(s => s.slug === c.subcategory) : null;
  comparisons.push({ ...c, cat, sub, kind: 'comparison', type: 'comparativa', path: `/comparativas/${c.slug}/` });
}

for (const p of products) validateProduct(p, affiliates);

const pages = (await loadMarkdownDir('content/pages')).map(({ data, body, file }) => ({ ...data, body, file }));

// Unicidad de slugs y rutas
const allSlugs = new Map();
for (const item of [...articles, ...comparisons]) {
  if (allSlugs.has(item.slug)) throw new Error(`slug duplicado: ${item.slug}`);
  allSlugs.set(item.slug, item);
}

// ---------- Puertas de producción ----------
if (PRODUCTION) {
  const blockers = [];
  if (/example\.invalid/.test(site.baseUrl)) blockers.push('baseUrl sigue siendo example.invalid (dominio definitivo pendiente)');
  for (const a of [...articles, ...comparisons]) if (a.status !== 'revisado') blockers.push(`contenido sin revisión editorial: ${a.slug}`);
  for (const p of pages) if (/\[PENDIENTE/.test(p.body)) blockers.push(`página legal con datos pendientes: ${p.slug}`);
  if (blockers.length) {
    console.error('BUILD DE PRODUCCIÓN BLOQUEADO:\n  - ' + blockers.join('\n  - '));
    process.exit(1);
  }
}

// ---------- Utilidades de render ----------
const byDate = (a, b) => (b.updated || b.date).localeCompare(a.updated || a.date) || a.title.localeCompare(b.title, 'es');
articles.sort(byDate);
comparisons.sort(byDate);

const populated = taxonomy.categories
  .map(c => ({ ...c, items: articles.filter(a => a.category === c.slug), children: c.children.filter(s => articles.some(a => a.category === c.slug && a.subcategory === s.slug)) }))
  .filter(c => c.items.length > 0);

const assetVersion = createHash('sha1')
  .update(await readFile(path.join(SRC, 'assets/css/main.css')))
  .update(await readFile(path.join(SRC, 'assets/js/main.js')))
  .digest('hex').slice(0, 8);

const T = createTemplates({ site, url, abs, nav: populated, assetVersion });

function makeLinkResolver(state) {
  return (label, href) => {
    if (href.startsWith('aff:')) {
      const [, programId, ...rest] = href.split(':');
      const target = rest.join(':');
      checkAffiliateProgram(programId, affiliates);
      state.affiliate = true;
      return `<a href="${e(target)}" rel="sponsored nofollow noopener" class="aff">${label}<span class="aff__tag">Enlace afiliado</span></a>`;
    }
    if (href.startsWith('art:')) {
      const target = allSlugs.get(href.slice(4));
      if (!target) throw new Error(`${state.file}: enlace interno a contenido inexistente "${href}"`);
      state.internal.add(target.slug);
      return `<a href="${url(target.path)}">${label}</a>`;
    }
    if (href.startsWith('/') || href.startsWith('#')) return `<a href="${href.startsWith('/') ? url(href) : href}">${label}</a>`;
    if (/^https?:\/\//.test(href)) return `<a href="${e(href)}" rel="noopener" class="ext">${label}</a>`;
    throw new Error(`${state.file}: enlace no admitido "${href}"`);
  };
}

function organizationLd() {
  return { '@type': 'Organization', name: site.name, url: abs('/') };
}

const out = new Map(); // ruta → contenido
const emit = (p, html) => {
  if (out.has(p)) throw new Error(`ruta duplicada: ${p}`);
  out.set(p, html);
};

function related(item) {
  const chosen = [];
  for (const slug of item.related || []) {
    const r = allSlugs.get(slug);
    if (!r) throw new Error(`${item.file || item.slug}: related apunta a "${slug}", que no existe`);
    chosen.push(r);
  }
  const pool = [...articles, ...comparisons].filter(x => x.slug !== item.slug && !chosen.includes(x));
  const score = x => (x.subcategory && x.subcategory === item.subcategory ? 2 : 0) + (x.category === item.category ? 1 : 0);
  pool.sort((a, b) => score(b) - score(a) || byDate(a, b));
  for (const x of pool) { if (chosen.length >= 3) break; if (score(x) > 0) chosen.push(x); }
  return chosen.slice(0, 3);
}

function sourcesBlock(sources) {
  if (!sources?.length) return '';
  return `<section class="sources" aria-labelledby="fuentes"><h2 id="fuentes">Fuentes</h2><ol>${sources.map(s =>
    `<li><a href="${e(s.url)}" rel="noopener" class="ext">${e(s.title)}</a>${s.publisher ? ` <span class="muted">· ${e(s.publisher)}</span>` : ''}${s.accessed ? ` <span class="muted">· consultada el ${formatDate(s.accessed)}</span>` : ''}</li>`).join('')}</ol></section>`;
}

function disclosure(hasAffiliate) {
  return hasAffiliate
    ? `<aside class="disclosure disclosure--aff" role="note"><strong>Transparencia:</strong> este contenido incluye enlaces de afiliación, marcados como tales. Si compras a través de ellos podemos recibir una comisión, sin coste adicional para ti. No condiciona nuestras conclusiones. <a href="${url('/legal/afiliacion-y-publicidad/')}">Más información</a>.</aside>`
    : `<aside class="disclosure" role="note">Este contenido no incluye enlaces de afiliación ni contenido patrocinado. <a href="${url('/legal/afiliacion-y-publicidad/')}">Cómo nos financiamos</a>.</aside>`;
}

function draftNotice(item) {
  return item.status === 'borrador'
    ? '<aside class="draft-note" role="note"><strong>Borrador pendiente de revisión editorial.</strong> Texto redactado con asistencia de inteligencia artificial; debe contrastarse con las fuentes citadas y revisarse por una persona antes de publicarse.</aside>'
    : '';
}

// ---------- Artículos ----------
for (const a of articles) {
  const state = { affiliate: false, internal: new Set(), file: a.file };
  const { html, headings } = renderMarkdown(a.body, { resolveLink: makeLinkResolver(state) });
  const crumbs = [{ name: 'Portada', path: '/' }, { name: a.cat.name, path: `/${a.cat.slug}/` }];
  if (a.sub) crumbs.push({ name: a.sub.name, path: `/${a.cat.slug}/${a.sub.slug}/` });
  crumbs.push({ name: a.title, path: a.path });
  const toc = headings.filter(h => h.level === 2);
  const rel = related(a);
  const body = `
<article class="article wrap">
  ${T.breadcrumbs(crumbs)}
  <header class="article__head">
    ${T.kicker(a)}
    <h1 class="article__title">${e(a.title)}</h1>
    <p class="article__dek">${e(a.dek)}</p>
    <p class="article__meta">${e(a.author || site.editorialAuthor)} · <time datetime="${a.date}">${formatDate(a.date)}</time>${a.updated && a.updated !== a.date ? ` · Actualizado el <time datetime="${a.updated}">${formatDate(a.updated)}</time>` : ''} · ${a.readingMinutes} min de lectura</p>
  </header>
  <figure class="article__cover">${T.cover(a, { size: 'lg', eager: true })}</figure>
  <div class="article__layout">
    ${toc.length > 2 ? `<nav class="toc" aria-label="Índice del artículo"><details open><summary>En este artículo</summary><ol>${toc.map(h => `<li><a href="#${h.id}">${e(h.text)}</a></li>`).join('')}</ol></details></nav>` : ''}
    <div class="prose">
      ${draftNotice(a)}
      ${state.affiliate ? disclosure(true) : ''}
      ${html}
      ${sourcesBlock(a.sources)}
      ${state.affiliate ? '' : disclosure(false)}
    </div>
  </div>
</article>
${rel.length ? `<section class="related wrap" aria-labelledby="rel-h"><h2 id="rel-h" class="section-title">Para seguir leyendo</h2><div class="grid grid--3">${rel.map(r => T.card(r)).join('')}</div></section>` : ''}`;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': a.type === 'noticia' ? 'NewsArticle' : 'Article',
      headline: a.title,
      description: a.description,
      inLanguage: site.language,
      datePublished: a.date,
      dateModified: a.updated || a.date,
      author: organizationLd(),
      publisher: organizationLd(),
      mainEntityOfPage: abs(a.path),
      articleSection: a.cat.name,
      wordCount: a.words,
    },
    T.breadcrumbLd(crumbs),
  ];
  emit(a.path, T.layout({ title: a.title, description: a.description, path: a.path, body, jsonld: ld, ogType: 'article', currentCat: a.cat.slug, bodyClass: 'page-article' }));
}

// ---------- Comparativas ----------
for (const c of comparisons) {
  const state = { affiliate: false, internal: new Set(), file: c.slug };
  const resolveLink = makeLinkResolver(state);
  const intro = renderMarkdown(c.intro || '', { resolveLink }).html;
  const verdict = renderMarkdown(c.verdict || '', { resolveLink }).html;
  const crumbs = [{ name: 'Portada', path: '/' }, { name: 'Comparativas', path: '/comparativas/' }, { name: c.title, path: c.path }];
  const rel = related(c);
  const table = `
<div class="cmp" data-cmp>
  <fieldset class="cmp__controls">
    <legend>Elige qué comparar</legend>
    <div class="cmp__chips">${c.items.map(it => `<label class="chip"><input type="checkbox" checked data-cmp-item="${e(it.id)}"> ${e(it.name)}</label>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-cmp-diff> Mostrar solo diferencias</label>
  </fieldset>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Tabla comparativa: ${e(c.title)}">
    <table class="cmp__table">
      <thead><tr><th scope="col"><span class="sr-only">Característica</span></th>${c.items.map(it => `<th scope="col" data-col="${e(it.id)}">${e(it.name)}${it.summary ? `<span class="cmp__sum">${e(it.summary)}</span>` : ''}</th>`).join('')}</tr></thead>
      <tbody>${c.attributes.map(attr => `<tr data-row>
        <th scope="row">${e(attr.label)}${attr.help ? `<span class="cmp__help">${e(attr.help)}</span>` : ''}</th>
        ${c.items.map(it => `<td data-col="${e(it.id)}">${e(String(c.values[it.id][attr.key]))}</td>`).join('')}
      </tr>`).join('')}</tbody>
    </table>
  </div>
  <p class="cmp__status muted" aria-live="polite" data-cmp-status></p>
</div>`;
  const body = `
<article class="article wrap">
  ${T.breadcrumbs(crumbs)}
  <header class="article__head">
    ${T.kicker(c)}
    <h1 class="article__title">${e(c.title)}</h1>
    <p class="article__dek">${e(c.dek)}</p>
    <p class="article__meta">${e(site.editorialAuthor)} · <time datetime="${c.date}">${formatDate(c.date)}</time>${c.updated && c.updated !== c.date ? ` · Actualizado el <time datetime="${c.updated}">${formatDate(c.updated)}</time>` : ''}</p>
  </header>
  <div class="prose prose--wide">
    ${draftNotice(c)}
    ${intro}
  </div>
  ${table}
  <div class="prose prose--wide">
    ${verdict ? `<h2 id="conclusion">Conclusión</h2>${verdict}` : ''}
    ${sourcesBlock(c.sources)}
    ${disclosure(state.affiliate)}
  </div>
</article>
${rel.length ? `<section class="related wrap" aria-labelledby="rel-h"><h2 id="rel-h" class="section-title">Relacionado</h2><div class="grid grid--3">${rel.map(r => T.card(r)).join('')}</div></section>` : ''}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Article', headline: c.title, description: c.description, inLanguage: site.language,
    datePublished: c.date, dateModified: c.updated || c.date, author: organizationLd(), publisher: organizationLd(), mainEntityOfPage: abs(c.path),
  }, T.breadcrumbLd(crumbs)];
  emit(c.path, T.layout({ title: c.title, description: c.description, path: c.path, body, jsonld: ld, ogType: 'article', currentCat: 'comparativas', bodyClass: 'page-article' }));
}

// Índice de comparativas
{
  const crumbs = [{ name: 'Portada', path: '/' }, { name: 'Comparativas', path: '/comparativas/' }];
  const body = `<div class="wrap">${T.breadcrumbs(crumbs)}
<header class="section-head"><h1 class="section-head__title">Comparativas</h1><p class="section-head__dek">Tablas interactivas para comparar tecnologías y estándares lado a lado. Puedes ocultar opciones y ver solo lo que las diferencia.</p></header>
<div class="grid grid--3">${comparisons.map(c => T.card(c)).join('')}</div></div>`;
  emit('/comparativas/', T.layout({ title: 'Comparativas', description: 'Comparativas interactivas de tecnologías, estándares y opciones de compra, con datos técnicos y fuentes citadas.', path: '/comparativas/', body, jsonld: [T.breadcrumbLd(crumbs)], currentCat: 'comparativas' }));
}

// ---------- Categorías y subcategorías ----------
for (const c of populated) {
  const crumbs = [{ name: 'Portada', path: '/' }, { name: c.name, path: `/${c.slug}/` }];
  const cmp = comparisons.filter(x => x.category === c.slug);
  const subnav = c.children.length ? `<nav class="subnav" aria-label="Subsecciones de ${e(c.name)}"><ul>${c.children.map(s => `<li><a class="chip" href="${url(`/${c.slug}/${s.slug}/`)}">${e(s.name)}</a></li>`).join('')}</ul></nav>` : '';
  const [lead, ...rest] = c.items;
  const body = `<div class="wrap">${T.breadcrumbs(crumbs)}
<header class="section-head" style="--cat:${c.color}"><h1 class="section-head__title">${e(c.name)}</h1><p class="section-head__dek">${e(c.description)}</p>${subnav}</header>
<div class="grid grid--feature">${T.card(lead, { variant: 'lead', eager: true })}${rest.length ? `<div class="stack">${rest.slice(0, 2).map(a => T.card(a, { variant: 'compact' })).join('')}</div>` : ''}</div>
${rest.length > 2 ? `<div class="grid grid--3 mt">${rest.slice(2).map(a => T.card(a)).join('')}</div>` : ''}
${cmp.length ? `<section class="mt" aria-labelledby="cmp-h"><h2 id="cmp-h" class="section-title">Comparativas de ${e(c.name.toLowerCase())}</h2><div class="grid grid--3">${cmp.map(x => T.card(x)).join('')}</div></section>` : ''}
</div>`;
  emit(`/${c.slug}/`, T.layout({ title: c.name, description: `${c.description} Guías y análisis de ${c.name.toLowerCase()} en ${site.name}.`.slice(0, 160), path: `/${c.slug}/`, body, jsonld: [T.breadcrumbLd(crumbs)], currentCat: c.slug }));

  for (const s of c.children) {
    const items = c.items.filter(a => a.subcategory === s.slug);
    const sc = [...crumbs, { name: s.name, path: `/${c.slug}/${s.slug}/` }];
    const sbody = `<div class="wrap">${T.breadcrumbs(sc)}
<header class="section-head" style="--cat:${c.color}"><p class="section-head__parent"><a href="${url(`/${c.slug}/`)}">${e(c.name)}</a></p><h1 class="section-head__title">${e(s.name)}</h1><p class="section-head__dek">${e(s.description)}</p></header>
<div class="grid grid--3">${items.map(a => T.card(a)).join('')}</div></div>`;
    emit(`/${c.slug}/${s.slug}/`, T.layout({ title: `${s.name} · ${c.name}`, description: `${s.description} Guías y análisis de ${s.name.toLowerCase()} en la sección de ${c.name.toLowerCase()} de ${site.name}.`.slice(0, 160), path: `/${c.slug}/${s.slug}/`, body: sbody, jsonld: [T.breadcrumbLd(sc)], currentCat: c.slug }));
  }
}

// ---------- Portada ----------
{
  const featured = articles.filter(a => a.featured);
  const [lead, ...secondary] = featured.length ? featured : articles;
  const latest = articles.filter(a => a !== lead && !secondary.slice(0, 2).includes(a)).slice(0, 6);
  // Secciones con 3 o más piezas tienen fila propia; las demás se agrupan para no dejar filas casi vacías.
  const big = populated.filter(c => c.items.length >= 3);
  const small = populated.filter(c => c.items.length < 3);
  const sections = big.map(c => `
<section class="home-section" aria-labelledby="s-${c.slug}" style="--cat:${c.color}">
  <header class="home-section__head"><h2 id="s-${c.slug}" class="section-title"><a href="${url(`/${c.slug}/`)}">${e(c.name)}</a></h2><a class="more" href="${url(`/${c.slug}/`)}">Ver sección ${T.icons.arrow}</a></header>
  <div class="grid grid--3">${c.items.slice(0, 3).map(a => T.card(a)).join('')}</div>
</section>`).join('') + (small.length ? `
<section class="home-section" aria-labelledby="s-more">
  <header class="home-section__head"><h2 id="s-more" class="section-title">Más secciones</h2></header>
  <nav class="subnav" aria-label="Otras secciones"><ul>${small.map(c => `<li><a class="chip" href="${url(`/${c.slug}/`)}">${e(c.name)}</a></li>`).join('')}</ul></nav>
  <div class="grid grid--3 mt-sm">${small.flatMap(c => c.items.slice(0, 2)).map(a => T.card(a)).join('')}</div>
</section>` : '');
  const body = `<div class="wrap">
<h1 class="sr-only">${e(site.name)}: ${e(site.tagline)}</h1>
<section class="home-top" aria-label="Destacados">
  <div class="home-top__lead">${T.card(lead, { variant: 'lead', eager: true })}</div>
  <div class="home-top__side">${secondary.slice(0, 2).map(a => T.card(a, { variant: 'side' })).join('')}</div>
</section>
<section class="home-latest" aria-labelledby="latest-h">
  <h2 id="latest-h" class="section-title">Lo último</h2>
  <ol class="latest">${latest.map(a => `<li><a href="${url(a.path)}">${T.kicker(a)}<span class="latest__title">${e(a.title)}</span></a></li>`).join('')}</ol>
</section>
<section class="home-cmp" aria-labelledby="cmp-h">
  <header class="home-section__head"><h2 id="cmp-h" class="section-title"><a href="${url('/comparativas/')}">Comparativas</a></h2><a class="more" href="${url('/comparativas/')}">Todas ${T.icons.arrow}</a></header>
  <div class="grid grid--3">${comparisons.slice(0, 3).map(c => T.card(c)).join('')}</div>
</section>
${sections}
<section class="promise" aria-labelledby="promise-h">
  <h2 id="promise-h">Cómo trabajamos</h2>
  <p>Explicamos antes de recomendar. Citamos fuentes primarias, fechamos los datos y separamos con claridad la información de cualquier relación comercial. Sin ventanas emergentes, sin registros y sin formularios de captación.</p>
  <a class="btn" href="${url('/como-trabajamos/')}">Nuestra metodología ${T.icons.arrow}</a>
</section>
</div>`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: abs('/'), inLanguage: site.language, description: site.description,
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('/buscar/') + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
  }, { '@context': 'https://schema.org', ...organizationLd() }];
  emit('/', T.layout({ title: `${site.name} · ${site.tagline}`, fullTitle: true, description: site.description, path: '/', body, jsonld: ld, bodyClass: 'page-home' }));
}

// ---------- Buscador ----------
{
  const crumbs = [{ name: 'Portada', path: '/' }, { name: 'Buscar', path: '/buscar/' }];
  const body = `<div class="wrap">${T.breadcrumbs(crumbs)}
<header class="section-head"><h1 class="section-head__title">Buscar</h1></header>
<form class="search" role="search" action="${url('/buscar/')}" method="get" data-search>
  <label class="sr-only" for="q">Términos de búsqueda</label>
  <input id="q" name="q" type="search" placeholder="Busca guías, comparativas o temas: wifi, garantía, SSD…" autocomplete="off" spellcheck="false">
  <label class="sr-only" for="cat">Filtrar por sección</label>
  <select id="cat" name="cat"><option value="">Todas las secciones</option>${populated.map(c => `<option value="${c.slug}">${e(c.name)}</option>`).join('')}<option value="comparativas">Comparativas</option></select>
  <button class="btn" type="submit">Buscar</button>
</form>
<p class="muted" aria-live="polite" data-search-status></p>
<ol class="results" data-search-results></ol>
<noscript><p>El buscador necesita JavaScript. Puedes navegar por las secciones desde el menú superior.</p></noscript>
</div>`;
  emit('/buscar/', T.layout({ title: 'Buscar', description: `Busca guías, análisis y comparativas en ${site.name} por tema o sección.`, path: '/buscar/', body, jsonld: [T.breadcrumbLd(crumbs)] }));
}

// ---------- Páginas estáticas (legales y metodología) ----------
for (const p of pages) {
  const state = { affiliate: false, internal: new Set(), file: p.file };
  const { html } = renderMarkdown(p.body, { resolveLink: makeLinkResolver(state) });
  const crumbs = [{ name: 'Portada', path: '/' }, { name: p.title, path: p.path }];
  const pending = /\[PENDIENTE/.test(p.body);
  const body = `<article class="article wrap">${T.breadcrumbs(crumbs)}
<header class="article__head"><h1 class="article__title">${e(p.title)}</h1>${p.updated ? `<p class="article__meta">Última revisión: <time datetime="${p.updated}">${formatDate(p.updated)}</time></p>` : ''}</header>
<div class="prose">${pending ? '<aside class="draft-note" role="note"><strong>Borrador jurídico no válido para publicar.</strong> Contiene datos pendientes del titular y debe revisarlo un profesional antes de la publicación.</aside>' : ''}${html}</div></article>`;
  emit(p.path, T.layout({ title: p.title, description: p.description, path: p.path, body, jsonld: [T.breadcrumbLd(crumbs)] }));
}

// ---------- Fichas de producto ----------
// Solo se generan para productos de src/content/products.json que superan validateProduct().
const AVAILABILITY = { 'en-stock': ['En stock', 'https://schema.org/InStock'], 'sin-stock': ['Sin stock', 'https://schema.org/OutOfStock'], reserva: ['En reserva', 'https://schema.org/PreOrder'] };
const eur = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
for (const p of products) {
  const cat = taxonomy.categories.find(c => c.slug === p.category);
  if (!cat) throw new Error(`producto ${p.slug}: categoría inexistente ${p.category}`);
  const ppath = `/productos/${p.slug}/`;
  const crumbs = [{ name: 'Portada', path: '/' }, { name: cat.name, path: `/${cat.slug}/` }, { name: p.name, path: ppath }];
  const hasAff = (p.offers || []).some(o => o.affiliateProgram);
  const offers = (p.offers || []).map(o => `<li class="offer">
    <span class="offer__merchant">${e(o.merchant)}</span>
    ${o.price != null ? `<span class="offer__price">${eur(o.price)} <span class="muted">precio orientativo</span></span>` : ''}
    ${o.availability ? `<span class="offer__stock">${AVAILABILITY[o.availability][0]}</span>` : ''}
    <span class="offer__checked muted">Comprobado el ${formatDate(o.checkedAt)}${o.conditions ? ` · ${e(o.conditions)}` : ''}</span>
    <a class="btn" href="${e(o.url)}" rel="${o.affiliateProgram ? 'sponsored nofollow noopener' : 'noopener'}">Ver en ${e(o.merchant)}${o.affiliateProgram ? ' <span class="aff__tag">Enlace afiliado</span>' : ''}</a>
  </li>`).join('');
  const body = `<article class="article wrap">${T.breadcrumbs(crumbs)}
<header class="article__head"><span class="kicker">${e(p.brand)} · Ref. ${e(p.reference)}</span><h1 class="article__title">${e(p.name)}</h1><p class="article__dek">${e(p.summary)}</p></header>
<div class="prose prose--wide">
  ${hasAff ? disclosure(true) : ''}
  ${p.specs?.length ? `<h2 id="caracteristicas">Características</h2><div class="table-wrap"><table><tbody>${p.specs.map(s => `<tr><th scope="row">${e(s.label)}</th><td>${e(s.value)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  ${offers ? `<h2 id="donde-comprar">Dónde comprarlo</h2><ul class="offers">${offers}</ul><p class="muted">Los precios y la disponibilidad pueden cambiar. Confirma el precio final, la disponibilidad y las condiciones en la web del comercio.</p>` : ''}
  ${hasAff ? '' : disclosure(false)}
</div></article>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, brand: { '@type': 'Brand', name: p.brand }, mpn: p.reference, description: p.summary };
  const priced = (p.offers || []).filter(o => o.price != null);
  if (priced.length) ld.offers = priced.map(o => ({ '@type': 'Offer', price: o.price, priceCurrency: 'EUR', url: o.url, seller: { '@type': 'Organization', name: o.merchant }, ...(o.availability ? { availability: AVAILABILITY[o.availability][1] } : {}) }));
  emit(ppath, T.layout({ title: p.name, description: p.summary.slice(0, 160), path: ppath, body, jsonld: [ld, T.breadcrumbLd(crumbs)], currentCat: cat.slug }));
}

// ---------- 404 ----------
emit('/404.html', T.layout({
  title: 'Página no encontrada', description: 'La página que buscas no existe o ha cambiado de dirección.', path: '/404.html',
  body: `<div class="wrap empty"><h1 class="section-head__title">No encontramos esta página</h1><p>Puede que haya cambiado de dirección. Prueba con el <a href="${url('/buscar/')}">buscador</a> o vuelve a la <a href="${url('/')}">portada</a>.</p></div>`,
}));

// ---------- Índice de búsqueda, sitemap, robots ----------
const searchIndex = [
  ...articles.map(a => ({ t: a.title, d: a.dek, u: url(a.path), c: a.category, cn: a.cat.name, k: ARTICLE_TYPES[a.type], g: (a.tags || []).join(' '), b: plainText(a.body).slice(0, 4000) })),
  ...comparisons.map(c => ({ t: c.title, d: c.dek, u: url(c.path), c: 'comparativas', cn: 'Comparativas', k: 'Comparativa', g: (c.tags || []).join(' '), b: [c.intro, ...c.items.map(i => i.name), ...c.attributes.map(a => a.label)].join(' ') })),
];

const sitemapPaths = [...out.keys()].filter(p => p !== '/404.html' && p !== '/buscar/');
const lastmod = p => {
  const item = [...articles, ...comparisons].find(x => x.path === p);
  return item ? `<lastmod>${item.updated || item.date}</lastmod>` : '';
};
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map(p => `  <url><loc>${abs(p)}</loc>${lastmod(p)}</url>`).join('\n')}
</urlset>
`;
const robots = site.private
  ? '# Versión privada: rastreo bloqueado hasta la aprobación final.\nUser-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`;

// ---------- Escritura ----------
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const [p, html] of out) {
  const file = p.endsWith('/') ? path.join(DIST, p, 'index.html') : path.join(DIST, p);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}
await cp(path.join(SRC, 'assets'), path.join(DIST, 'assets'), { recursive: true });
await mkdir(path.join(DIST, 'assets/covers'), { recursive: true });
for (const item of [...articles, ...comparisons]) {
  await writeFile(path.join(DIST, 'assets/covers', `${item.slug}.svg`), coverSvg(item.slug, item.cat.color, item.title));
}
await writeFile(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex));
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap);
await writeFile(path.join(DIST, 'robots.txt'), robots);

console.log(`Build ${PRODUCTION ? 'de producción' : 'PRIVADO (noindex)'} completado: ${out.size} páginas, ${articles.length} artículos, ${comparisons.length} comparativas, ${populated.length} secciones con contenido, ${products.length} fichas de producto.`);
