---
{
  "title": "Cargadores USB-C y Power Delivery: guía para no equivocarte",
  "slug": "cargadores-usb-c-power-delivery",
  "category": "tecnologia",
  "subcategory": "moviles",
  "type": "guia",
  "date": "2026-10-28",
  "status": "borrador",
  "dek": "Que un conector sea USB-C no garantiza ni la potencia ni la velocidad de datos. Explicamos qué mirar en cargadores y cables y qué cambia con la normativa europea del cargador común.",
  "description": "Cómo elegir cargador y cable USB-C: USB Power Delivery, PPS, vatios, cables de 3 y 5 amperios y obligaciones del cargador común europeo (Directiva UE 2022/2380).",
  "tags": ["usb-c", "cargador", "power delivery", "pps", "cable", "carga rápida", "cargador común"],
  "related": ["como-elegir-monitor", "herramientas-bateria-voltaje-amperios"],
  "sources": [
    { "title": "Directiva (UE) 2022/2380 del Parlamento Europeo y del Consejo (cargador común)", "url": "https://eur-lex.europa.eu/eli/dir/2022/2380/oj", "publisher": "EUR-Lex" },
    { "title": "USB Power Delivery", "url": "https://www.usb.org/usb-charger-pd", "publisher": "USB Implementers Forum" }
  ]
}
---
El USB-C se ha convertido en el conector universal de móviles, tabletas, auriculares y portátiles. Pero detrás del mismo conector conviven cargadores y cables con capacidades muy diferentes.

## Qué exige la normativa europea

La **Directiva (UE) 2022/2380** obliga a que una larga lista de dispositivos con carga por cable comercializados en la UE incorporen un puerto USB-C. Se aplica desde el **28 de diciembre de 2024** a móviles, tabletas, cámaras, auriculares, consolas portátiles, altavoces portátiles, teclados, ratones y otros, y desde el **28 de abril de 2026** a los ordenadores portátiles.

La norma persigue además dos objetivos prácticos:

- Que los dispositivos que admiten carga rápida usen el protocolo estándar **USB Power Delivery**, de modo que cualquier cargador compatible pueda cargarlos rápido.
- Que el consumidor pueda comprar el dispositivo **sin cargador** si ya tiene uno.

> [!nota] Los relojes inteligentes y las pulseras de actividad, entre otros, quedan fuera de la obligación por su tamaño. Consulta el texto de la directiva para la lista completa.

## Vatios, voltios y amperios

La potencia (W) es el voltaje (V) multiplicado por la intensidad (A). Con **USB Power Delivery** el cargador y el dispositivo negocian el voltaje adecuado:

- **Hasta 15 W** (5 V y 3 A): carga básica sin negociación.
- **Hasta 100 W** (hasta 20 V y 5 A): rango clásico de Power Delivery, suficiente para la mayoría de portátiles ligeros.
- **Hasta 240 W** (hasta 48 V y 5 A): modo de potencia extendida (EPR) de las versiones recientes de la especificación, para portátiles potentes.

**PPS** (*Programmable Power Supply*) es una extensión de Power Delivery que ajusta el voltaje en pasos finos. Algunos móviles solo alcanzan su carga más rápida con cargadores PPS.

## El cable también cuenta

- Un cable USB-C estándar admite **hasta 3 A** (60 W a 20 V).
- Para **más de 60 W** hace falta un cable de **5 A** con chip de identificación (*e-marker*).
- La velocidad de datos es otra característica: muchos cables de carga solo transmiten a velocidad USB 2.0 y no sirven para monitores ni discos rápidos.

## Cómo elegir cargador

1. Consulta la potencia máxima que acepta tu dispositivo y si requiere PPS.
2. Elige un cargador con Power Delivery con esa potencia o algo superior. Un cargador más potente no daña el dispositivo: este solo pide lo que necesita.
3. En cargadores con varios puertos, revisa **cómo se reparte la potencia** cuando cargas varios dispositivos a la vez; la cifra total no está disponible por cada puerto.
4. Compra a vendedores identificables con marcado CE y datos del fabricante. Desconfía de cargadores sin marca con potencias imposibles para su tamaño.

## Monitores y bases que cargan el portátil

Si un monitor o una base anuncian carga por USB-C, comprueba cuántos vatios entregan. Un portátil que necesita 100 W cargará más despacio, o perderá batería con carga intensa, si el monitor solo entrega 65 W. Lo explicamos en la [guía para elegir monitor](art:como-elegir-monitor).
