import { escapeHtml as e } from './markdown.mjs';
import { ARTICLE_TYPES } from './validate.mjs';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

const ICONS = {
  search: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  theme: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  arrow: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

const MARK = '<svg aria-hidden="true" class="brand__mark" width="30" height="30" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M9 10h14L9 22h14" fill="none" stroke="var(--on-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Script mínimo en <head> para aplicar el tema guardado antes del primer pintado (evita parpadeo).
export const THEME_BOOT = "(function(){try{var t=localStorage.getItem('zdo-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();";

export function createTemplates(ctx) {
  const { site, url, abs, nav, assetVersion } = ctx;

  function breadcrumbs(items) {
    if (!items?.length) return '';
    return `<nav class="crumbs" aria-label="Migas de pan"><ol>${items.map((it, i) =>
      i === items.length - 1
        ? `<li><span aria-current="page">${e(it.name)}</span></li>`
        : `<li><a href="${url(it.path)}">${e(it.name)}</a></li>`).join('')}</ol></nav>`;
  }

  function breadcrumbLd(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
    };
  }

  function layout({ title, description, path, body, jsonld = [], bodyClass = '', ogType = 'website', currentCat = null, fullTitle = false }) {
    const pageTitle = fullTitle ? title : `${title} · ${site.name}`;
    const robots = site.private ? '<meta name="robots" content="noindex, nofollow, noarchive">' : '<meta name="robots" content="index, follow, max-image-preview:large">';
    const ld = jsonld.map(obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`).join('\n');
    return `<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(pageTitle)}</title>
<meta name="description" content="${e(description)}">
${robots}
<link rel="canonical" href="${abs(path)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${e(site.name)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${abs(path)}">
<meta property="og:locale" content="${site.locale}">
<meta name="theme-color" content="#F5F3EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#16181C" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${url('/assets/css/main.css')}?v=${assetVersion}">
<script>${THEME_BOOT}</script>
<script src="${url('/assets/js/main.js')}?v=${assetVersion}" defer></script>
${ld}
</head>
<body class="${bodyClass}">
<a class="skip" href="#contenido">Saltar al contenido</a>
${site.private ? '<div class="private-bar" role="note">Versión privada de desarrollo · no indexable · contenidos en revisión</div>' : ''}
<header class="masthead">
  <div class="masthead__inner wrap">
    <a class="brand" href="${url('/')}" aria-label="${e(site.name)}, portada">${MARK}<span class="brand__name">${e(site.name)}</span></a>
    <div class="masthead__tools">
      <a class="icon-btn" href="${url('/buscar/')}" aria-label="Buscar">${ICONS.search}</a>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Cambiar tema: sistema">${ICONS.theme}<span class="icon-btn__label" data-theme-label>Sistema</span></button>
    </div>
  </div>
  <nav class="catnav" aria-label="Secciones">
    <ul class="catnav__list wrap">
      ${nav.map(c => `<li><a href="${url('/' + c.slug + '/')}"${c.slug === currentCat ? ' aria-current="true"' : ''}>${e(c.name)}</a></li>`).join('')}
      <li><a href="${url('/comparativas/')}"${currentCat === 'comparativas' ? ' aria-current="true"' : ''}>Comparativas</a></li>
    </ul>
  </nav>
</header>
<main id="contenido" tabindex="-1">
${body}
</main>
<footer class="footer">
  <div class="wrap footer__grid">
    <div>
      <a class="brand brand--footer" href="${url('/')}">${MARK}<span class="brand__name">${e(site.name)}</span></a>
      <p class="footer__claim">${e(site.tagline)}. Sin ventanas emergentes, sin registros y sin formularios de captación.</p>
    </div>
    <div>
      <h2 class="footer__h">Secciones</h2>
      <ul class="footer__list">${nav.map(c => `<li><a href="${url('/' + c.slug + '/')}">${e(c.name)}</a></li>`).join('')}<li><a href="${url('/comparativas/')}">Comparativas</a></li></ul>
    </div>
    <div>
      <h2 class="footer__h">Transparencia</h2>
      <ul class="footer__list">
        <li><a href="${url('/como-trabajamos/')}">Cómo trabajamos</a></li>
        <li><a href="${url('/legal/afiliacion-y-publicidad/')}">Afiliación y publicidad</a></li>
        <li><a href="${url('/legal/aviso-legal/')}">Aviso legal</a></li>
        <li><a href="${url('/legal/privacidad/')}">Privacidad</a></li>
        <li><a href="${url('/legal/cookies/')}">Cookies</a></li>
      </ul>
    </div>
  </div>
  <p class="wrap footer__small">Los precios y la disponibilidad de los comercios pueden cambiar. Confirma siempre las condiciones vigentes en la web del vendedor.</p>
</footer>
</body>
</html>
`;
  }

  function cover(a, { size = 'md', eager = false } = {}) {
    const dims = { lg: [1200, 675], md: [800, 450], sm: [480, 270] }[size];
    return `<img class="cover" src="${url('/assets/covers/' + a.slug + '.svg')}" alt="" width="${dims[0]}" height="${dims[1]}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
  }

  function kicker(a) {
    const cat = a.cat;
    return `<span class="kicker"><span class="kicker__dot" style="--dot:${cat.color}"></span>${e(a.sub ? a.sub.name : cat.name)}<span class="kicker__sep" aria-hidden="true">·</span>${e(ARTICLE_TYPES[a.type] || 'Comparativa')}</span>`;
  }

  function card(a, { variant = 'default', eager = false } = {}) {
    const size = variant === 'lead' ? 'lg' : variant === 'compact' ? 'sm' : 'md';
    const H = variant === 'lead' ? 'h2' : 'h3';
    return `<article class="card card--${variant}">
  <a class="card__link" href="${url(a.path)}">
    <div class="card__media">${cover(a, { size, eager })}</div>
    <div class="card__body">
      ${kicker(a)}
      <${H} class="card__title">${e(a.title)}</${H}>
      ${variant === 'compact' ? '' : `<p class="card__dek">${e(a.dek)}</p>`}
      <span class="card__meta">${a.readingMinutes ? `${a.readingMinutes} min de lectura` : 'Tabla interactiva'}${a.status === 'borrador' ? ' · <span class="badge">Borrador</span>' : ''}</span>
    </div>
  </a>
</article>`;
  }

  return { layout, breadcrumbs, breadcrumbLd, cover, card, kicker, icons: ICONS };
}

