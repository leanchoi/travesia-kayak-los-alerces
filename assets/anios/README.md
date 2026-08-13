# assets/anios/

Imágenes del carrusel que se abre al tocar cada año en la línea de tiempo de la
sección *Historia*. **Si un archivo falta, la lámina cae a un estado vacío
diseñado**: no se rompe nada. Apenas se suben con estos nombres, aparecen solas.

| Archivo | Año | Qué debería mostrar |
|---|---|---|
| `1997-01.jpg` | 1997 | Largada en el Lago Verde |
| `1997-02.jpg` | 1997 | Descenso del Arrayanes con equipamiento de la época |
| `2026-04-01.jpg` | abril 2026 | La flotilla completa sobre el Arrayanes |
| `2026-04-02.jpg` | abril 2026 | Llegada y campamento en Bahía Rosales |

- **Recorte**: 4:3 horizontal, 1600 × 1200 px, ≤ 300 KB.
- **Las de 1997 no hace falta virarlas a mano**: el CSS ya las pasa a blanco y
  negro con un leve sepia (`.reel__shot--aged`), para que se lean como archivo.

## Si son imágenes generadas

Si las imágenes de 1997 no son fotografías reales de aquella bajada sino
recreaciones, hay que decirlo en el epígrafe: presentarlas como registro
documental de un evento que efectivamente ocurrió sería inventar un archivo
histórico. Alcanza con agregar «recreación» al `cap` correspondiente en el
objeto `ARCHIVO` de `app.js`.

## Agregar otro año

En `app.js`, sumar una entrada al objeto `ARCHIVO` con su clave, título, bajada,
`aged: true|false` y las tomas. Después, en `index.html`, convertir ese `<li>` de
la línea de tiempo en un `<button class="timeline__btn" data-year="…">` como los
que ya están.
