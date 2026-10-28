---
{
  "title": "SSD NVMe frente a SATA: qué diferencia notarás de verdad",
  "slug": "ssd-nvme-vs-sata",
  "category": "tecnologia",
  "subcategory": "hardware",
  "type": "explicacion",
  "date": "2026-10-28",
  "status": "borrador",
  "dek": "Un NVMe de última generación multiplica la velocidad secuencial de un SATA, pero en el uso diario la diferencia es menor de lo que sugieren las cifras. Te explicamos cuándo merece la pena.",
  "description": "Diferencias entre SSD SATA y NVMe PCIe 3.0, 4.0 y 5.0: velocidades reales, formato M.2, compatibilidad, caché, resistencia (TBW) y temperatura.",
  "tags": ["ssd", "nvme", "sata", "m.2", "pcie", "almacenamiento", "disco"],
  "related": ["almacenamiento-ssd", "como-elegir-monitor"],
  "sources": [
    { "title": "NVM Express: especificaciones", "url": "https://nvmexpress.org/specifications/", "publisher": "NVM Express" },
    { "title": "PCI-SIG: especificaciones PCI Express", "url": "https://pcisig.com/specifications", "publisher": "PCI-SIG" }
  ]
}
---
Cambiar un disco duro mecánico por cualquier SSD es la mejora más notable que puede recibir un ordenador. Elegir entre un SSD SATA y uno NVMe, o entre generaciones de NVMe, es una decisión mucho más fina.

## Interfaz, protocolo y formato: tres cosas distintas

- **SATA** es una interfaz heredada de los discos mecánicos. Su versión actual (SATA III, 6 Gb/s) limita los SSD a unos 550 MB/s en lectura secuencial.
- **NVMe** es un protocolo diseñado para memoria flash que funciona sobre **PCI Express**. Cada generación de PCIe duplica aproximadamente el ancho de banda por carril.
- **M.2** es solo un formato físico. Existen SSD M.2 SATA y SSD M.2 NVMe con aspecto casi idéntico.

> [!aviso] Antes de comprar un SSD M.2, consulta el manual de tu placa base o portátil: algunas ranuras solo admiten SATA, otras solo NVMe y otras comparten carriles con puertos SATA, que se desactivan al usarlas.

## Velocidades orientativas por generación

| Tipo | Lectura secuencial máxima habitual |
|---|---|
| SATA III | ~550 MB/s |
| NVMe PCIe 3.0 x4 | ~3.500 MB/s |
| NVMe PCIe 4.0 x4 | ~7.000 MB/s |
| NVMe PCIe 5.0 x4 | hasta ~14.000 MB/s en los modelos más rápidos |

Las cifras son máximos de lectura secuencial, el escenario más favorable. Tienes el detalle en la [comparativa de almacenamiento SSD](art:almacenamiento-ssd).

## Lo que notarás y lo que no

El arranque del sistema, la apertura de programas y la carga de la mayoría de juegos dependen sobre todo de la **latencia y del acceso aleatorio a bloques pequeños**, no de la velocidad secuencial. Por eso, entre un buen SATA y un NVMe la diferencia en uso cotidiano existe pero es moderada, y entre un PCIe 4.0 y un PCIe 5.0 suele ser difícil de percibir.

Donde sí se nota la generación:

- Copiar o exportar archivos muy grandes (vídeo, copias de seguridad, máquinas virtuales).
- Flujos profesionales que leen grandes volúmenes de datos continuamente.

## Lo que no aparece en la portada de la caja

- **Caché DRAM o HMB:** los modelos con memoria caché propia mantienen mejor el rendimiento con cargas intensas; los económicos usan parte de la RAM del sistema (HMB), suficiente para uso doméstico.
- **Tipo de memoria (TLC o QLC):** las QLC son más baratas por gigabyte, pero su velocidad cae más cuando se agota la caché de escritura rápida en copias largas.
- **Resistencia (TBW):** terabytes escritos que el fabricante garantiza. Para un uso doméstico, incluso los valores modestos suelen superar con creces la vida útil del equipo.
- **Temperatura:** los NVMe PCIe 5.0 se calientan bastante y suelen requerir disipador. Los portátiles pueden no tener espacio para él.

## Recomendación práctica

1. **Ordenador antiguo sin ranura M.2:** un SSD SATA de 2,5" es la mejora más rentable.
2. **Equipo de sobremesa o portátil actual:** un NVMe PCIe 4.0 con buena relación precio por gigabyte es la opción equilibrada.
3. **PCIe 5.0:** solo si trabajas con archivos enormes y tu placa lo admite.
4. Prioriza **capacidad suficiente** antes que velocidad máxima: un SSD casi lleno rinde peor.