export function coverSvg(seedText, color, label) {
  let h = 2166136261;
  for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const W = 1200, H = 675;
  const cx = 700 + rnd() * 400, cy = 120 + rnd() * 400, r = 220 + rnd() * 200;
  const rings = Array.from({ length: 5 }, (_, i) => `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(r + i * 46).toFixed(0)}" fill="none" stroke="#fff" stroke-opacity="${(0.22 - i * 0.035).toFixed(3)}" stroke-width="2"/>`).join('');
  const dots = [];
  const ox = 70 + rnd() * 80, oy = 380 + rnd() * 120;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) dots.push(`<circle cx="${(ox + x * 28).toFixed(0)}" cy="${(oy + y * 28).toFixed(0)}" r="3" fill="#fff" fill-opacity="0.28"/>`);
  const bars = Array.from({ length: 4 }, (_, i) => {
    const w = 120 + rnd() * 260;
    return `<rect x="70" y="${90 + i * 34}" width="${w.toFixed(0)}" height="10" rx="5" fill="#fff" fill-opacity="${(0.5 - i * 0.1).toFixed(2)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(label)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.78"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="#1b1d21"/><rect width="${W}" height="${H}" fill="url(#g)"/>
<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(r * 0.62).toFixed(0)}" fill="#fff" fill-opacity="0.10"/>
${rings}${dots.join('')}${bars}
</svg>`;
}
