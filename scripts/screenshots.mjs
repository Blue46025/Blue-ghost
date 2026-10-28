// Pruebas en navegador real (Chromium/Playwright) y capturas en screenshots/.
// Requiere el servidor en marcha: npm run serve  (en otra terminal)
import { createRequire } from 'node:module';
// Playwright se resuelve como CommonJS para usar la instalación global del entorno si no hay una local.
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const pages = [
  ['portada', '/'],
  ['articulo', '/tecnologia/redes/wifi-6-6e-7-diferencias/'],
  ['categoria', '/tecnologia/'],
  ['comparativa', '/comparativas/paneles-de-monitor/'],
  ['buscador', '/buscar/?q=garantia'],
];

for (const [vpName, viewport] of [['movil', { width: 390, height: 844 }], ['escritorio', { width: 1440, height: 900 }]]) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push(`JS ${vpName}/${scheme}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`consola ${vpName}/${scheme}: ${m.text()}`); });
    for (const [name, url] of pages) {
      const resp = await page.goto(BASE + url, { waitUntil: 'networkidle' });
      if (resp.status() !== 200) problems.push(`${url} → HTTP ${resp.status()}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) problems.push(`${url} (${vpName}) desborda horizontalmente ${overflow}px`);
      await page.screenshot({ path: `${OUT}/${name}-${vpName}-${scheme}.png`, fullPage: name === 'portada' && vpName === 'escritorio' });
    }
    await ctx.close();
  }
}

// Funcionales
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/buscar/', { waitUntil: 'networkidle' });
await page.fill('#q', 'wifi');
await page.waitForTimeout(150);
const nWifi = await page.locator('[data-search-results] li').count();
if (nWifi < 2) problems.push(`buscador: "wifi" devuelve ${nWifi} resultados`);
await page.fill('#q', 'garantia'); // sin tilde debe encontrar "garantía"
await page.waitForTimeout(150);
if (await page.locator('[data-search-results] li').count() < 1) problems.push('buscador: no ignora tildes');
await page.fill('#q', '');
await page.selectOption('#cat', 'motor');
await page.waitForTimeout(150);
const motor = await page.locator('[data-search-results] li').count();
if (motor < 1) problems.push('buscador: filtro por sección sin resultados');
console.log(`Buscador: "wifi" → ${nWifi} resultados; sección Motor → ${motor}`);

await page.goto(BASE + '/comparativas/almacenamiento-ssd/', { waitUntil: 'networkidle' });
const rowsBefore = await page.locator('tr[data-row]:visible').count();
await page.check('[data-cmp-diff]');
const rowsAfter = await page.locator('tr[data-row]:visible').count();
await page.uncheck('[data-cmp-item="gen5"]');
const colsVisible = await page.locator('thead th[data-col]:visible').count();
if (!(rowsAfter < rowsBefore)) problems.push('comparativa: "solo diferencias" no oculta filas iguales');
if (colsVisible !== 3) problems.push(`comparativa: al ocultar una opción quedan ${colsVisible} columnas`);
console.log(`Comparativa: ${rowsBefore} filas → ${rowsAfter} con "solo diferencias"; columnas tras ocultar una: ${colsVisible}`);

await page.click('[data-theme-toggle]'); // sistema → claro
await page.click('[data-theme-toggle]'); // claro → oscuro
await page.reload();
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
if (theme !== 'dark') problems.push(`tema: no persiste tras recargar (${theme})`);
console.log(`Tema tras recargar: ${theme}`);

await page.goto(BASE + '/no-existe/');
if (!(await page.locator('h1').innerText()).includes('No encontramos')) problems.push('404 personalizada no se muestra');

await browser.close();
if (problems.length) { console.error('Problemas:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`Sin errores. Capturas en ${OUT}/`);
