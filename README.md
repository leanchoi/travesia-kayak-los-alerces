# Travesía y Bajada de Kayak · Parque Nacional Los Alerces

Sitio de la travesía organizada por la **Facultad de Ciencias Económicas** de la
Universidad Nacional de la Patagonia San Juan Bosco, **Sede Esquel**.

Veinte kilómetros a remo entre el Lago Verde, el Río Arrayanes y Bahía Rosales.
La bajada dejó de hacerse en 1997 y volvió al agua en abril de 2026.
**Próxima edición: 12 y 13 de diciembre de 2026.**

---

## Qué es

Un sitio estático: tres archivos y una carpeta de recursos. Sin build, sin
dependencias, sin framework. Se sirve tal cual está.

```
index.html      Estructura y contenido
styles.css      Sistema de diseño completo
app.js          Comportamiento (sin librerías)
assets/         Tipografías, ícono, portada social y fotos
```

## Decisiones de diseño

**Una sola página que se recorre scrolleando.** Antes el contenido estaba
escondido detrás de pestañas de JavaScript: los enlaces no llevaban a ningún
lado, el botón "atrás" no funcionaba y los buscadores sólo veían la primera
sección. Ahora cada sección tiene su ancla y su URL.

**El croquis del recorrido está dibujado a mano en SVG.** Es la pieza central:
muestra los cuatro hitos, las curvas de nivel, la escala y el norte, y se dibuja
solo al entrar en pantalla. Pasar el mouse por un tramo de la lista enciende el
hito correspondiente en el mapa, y al revés. Es un esquema, no una carta náutica
— así está aclarado al pie.

**Tipografías propias, no Google Fonts.** Fraunces (corte *Wonky*, con eje
óptico) e Instrument Sans, ambas con licencia OFL, servidas desde el mismo
dominio. Evita una hoja de estilos externa que bloquea el pintado, un pedido a un
tercero desde el navegador de cada visitante, y que el sitio se vea mal en redes
que bloquean dominios de Google.

**El video no se carga hasta que alguien lo pide.** Antes el reproductor de
YouTube arrancaba solo de fondo: cerca de un megabyte antes de ver una palabra, y
en teléfonos ni siquiera se reproducía. Ahora hay una fachada liviana y el
reproductor se inserta al hacer clic.

**Modo claro y oscuro**, siguiendo la preferencia del sistema.

**Íconos SVG propios**, en lugar de las 100 KB de FontAwesome que se usaban para
una veintena de íconos.

## Accesibilidad

Verificado con una batería automatizada sobre el sitio ya renderizado:

- Todo el texto supera el contraste **WCAG AA (4.5:1)** en los dos modos.
- Los diálogos son `<dialog>` nativos: atrapan el foco, cierran con `Escape` y lo
  devuelven a donde estaba.
- La galería se navega con teclado; el visor avanza con las flechas.
- Un solo `h1`, jerarquía de encabezados sin saltos, todas las imágenes con `alt`.
- Sin desborde horizontal entre 320 px y 1600 px.
- Se respeta `prefers-reduced-motion`: con esa preferencia activa no hay
  animaciones.
- Sin JavaScript el sitio se lee completo, mapa incluido.

## Fotografías

La carpeta `assets/` todavía no tiene las fotos de la travesía. **El sitio
funciona igual**: cada lámina cae a un estado vacío diseñado en vez de mostrar el
ícono de imagen rota. Al subir los archivos con los nombres esperados aparecen
solas, sin tocar código.

Los nombres, recortes y pesos están en [`assets/README.md`](assets/README.md).

## Desarrollo

Cualquier servidor estático sirve. Abrir `index.html` directo con `file://`
también funciona, salvo las tipografías.

```bash
npx serve .
# o
python3 -m http.server 8080
```

## Despliegue

### Docker

```bash
docker build -t travesia-kayak .
docker run -d -p 8080:80 --name travesia-kayak travesia-kayak
```

### Nginx, Caddy o similar

Copiar el contenido del repositorio al directorio público. No hay paso de
compilación.

```bash
git clone https://github.com/leanchoi/travesia-kayak-los-alerces.git /var/www/travesia-kayak
```

## Enlaces

- [Álbum de fotografías (Google Drive)](https://drive.google.com/drive/folders/1t2gUt2ecHjFj2KRR2Z2_L6Mwt_5ZMMUS)
- [Documento de reseñas y auspiciantes (Google Docs)](https://docs.google.com/document/d/19LmdzNiZezFDLwy8k-WqJpZpF3EknkVx/edit)
- [Video de la bajada (YouTube)](https://youtube.com/shorts/t5qNJe3UqBc)

## Créditos

Tipografías **Fraunces** (Undercase Type) e **Instrument Sans** (Instrument),
bajo SIL Open Font License 1.1.

---

*Facultad de Ciencias Económicas — UNPSJB Sede Esquel · esquel@economicasunp.edu.ar*
