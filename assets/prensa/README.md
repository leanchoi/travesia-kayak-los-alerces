# assets/prensa/

Logos de medios que cubrieron la travesía.

## Pendiente

| Archivo | Medio | Notas |
|---|---|---|
| `weekend.png` | Revista Weekend (Perfil) | Wordmark amarillo. **Fondo transparente.** Ancho sugerido 280 px. |

Mientras el archivo no esté, el bloque de prensa de la portada muestra el nombre
compuesto tipográficamente en lugar del logo: no queda una imagen rota. La
lógica está en `app.js` (sección *7c · Logo de prensa*) y el estilo del
reemplazo en `.press__fallback`.

## Por qué no está incluido

El dominio `weekend.perfil.com` está bloqueado por la política de red del
entorno donde se armó esta versión, así que no se pudo descargar el logo ni
leer la nota. Hay que bajarlo aparte, recortarlo al contenido y guardarlo con
fondo transparente.

La nota enlazada desde la portada es:
<https://weekend.perfil.com/noticias/aventura/despues-de-30-anos-vuelve-la-tradicional-travesia-en-kayak-a-esquel.phtml>

Conviene verificar contra la nota publicada el titular y la bajada que aparecen
en el bloque `.press` de `index.html`, que se escribieron a partir del título
del enlace y no del texto del artículo.
