# and also

Lo que te llega es una parte. Cuenta el resto.

Web instalable en el móvil. Cada persona usa su propia clave de Anthropic: la app no tiene servidor, no guarda nada fuera del dispositivo y no te cuesta nada mantenerla.

## Publicarla (10 minutos, gratis)

**Opción A · Netlify (la más fácil)**
1. Descomprime el zip.
2. Entra en https://app.netlify.com/drop (te pedirá crear una cuenta gratis).
3. Arrastra la carpeta `andalso-app` entera a la página.
4. Te da una dirección tipo `https://nombre-raro.netlify.app`. En «Site settings» puedes cambiarle el nombre o ponerle tu dominio.

**Opción B · GitHub Pages**
1. Crea un repositorio y sube el contenido de la carpeta (que `index.html` quede en la raíz).
2. En Settings → Pages, elige la rama `main` y la carpeta raíz.

Tiene que servirse por **https**: sin https no funcionan la instalación ni el modo sin conexión.

## Lo que necesita cada persona

1. Una cuenta en https://console.anthropic.com con algo de saldo.
2. La **búsqueda web activada** en la configuración de su organización en la consola. Sin ella, la app avisa con un mensaje claro.
3. Una clave de API, que se pega una sola vez en Ajustes y se queda solo en ese móvil.

Sin clave se pueden probar los dos ejemplos (BBC y cinco golpes), con respuestas preparadas y comprobadas a mano.

## Coste para el usuario

- Leer un mensaje: hasta 6 búsquedas. Cada pregunta: hasta 6 más (2 la de «qué falta saber»).
- La búsqueda cuesta 10 $ por cada 1.000 (1 céntimo cada una), más los tokens del modelo.
- La propia app enseña, en cada pieza, cuántas búsquedas ha gastado.

## Instalarla y compartir desde WhatsApp

**Android (Chrome):** abre la dirección, menú ⋮ → «Instalar aplicación». Desde ese momento aparece en el menú de compartir de cualquier app: compartes un mensaje o un enlace y se abre and also con el texto ya pegado.

**iPhone (Safari):** abre la dirección, botón compartir → «Añadir a pantalla de inicio». Para compartir desde WhatsApp hace falta un atajo:
1. App Atajos → nuevo atajo → en sus ajustes, activa «Mostrar en la hoja de compartir» y acepta Texto y URL.
2. Acción «Codificar URL» con la entrada del atajo.
3. Acción «Abrir URL» con `https://TU-DIRECCION/?t=` seguido del resultado codificado.
4. Llámalo «and also». Ya aparece al compartir un mensaje.

Las capturas no pasan por el atajo: se suben desde la propia app con «Subir una captura».

## Cómo funciona

- `motor.js`: las tres llamadas a la API (leer, contestar una pregunta, entender una pregunta escrita) y las reglas que la IA no puede romper: cinco veredictos, nunca inventar fuentes ni enlaces, las valoraciones son «dicho», coincidir no es causar, nada de personas privadas, neutralidad política, lo abierto no se da por cerrado.
- `app.js`: pantallas, piezas guardadas en el dispositivo, imágenes 1080×1350 para compartir y el enlace.
- El **enlace** lleva la pieza comprimida dentro (`#p=…`). Quien lo abre ve todo lo comprobado, con fuentes, sin cuentas ni servidor. Los ejemplos no generan enlace.
- `demo.js`: los dos casos de ejemplo.
- Modelos por defecto: `claude-sonnet-5-5` para buscar y `claude-haiku-5-5` para entender preguntas. El modelo principal se cambia en Ajustes.

## Límites que conviene saber

- La clave queda en el navegador del usuario. Es su clave y su gasto, pero cualquiera con acceso a ese móvil desbloqueado podría verla. Ajustes tiene un botón para borrarla.
- Lo que se pega se envía a Anthropic para leerlo y buscar fuentes.
- La calidad de cada pieza depende de lo que encuentre la búsqueda. La app marca «sin fuente» lo que no puede respaldar, pero conviene revisar antes de mandar.
- Enlaces de noticias: la IA busca la noticia a partir del enlace; si está detrás de un muro de pago, puede no leerla entera.
