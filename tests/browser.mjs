// Pruebas en navegador real (Chromium/Playwright) contra el WordPress de pruebas, con capturas en screenshots/.
// Uso: tests/wp-up.sh <carpeta> && node tests/browser.mjs   (BASE=http://127.0.0.1:9400 por defecto)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

// Playwright como CommonJS para usar la instalación global del entorno si no hay una local.
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:9400';
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const pages = [
  ['portada', '/'],
  ['seccion', '/seccion/nutricion/'],
  ['articulo', '/nutricion/suplementos/creatina-guia/'],
  ['comparativa', '/nutricion/suplementos/tipos-proteina-polvo/'],
  ['busqueda', '/?s=creatina'],
  ['404', '/no-existe/'],
];

for (const [vpName, viewport] of [['movil', { width: 390, height: 844 }], ['escritorio', { width: 1440, height: 900 }]]) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push(`JS ${vpName}/${scheme}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/block-library/.test(m.location().url || '') && m.location().url !== page.url()) problems.push(`consola ${vpName}/${scheme} ${page.url()}: ${m.text()}`); });
    for (const [name, url] of pages) {
      const resp = await page.goto(BASE + url, { waitUntil: 'networkidle' });
      const expected = name === '404' ? 404 : 200;
      if (resp.status() !== expected) problems.push(`${url} → HTTP ${resp.status()} (esperado ${expected})`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) problems.push(`${url} (${vpName}) desborda ${overflow}px en horizontal`);
      const h1 = await page.locator('h1').count();
      if (h1 !== 1) problems.push(`${url}: ${h1} elementos h1`);
      if (name === 'portada' && vpName === 'escritorio') {
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      }
      await page.screenshot({ path: `${OUT}/${name}-${vpName}-${scheme}.png`, fullPage: name === 'portada' && vpName === 'escritorio' && scheme === 'light' });
    }
    await ctx.close();
  }
}

// Comprobaciones funcionales
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + '/nutricion/suplementos/creatina-guia/', { waitUntil: 'networkidle' });
const tocItems = await page.locator('[data-toc] li').count();
if (tocItems < 3) problems.push(`índice del artículo con ${tocItems} entradas`);
const robots = await page.locator('meta[name="robots"]').getAttribute('content');
const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
const types = ld.map(t => JSON.parse(t)['@type']);
if (!types.includes('Article') || !types.includes('BreadcrumbList')) problems.push(`JSON-LD incompleto: ${types}`);
const sources = await page.locator('.sources li').count();
console.log(`Artículo: índice ${tocItems} entradas · fuentes ${sources} · JSON-LD ${types.join(', ')} · robots "${robots}"`);

await page.goto(BASE + '/nutricion/suplementos/tipos-proteina-polvo/', { waitUntil: 'networkidle' });
const rowsBefore = await page.locator('.zona-cmp tbody tr:visible').count();
await page.getByText('Solo diferencias').click();
const rowsDiff = await page.locator('.zona-cmp tbody tr:visible').count();
await page.locator('.cmp-controls__items label', { hasText: 'Caseína' }).click();
const cols = await page.locator('.zona-cmp thead th:visible').count();
if (cols !== 4) problems.push(`comparativa: ${cols} columnas visibles tras ocultar una (esperado 4 con la de etiquetas)`);
console.log(`Comparativa: ${rowsBefore} filas, ${rowsDiff} con "solo diferencias", ${cols - 1} opciones visibles tras ocultar Caseína`);

await page.click('[data-theme-toggle]');
await page.click('[data-theme-toggle]');
await page.reload();
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
if (theme !== 'dark') problems.push(`tema no persiste (${theme})`);
console.log(`Tema tras recargar: ${theme}`);

await page.goto(BASE + '/?s=proteina', { waitUntil: 'networkidle' });
const hits = await page.locator('.card').count();
if (hits < 1) problems.push('búsqueda "proteina" sin resultados');
console.log(`Búsqueda "proteina": ${hits} resultados`);

await browser.close();
if (problems.length) { console.error('Problemas:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`Sin errores. Capturas en ${OUT}/`);
