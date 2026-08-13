# Prompt para Antigravity

Copiá todo lo que está debajo de la línea y pegalo como prompt inicial.

---

## Contexto

Trabajás sobre el repositorio `leanchoi/travesia-kayak-los-alerces`: el sitio de la
Travesía y Bajada de Kayak del Parque Nacional Los Alerces, organizada por la
Facultad de Ciencias Económicas de la UNPSJB, Sede Esquel. Próxima edición:
12 y 13 de diciembre de 2026.

**Stack:** frontend estático sin build (HTML + CSS + JS a mano, sin framework)
servido por Express, con SQLite para inscripciones, noticias, beneficios y
usuarios del panel.

```
index.html          Portada
auspiciantes.html   Subpágina de auspiciantes
beneficios.html     Subpágina de beneficios (lee /api/beneficios)
styles.css          Sistema de diseño único, compartido por las tres páginas
app.js              Frontend + panel de administración
server.js           API Express + SQLite
assets/             Tipografías propias, logos, íconos, fotos
Dockerfile          node:20-alpine, expone 80, volumen en /app/data
```

**No hay paso de compilación.** No agregues bundler, framework ni Tailwind: el
sitio está escrito a mano a propósito y el CSS es un sistema de tokens propio
(`--paper`, `--ink`, `--lake`, `--ember`, `--serif` Fraunces, `--sans`
Instrument Sans). Todo lo nuevo tiene que usar esos tokens y esas clases.

---

## Tarea 1 · Desplegar en el VPS

Poné la rama `claude/travesia-kayak-frontend-upgrade-aprq1i` (o `main` una vez
mergeada) a correr en el VPS.

- `docker build -t travesia-kayak .` y `docker run -d -p 80:80 -v travesia_data:/app/data --name travesia travesia-kayak`
- **Montá un volumen en `/app/data`**: ahí vive `travesia.db`. Sin volumen se
  pierden las inscripciones en cada deploy.
- Definí `JWT_SECRET` por variable de entorno. Hoy hay un valor por defecto
  hardcodeado en `server.js`; en producción tiene que venir del entorno.
- El usuario admin inicial se siembra solo la primera vez:
  `admin@economicasunp.edu.ar` / `admin123`. **Cambiá esa contraseña apenas
  levante.**
- Poné HTTPS adelante (Caddy o nginx + certbot). El formulario manda DNI,
  teléfono, datos de salud y comprobantes de pago: no puede viajar en claro.
- Verificá que `/api/beneficios` responda y que `beneficios.html` liste las seis
  promociones de ejemplo.

---

## Tarea 2 · Las cuatro imágenes de la línea de tiempo

En la sección *Historia* hay una línea de tiempo. Los años **1997** y **2026**
(abril) son botones que abren un carrusel de dos imágenes cada uno. La estructura
está hecha y funciona; **faltan los archivos**.

Generá o conseguí cuatro imágenes y guardalas en `assets/anios/`:

| Archivo | Qué debe mostrar |
|---|---|
| `1997-01.jpg` | Largada de kayaks en el Lago Verde, estética años noventa |
| `1997-02.jpg` | Descenso del Río Arrayanes con equipamiento de la época |
| `2026-04-01.jpg` | Flotilla de kayaks sobre el Río Arrayanes, día claro |
| `2026-04-02.jpg` | Llegada y campamento en la playa de Bahía Rosales |

Formato: 4:3 horizontal, 1600 × 1200 px, ≤ 300 KB.

**No hace falta virarlas a blanco y negro**: el CSS ya aplica escala de grises y
un leve sepia a las de 1997 mediante la clase `.reel__shot--aged`.

> **Importante.** Si las imágenes son generadas con IA y no fotografías reales de
> aquellas bajadas, hay que decirlo en el epígrafe. Presentar una imagen generada
> como registro documental de un evento que efectivamente ocurrió es fabricar un
> archivo histórico. Alcanza con agregar «recreación» al campo `cap` de cada toma
> en el objeto `ARCHIVO` de `app.js` (sección *7b · Archivo por año*).

---

## Tarea 3 · Logo de Weekend

La portada tiene un bloque de prensa que enlaza a la nota de Weekend (Perfil):
<https://weekend.perfil.com/noticias/aventura/despues-de-30-anos-vuelve-la-tradicional-travesia-en-kayak-a-esquel.phtml>

