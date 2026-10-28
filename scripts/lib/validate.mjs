// Reglas editoriales y comerciales que el build hace cumplir. Si una regla falla, el build se detiene.

export const ARTICLE_TYPES = {
  noticia: 'Noticia',
  guia: 'Guía',
  analisis: 'Análisis',
  comparativa: 'Comparativa',
  explicacion: 'Explicación',
  seleccion: 'Selección',
  oferta: 'Oferta verificada',
  especial: 'Especial',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['borrador', 'revisado'];

function isUrl(s) {
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}

export function validateArticle(a, taxonomy, file) {
  const errors = [];
  for (const k of ['title', 'slug', 'dek', 'category', 'type', 'date', 'status', 'description']) {
    if (!a[k]) errors.push(`falta "${k}"`);
  }
  if (a.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) errors.push(`slug no válido: ${a.slug}`);
  if (a.type && !ARTICLE_TYPES[a.type]) errors.push(`tipo desconocido: ${a.type}`);
  if (a.status && !STATUSES.includes(a.status)) errors.push(`estado desconocido: ${a.status}`);
  for (const k of ['date', 'updated']) if (a[k] && !ISO_DATE.test(a[k])) errors.push(`${k} debe ser AAAA-MM-DD`);
  if (a.updated && a.date && a.updated < a.date) errors.push('updated anterior a date');
  if (a.description && (a.description.length < 70 || a.description.length > 165)) errors.push(`description debe tener 70-165 caracteres (tiene ${a.description.length})`);
  const cat = taxonomy.categories.find(c => c.slug === a.category);
  if (a.category && !cat) errors.push(`categoría inexistente: ${a.category}`);
  if (cat && a.subcategory && !cat.children.some(s => s.slug === a.subcategory)) errors.push(`subcategoría inexistente: ${a.category}/${a.subcategory}`);
  const sources = a.sources || [];
  for (const s of sources) {
    if (!s.title || !isUrl(s.url)) errors.push(`fuente incompleta o URL no válida: ${JSON.stringify(s)}`);
  }
  // Las noticias exigen fuentes primarias con fecha de consulta: sin ellas no se publican.
  if (a.type === 'noticia') {
    if (!sources.length) errors.push('una noticia requiere al menos una fuente');
    for (const s of sources) if (!s.accessed || !ISO_DATE.test(s.accessed)) errors.push(`fuente de noticia sin fecha de consulta: ${s.url}`);
  }
  if (errors.length) throw new Error(`${file}:\n  - ${errors.join('\n  - ')}`);
}

export function validateComparison(c, taxonomy, file) {
  const errors = [];
  for (const k of ['slug', 'title', 'dek', 'description', 'category', 'date', 'status', 'items', 'attributes', 'values']) {
    if (!c[k]) errors.push(`falta "${k}"`);
  }
  if (!taxonomy.categories.some(x => x.slug === c.category)) errors.push(`categoría inexistente: ${c.category}`);
  for (const item of c.items || []) {
    const row = c.values?.[item.id];
    if (!row) { errors.push(`sin valores para ${item.id}`); continue; }
    for (const attr of c.attributes || []) if (!(attr.key in row)) errors.push(`${item.id} sin valor para ${attr.key}`);
  }
  for (const s of c.sources || []) if (!s.title || !isUrl(s.url)) errors.push(`fuente no válida: ${JSON.stringify(s)}`);
  if (errors.length) throw new Error(`${file}:\n  - ${errors.join('\n  - ')}`);
}

/**
 * Ficha de producto. No se admiten precios sin fecha de comprobación ni enlaces comerciales
 * de programas no verificados. La disponibilidad se omite si no se ha comprobado.
 */
export function validateProduct(p, affiliates) {
  const errors = [];
  for (const k of ['slug', 'name', 'brand', 'reference', 'category', 'summary']) if (!p[k]) errors.push(`falta "${k}"`);
  for (const offer of p.offers || []) {
    if (!offer.merchant) errors.push('oferta sin comercio');
    if (!isUrl(offer.url)) errors.push(`oferta con URL no válida: ${offer.url}`);
    if (!offer.checkedAt || !ISO_DATE.test(offer.checkedAt)) errors.push(`oferta de ${offer.merchant} sin fecha de comprobación`);
    if (offer.price != null && (typeof offer.price !== 'number' || offer.price <= 0)) errors.push('precio no numérico');
    if (offer.availability && !['en-stock', 'sin-stock', 'reserva'].includes(offer.availability)) errors.push(`disponibilidad no válida: ${offer.availability}`);
    if (offer.affiliateProgram) {
      const prog = affiliates.programs.find(x => x.id === offer.affiliateProgram);
      if (!prog) errors.push(`programa de afiliación desconocido: ${offer.affiliateProgram}`);
      else if (prog.status !== 'verificado' || !prog.trackingId) errors.push(`programa de afiliación no verificado: ${offer.affiliateProgram}`);
    }
  }
  if (errors.length) throw new Error(`producto ${p.slug || '(sin slug)'}:\n  - ${errors.join('\n  - ')}`);
}

export function checkAffiliateProgram(programId, affiliates) {
  const prog = affiliates.programs.find(x => x.id === programId);
  if (!prog) throw new Error(`enlace de afiliación con programa desconocido: ${programId}`);
  if (prog.status !== 'verificado' || !prog.trackingId) {
    throw new Error(`enlace de afiliación con programa NO verificado (${programId}). No se presentan enlaces ordinarios como afiliados ni se inventan identificadores.`);
  }
  return prog;
}
