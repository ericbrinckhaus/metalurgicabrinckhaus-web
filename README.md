# Brinckhaus Presupuestos

Prototipo funcional de una PWA para que Metalúrgica Brinckhaus cree, edite,
elimine y comparta presupuestos en PDF. Sin backend por ahora: todo se
guarda en `localStorage` del dispositivo, en formato JSON.

## Stack

- **HTML + CSS + JavaScript "vanilla"**, sin build step. Se eligió a
  propósito para poder subir la carpeta tal cual a GitHub Pages o
  Cloudflare Pages sin pipeline de compilación.
- **[jsPDF](https://github.com/parallax/jsPDF)** (vía CDN, cdnjs) para
  generar el PDF en el navegador, sin servidor.
- **Web Share API** (`navigator.share` / `canShare`) para compartir el PDF
  por WhatsApp/email/etc. cuando el dispositivo lo soporta; si no, se
  descarga el PDF y se abre WhatsApp Web con el resumen como texto.
- **Service Worker + Web App Manifest** para que sea instalable en
  iOS/Android y funcione offline con lo último visto.

Todo el código (variables, comentarios, nombres de archivo) está en
inglés; los textos que ve el usuario están en `js/i18n.js`, en español por
defecto. Hay un botón discreto "ES / EN" al final de **Ajustes** por si en
el futuro hace falta habilitar inglés (no está en la navegación principal).

## Estructura

```
lucasbquotes-web/
├── index.html            # Shell de la app (todas las "vistas" viven acá)
├── manifest.json          # Manifest de PWA
├── sw.js                  # Service worker (cache del app shell)
├── css/
│   └── styles.css
├── js/
│   ├── i18n.js             # Diccionario ES/EN + helper t()
│   ├── storage.js          # CRUD sobre localStorage (quotes + settings)
│   ├── utils.js             # Formateo de moneda/fecha, cálculo de totales
│   ├── pdf-generator.js    # Arma el PDF con jsPDF
│   └── app.js               # Controlador principal (vistas, formularios)
└── icons/                  # Íconos placeholder (192/512, normal y maskable)
```

## Cómo correrlo localmente

No hace falta Node ni build. Como los módulos usan `fetch`/Service Worker,
conviene levantar un servidor local en vez de abrir el `index.html` con
doble clic (el service worker no registra sobre `file://`):

```bash
cd lucasbquotes-web
python3 -m http.server 8080
# abrir http://localhost:8080 en el navegador
```

o con Node: `npx serve .`

## Cómo publicarlo

**GitHub Pages**
1. Subí el contenido de esta carpeta a un repo (puede ser la raíz o `/docs`).
2. Settings → Pages → elegí la rama/carpeta.
3. Listo, queda en `https://usuario.github.io/repo/`.

**Cloudflare Pages**
1. Conectá el repo o arrastrá la carpeta en "Direct upload".
2. Build command: (vacío) — Output directory: `/`.
3. Deploy.

Ambos sirven HTTPS por defecto, que es requisito para que el Service
Worker y el botón "instalar app" funcionen en iOS/Android.

## Logo de la empresa

Hay dos formas de tener el logo real en la app, y se pueden combinar:

1. **Reemplazar el archivo por defecto** (más simple, sin tocar código ni
   la app): pisá `assets/logo/MB.png` con el logo real de la empresa
   (mismo nombre de archivo). Mientras nadie subió un logo propio desde
   Ajustes, la app usa ese PNG tanto en el encabezado como en el PDF —
   así que con solo reemplazar el archivo ya queda listo de fábrica.
2. **Desde la app**: Ajustes → "Logo de la empresa" → botón para elegir un
   archivo (PNG/JPG/SVG) desde el celular o la compu. `app.js` lo lee con
   `FileReader` y lo convierte a base64 automáticamente (no hay que pegar
   ningún código a mano); queda guardado en `localStorage` junto con el
   resto de los ajustes de la empresa. Un botón "Usar logo por defecto"
   permite volver a `assets/logo/MB.png` en cualquier momento.

`assets/logo/MB.png` es un placeholder (círculo azul con las iniciales
"MB") generado para este prototipo — reemplazalo por el logo real cuando
lo tengas. Además, `js/logo-default.js` guarda una copia de ese mismo PNG
ya convertida a base64: es el respaldo que usa el PDF si por algún motivo
no se puede leer `assets/logo/MB.png` en el momento (por ejemplo, si la
app se abre con doble clic desde el explorador de archivos —`file://`—
en vez de por un servidor HTTP, donde el navegador bloquea esa lectura).
Si reemplazás `assets/logo/MB.png` por el logo real, conviene regenerar
también `js/logo-default.js` para que el respaldo quede actualizado — el
propio archivo trae en un comentario el comando de una línea para
hacerlo.

Los archivos `icons/icon-*.png` son, en cambio, los íconos de instalación
de la PWA (lo que se ve en la pantalla de inicio del celular), generados
con el mismo placeholder para que el manifest sea válido desde ya.
Conviene reemplazarlos también por versiones reales del logo (192×192 y
512×512, más las versiones "maskable" con margen de seguridad) antes de
publicar — son un archivo aparte del logo de la app porque el sistema
operativo les exige tamaños y formato específicos.

## Subtítulos en negrita dentro de un ítem

En el campo "Detalle" de cada ítem, cualquier línea que empiece con un
guion (`-`) se muestra como subtítulo en negrita (sin viñeta) en vez de
como un punto de la lista — tanto en la vista del presupuesto dentro de
la app como en el PDF. El resto de las líneas se muestran como viñetas
normales. Por ejemplo:

```
- Materiales
Ángulo de 1 pulgada x 1/8
Hierro redondo de 5/16
Pintura al horno
- Mano de obra
Corte y armado del marco
Soldado de varillas
Terminación y pintura
```

genera dos subsecciones en negrita ("Materiales" y "Mano de obra"), cada
una con sus viñetas debajo — replicando la estructura del presupuesto de
ejemplo (rejillas 40×40 / 50×50). Esta lógica vive en un solo lugar,
`Utils.parseDetailLines()` en `js/utils.js`, y la usan tanto
`js/app.js` (vista en pantalla) como `js/pdf-generator.js` (PDF), así que
quedan siempre sincronizados.

## Qué probé al construirlo

- Presupuesto nuevo con varios ítems, cada uno con cantidad y precio
  unitario (para el caso "cada una" del ejemplo de rejillas 40×40/50×50).
- Edición y borrado (con confirmación) de un presupuesto existente.
- Descarga de PDF y botón "Compartir" (Web Share API con archivo adjunto
  en Chrome/Android y Safari/iOS recientes; fallback a WhatsApp Web +
  descarga manual en navegadores más viejos).
- Recarga de la página: los datos persisten porque viven en localStorage.

## Qué extendería primero

En orden de impacto/costo si esto pasa a ser un producto real:

1. **Backend real con sincronización**: hoy los datos viven solo en el
   dispositivo — si Lucas cambia de celular o borra el navegador, pierde
   todo. `js/storage.js` ya aísla toda la persistencia detrás de un mismo
   conjunto de funciones (`getQuotes`, `upsertQuote`, etc.), así que
   cambiarlo por llamadas a una API (por ejemplo Cloudflare Workers +
   D1/KV, o Firebase) es un cambio localizado a un solo archivo.
2. **Numeración y catálogo de precios**: guardar una lista de
   materiales/precios frecuentes (ángulos, hierros, pintura al horno) para
   autocompletar ítems en vez de tipear todo de nuevo cada vez — así el
   presupuesto sale en segundos como en el ejemplo de rejillas.
3. **PDF más fiel al diseño real**: hoy el PDF es una aproximación al
   layout de la imagen que compartiste (barra azul + detalle + total). Se
   podría afinar tipografía, logo más grande, y agregar un pie fijo con
   condiciones estándar de la empresa.
4. **Estados del presupuesto**: pendiente / aceptado / rechazado, y un
   filtro en la lista — hoy todos los presupuestos se ven igual.
5. **Duplicar presupuesto**: para clientes recurrentes o presupuestos muy
   parecidos (como los dos tamaños de rejilla del ejemplo), un botón
   "Duplicar" ahorra tener que cargar todo de cero.
6. **Multiusuario / login**, si en algún momento más de una persona carga
   presupuestos desde distintos dispositivos.
