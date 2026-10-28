# Zona de Oferta — prototipo editorial (versión privada)

Medio digital de guías, análisis, comparativas y actualidad sobre tecnología, hogar, motor, deporte y consumo, financiado en el futuro con afiliación y publicidad no invasiva. **Nombre provisional.**

Este repositorio contiene un **prototipo estático, privado y no indexable**. Sirve como referencia de diseño, arquitectura editorial y reglas de contenido para la futura migración a WordPress. **No está publicado en ningún dominio.**

## Uso

Requiere Node.js 20 o superior. No tiene dependencias externas.

```bash
npm run build        # genera dist/ en modo privado (noindex, robots.txt bloqueado)
npm run check        # build + comprobaciones automáticas (enlaces, SEO técnico, JSON-LD, reglas comerciales)
npm run serve        # sirve dist/ en http://127.0.0.1:4321/
npm run screenshots  # con el servidor en marcha: pruebas en Chromium (móvil/escritorio, claro/oscuro) y capturas
npm run build:production  # puerta de publicación: falla mientras haya bloqueos (ver abajo)
```

## Estructura

```
src/config/site.json          Datos del sitio; private=true; dominio pendiente (example.invalid)
src/config/taxonomy.json      Categorías y subcategorías; 'planned' = previstas, no visibles
src/config/affiliates.json    Registro de programas de afiliación (todos sin verificar)
src/content/articles/*.md     Artículos: metadatos JSON + Markdown
src/content/comparisons/*.json Comparativas interactivas
src/content/products.json     Fichas de producto (vacío: no hay precios verificados)
src/content/pages/*.md        Metodología y páginas legales (borradores)
src/assets/                   CSS, JS y favicon (sin fuentes ni scripts de terceros)
scripts/                      build, check, serve, screenshots
```

## Reglas que el build hace cumplir

- **Sin secciones vacías:** una categoría solo aparece en menú, sitemap y páginas si tiene contenido.
- **Noticias:** no se generan sin fuentes con URL y fecha de consulta.
- **Enlaces de afiliación** (`[texto](aff:programa:https://…)`): el build falla si el programa no está marcado como `verificado` con un `trackingId` real. Se publican con `rel="sponsored nofollow noopener"`, etiqueta visible y aviso de transparencia automático.
- **Precios:** una oferta sin `checkedAt` (fecha de comprobación) se rechaza; la disponibilidad solo admite valores comprobados y se omite si no existe.
- **Enlaces internos** (`[texto](art:slug)`): fallan si el destino no existe.
- **Producción** (`--production`) se bloquea mientras haya: dominio `example.invalid`, contenidos en `borrador` o páginas legales con `[PENDIENTE`.

Todo el contenido actual está en estado **borrador**: redactado con asistencia de IA y pendiente de revisión humana y contraste de fuentes.

## Diseño

- Paleta de referencia: claro `#F5F3EE` / `#FBFAF7` / `#24221F`; oscuro `#16181C` / `#1F2228` / `#ECE8E1`. Acento `#A3471F` (claro) y `#F0A47A` (oscuro). Todos los pares de texto superan 4,5:1 (WCAG AA).
- Tema: sigue al sistema; selector manual sistema → claro → oscuro con persistencia en `localStorage` (`zdo-theme`).
- Tipografía del sistema (sin Google Fonts: rendimiento y privacidad). Ilustraciones de portada SVG originales generadas en el build.
- Sin ventanas emergentes, formularios de captación, registros, comentarios, cookies ni scripts de terceros.

## Migración prevista a WordPress (pendiente de acceso al alojamiento)

Correspondencia propuesta, a validar tras inspeccionar el alojamiento:

| Prototipo | WordPress |
|---|---|
| `taxonomy.json` | Categorías jerárquicas nativas (mismos slugs → mismas URL) |
| Artículos `.md` | Entradas; `type` como taxonomía propia "Formato"; fuentes en campos personalizados |
| Comparativas `.json` | Tipo de contenido propio o bloque personalizado con la misma estructura |
| `products.json` | Tipo de contenido "Producto" con ofertas fechadas |
| `main.css` / `main.js` | Tema hijo de un tema ligero (GeneratePress u otro justificado) |
| URLs `/categoria/subcategoria/slug/` | Enlaces permanentes `/%category%/%postname%/` |

No se ha instalado ni contratado nada. Sin cambios de DNS ni de la web pública.