1. Descargá el logotipo de Weekend (wordmark amarillo), recortalo al contenido,
   **hacele fondo transparente** y guardalo como `assets/prensa/weekend.png`,
   ~280 px de ancho.
2. Mientras el archivo no exista, el bloque muestra el nombre compuesto
   tipográficamente en lugar de una imagen rota. Ese respaldo está en `app.js`
   (*7c · Logo de prensa*) y en `.press__fallback`. No lo saques.
3. **Abrí la nota y verificá el titular y la bajada** que figuran en el bloque
   `.press` de `index.html`. Se escribieron a partir del título del enlace, no
   del texto del artículo, porque el dominio estaba bloqueado en el entorno
   donde se armó esta versión. Corregilos contra lo publicado.

---

## Tarea 4 · Fotos que faltan

El sitio nunca tuvo las fotos reales. Cada lámina cae hoy a un estado vacío
diseñado ("Fotografía pendiente"), así que nada se rompe. Al subir los archivos
con estos nombres exactos aparecen solas, sin tocar código:

- `assets/gallery-1.jpg` — Río Arrayanes, tramo de corriente
- `assets/gallery-2.jpg` — Lago Verde, largada
- `assets/gallery-3.jpg` — Bahía Rosales, llegada
- `assets/gallery-4.jpg` — la flotilla completa

Recorte 4:5 vertical, 1200 × 1500 px, ≤ 300 KB. Detalle en `assets/README.md`.

También conviene cargar los logos de los prestadores de beneficios que todavía
no tienen: se cargan por ruta desde el panel, campo *Ruta del logo*.

---

## Tarea 5 · Confirmar las citas de la sección Voces

En `index.html`, sección *Voces*, hay tres citas marcadas con la clase
`voice--draft` y una etiqueta visible **«Cita en revisión»**.

Son **borradores redactados para enviar a aprobar**, no declaraciones que esas
personas hayan hecho. Dos de ellas son personas reales y verificables:

- **Ariel Rodríguez** — intendente / interventor del Parque Nacional Los Alerces,
  más de 28 años en el área protegida, ex jefe del departamento de guardaparques.
- **Fernando Chaparro** — kayakista. **Confirmá sus credenciales exactas antes de
  publicar**: la búsqueda sólo devuelve con certeza a un canoísta olímpico
  argentino, y no está claro que sea la misma persona.

Procedimiento: mandale a cada uno su texto, y cuando lo apruebe reemplazá la
cita por sus palabras reales y borrá la clase `voice--draft` y el
`<span class="voice__flag">`. Hasta entonces, la marca se queda.

No publiques una cita atribuida a una persona real que esa persona no dijo.

---

## Tarea 6 · Repasos finales

- **Contraste y accesibilidad.** El sitio cumple WCAG AA en modo claro y oscuro.
  Si tocás colores, revalidalo.
- **Sin desborde horizontal entre 320 y 1600 px.** Verificalo después de cada
  cambio de layout.
- **Los diálogos no mueven el scroll.** Está resuelto con un `body` fijo y
  restauración de la posición (`lock()` en `app.js`). Si agregás un diálogo
  nuevo, abrilo con `lock(true); dlg.showModal();` y pasalo por `wireDialog()`.
- **El dato «100 embarcaciones»** de la ficha técnica de la portada quedó sin año
  ni fuente. Confirmá si corresponde a la edición de diciembre de 2026 y, si es
  así, etiquetalo.
- **FinanCity dice «desde 1737»** en su reseña de `auspiciantes.html`. Vino así
  del documento de auspicios y se dejó textual. Verificá si es 1937.

---

## Cómo verificar que no rompiste nada

```bash
npm install --omit=dev
PORT=8100 node server.js
```

Y comprobá, con el sitio levantado:

1. La portada carga sin errores de consola.
2. Tocar **1997** en la línea de tiempo abre el carrusel, y al cerrarlo la
   página queda en el mismo punto donde estaba.
3. El formulario de inscripción exige la declaración de salud, acepta un
   comprobante y devuelve un código `KA-######`.
4. El panel (candado del pie) entra con las credenciales admin y la pestaña
   **Beneficios** permite crear, editar y eliminar.
5. `beneficios.html` lista lo que haya cargado el panel.
