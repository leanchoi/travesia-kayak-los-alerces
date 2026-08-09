# assets/

Acá van las imágenes del sitio. **El sitio funciona sin ellas**: cada lámina cae a
un estado vacío diseñado ("Fotografía pendiente") en lugar de mostrar el ícono de
imagen rota. Apenas se suben los archivos con estos nombres exactos, aparecen
solas — no hay que tocar HTML, CSS ni JS.

## Archivos esperados

| Archivo | Dónde se usa | Recorte sugerido | Tamaño |
|---|---|---|---|
| `gallery-1.jpg` | Galería · Río Arrayanes | vertical 4:5 | 1200 × 1500 px |
| `gallery-2.jpg` | Galería · Lago Verde | vertical 4:5 | 1200 × 1500 px |
| `gallery-3.jpg` | Galería · Bahía Rosales | vertical 4:5 | 1200 × 1500 px |
| `gallery-4.jpg` | Galería · Flotilla | vertical 4:5 | 1200 × 1500 px |
| `cardacci.jpg` | Organización · retrato | vertical 4:5 | 800 × 1000 px |
| `og-cover.png` | Vista previa al compartir | horizontal 1.91:1 | 1200 × 630 px |

Ya incluidos en el repositorio:

- `favicon.svg` — ícono de pestaña.
- `og-cover.png` — portada para redes. Se puede reemplazar por una fotografía real.
- `emblema-travesia.webp` — emblema de la VII Travesía 2026. Se usa en la
  portada de `auspiciantes.html`.
- `fonts/` — Fraunces e Instrument Sans, servidas desde el propio dominio.
- `auspiciantes/` — logos de los comercios que acompañan la travesía.

## Logos de auspiciantes

Están en `assets/auspiciantes/`, en WebP, recortados al contenido y limitados a
620 px de ancho. Salieron del documento oficial de auspicios; el conjunto pesa
menos de 200 KB.

Para **sumar un auspiciante**: guardar el logo con el mismo criterio (fondo
recortado, ancho máximo 620 px, WebP) y agregar un bloque en dos lugares —
la placa en el muro de `index.html` y la ficha con reseña en `auspiciantes.html`.
El recuadro tiene proporción fija 5:3 y centra el logo, así que no hace falta
que todos los archivos midan lo mismo.

## Recomendaciones

- **Peso**: comprimir a ≤ 300 KB por foto. Para JPG, calidad 78–82 es suficiente.
- **Recorte**: las láminas de galería son 4:5 y recortan al centro (`object-fit: cover`).
  Conviene dejar aire arriba y abajo para que no se corte nada importante.
- **Texto alternativo**: si se cambia el contenido de una foto, actualizar el `alt`
  correspondiente en `index.html`. Es lo que leen los lectores de pantalla.
- **Logo institucional**: el escudo de la FCE no se usa como imagen. La marca del
  encabezado es un SVG tipográfico que se adapta a modo claro y oscuro. Si se
  quiere usar el escudo oficial, conviene un PNG con fondo transparente o un SVG.

## Si se agregan más fotos

Duplicar un bloque `<figure class="plate">` en la sección *Registro* de
`index.html` y completar `data-full`, `data-caption`, `src` y `alt`. El visor a
pantalla completa recoge automáticamente todas las láminas que tengan foto.
