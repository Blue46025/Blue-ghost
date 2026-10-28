# Zona de Oferta

Blog de deporte centrado en **pádel y running** (guías de compra, comparativas y algo de actualidad deportiva), financiado con afiliación y publicidad no invasiva. **Nombre provisional.** Sin venta, sin registros, sin suscripciones, sin formularios y sin cupones.

Plataforma: **WordPress autoalojado en Hostinger**, con un tema y un plugin propios hechos desde cero.

## Qué hay en este repositorio

```
entregables/zona.zip          Tema listo para subir a WordPress
entregables/zona-core.zip     Plugin listo para subir a WordPress
wordpress/zona/               Código del tema
wordpress/zona-core/          Código del plugin (+ taxonomy.json: secciones y subsecciones)
content/articles/*.md         Artículos que se publican (pádel, running, consumo), todos en BORRADOR
content/archivo/              Artículos y comparativas de tecnología/hogar/motor apartados (no se publican)
content/comparisons/*.json    Comparativas (tabla interactiva en la web)
content/pages/*.md            Metodología y páginas legales (borradores con datos [PENDIENTE])
content/affiliates.json       Registro de programas de afiliación (ninguno verificado)
scripts/wp-push.mjs           Publica los contenidos en WordPress por la API REST
scripts/package.sh            Regenera los .zip de entregables/
tests/                        WordPress de pruebas (Playground) y pruebas en navegador
```

## Instalación en Hostinger (la hace el titular)

1. **hPanel › Sitios web › Añadir sitio web › WordPress.** Usa un subdominio de pruebas (p. ej. `pruebas.tudominio.es`) para no tocar la web actual ni los DNS del dominio principal.
2. En WordPress: **Ajustes › Lectura › «Disuade a los motores de búsqueda»** (activado mientras sea privado).
3. **Plugins › Añadir nuevo › Subir plugin** → `zona-core.zip` → Activar. Crea las secciones, el rol «Redactor IA» y los enlaces `/seccion/…` y `/categoria/subcategoria/articulo/` (solo si el sitio aún tenía los enlaces simples).
4. **Apariencia › Temas › Añadir nuevo › Subir tema** → `zona.zip` → Activar.
5. **Ajustes › Generales:** idioma Español, zona horaria Madrid.
6. Para la automatización: **Usuarios › Añadir nuevo** con rol **«Redactor IA (solo borradores)»**, y en su perfil **Contraseñas de aplicación** → crear una. Ese usuario puede escribir y enviar a revisión, **no publicar**.

## Publicar los contenidos

```bash
WP_URL=https://pruebas.tudominio.es WP_USER=redactor-ia WP_APP_PASSWORD='xxxx xxxx …' npm run push
```

Por defecto se envían como **pendientes de revisión**. Las páginas legales se suben siempre como borrador mientras tengan `[PENDIENTE`.

## Reglas que aplica el plugin

- **Afiliación:** los enlaces a dominios de afiliación (Ajustes › Zona de Oferta) reciben `rel="sponsored nofollow noopener"`, la etiqueta «Enlace afiliado» y un aviso de transparencia al inicio del artículo. Amazon solo cuenta si el enlace lleva `tag=`.
- **`[producto nombre="…" comercio="…" url="…" motivo="…"]`:** cuadro de recomendación sin precio (los precios solo se publican comprobados y fechados).
- **Noticias:** una noticia sin al menos una fuente con fecha de consulta vuelve a «Pendiente» aunque se intente publicar.
- **Publicidad:** cinco zonas de widgets (cabecera, portada, dentro del artículo, lateral, final). Si están vacías no se imprime nada. Sin ventanas emergentes ni intersticiales.
- **SEO:** descripción, Open Graph, JSON-LD (Article/NewsArticle, BreadcrumbList, WebSite) y `noindex` en búsquedas y secciones vacías. Se desactiva solo si hay Yoast, Rank Math, SEOPress o AIOSEO.
- Sin comentarios, sin cookies propias (solo `localStorage` si el lector elige tema claro u oscuro), sin fuentes ni scripts de terceros.

## Pruebas

Probado en WordPress 6.5 (Playground, PHP 8.3): enrutado y 404, permisos del rol de IA (no puede publicar), bloqueo de noticias sin fuentes, marcado de afiliados, comparativas, índice del artículo, tema persistente, búsqueda, sin desbordes en 390 px y 1440 px, en claro y oscuro.

```bash
npm i @wp-playground/cli @wp-playground/wordpress-builds   # en una carpeta aparte
tests/wp-up.sh /ruta/a/esa/carpeta && npm run test:browser
```
