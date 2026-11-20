# and also

Lo que te llega es una parte. Cuenta el resto.

Web instalable en el móvil. Pegas algo que te ha llegado o preguntas por un tema; la IA busca fuentes y te devuelve el resto en fichas listas para el chat o para redes.

## Cómo está montada

- **Página:** GitHub Pages, rama `main`, carpeta raíz. Sin paso de compilación.
- **Intermediario:** un Worker de Cloudflare (`proxy/worker.js`) que guarda la clave de Anthropic y la usa en nombre de la app. Se publica solo desde GitHub Actions (`.github/workflows/worker.yml`) cada vez que cambia `proxy/`.
- **Almacén KV `PIEZAS`:** piezas compartidas (un año), invitaciones, cupos diarios, contadores anónimos y memoria de respuestas (tres días). Lo crea la propia publicación si no existe.

### Variables del Worker (Cloudflare → Worker → Settings)

| Variable | Qué es |
| --- | --- |
| `ANTHROPIC_API_KEY` (secreto) | La clave de Anthropic |
| `CODIGO` (secreto) | El código maestro: gestiona invitaciones y ve estadísticas |
| `CUPO_DIARIO` (opcional) | Consultas a la IA por invitación y día; por defecto 60 |
| `ORIGENES` (opcional) | Webs que pueden usarlo; por defecto `https://jrjulvez.github.io` |

La publicación necesita un secreto en GitHub: `CLOUDFLARE_API_TOKEN` (plantilla «Edit Cloudflare Workers»).

## Invitaciones

- El enlace con el **código maestro** (`?c=CODIGO`) es solo para quien administra. En **Ajustes** aparecen las invitaciones y el uso.
- Desde ahí se crea **una invitación por persona**, con su propio enlace y cupo diario. Si una se filtra, se revoca solo esa.
- Para cortar el código maestro, cámbialo en Cloudflare.
- El tope de gasto mensual de la consola de Anthropic es la última protección.

## Qué hace cada archivo

- `motor.js`: las llamadas a la IA (vista previa rápida sin búsqueda, lectura con búsqueda, revisión de calidad, preguntas) y las reglas que no se rompen: cinco veredictos, nunca inventar fuentes ni enlaces, las valoraciones son «dicho», coincidir no es causar, nada de personas privadas, neutralidad política, lo abierto no se da por cerrado. También habla con el intermediario: piezas, memoria, eventos e invitaciones.
- `app.js`: pantallas (portada, lectura, la pieza como fichas, quien recibe el enlace, ajustes y guía de WhatsApp), piezas guardadas en el dispositivo e imágenes de 1080 × 1350 para compartir.
- `sw.js`: caché para abrir sin conexión; siempre pide la versión nueva cuando hay red.

## Recorrido

1. **Pregunta:** pegar, subir una captura, compartir desde otra app o escribir.
2. **El resto:** mientras busca, se enseña lo que se dice; después, una pantalla de fichas que se abren para ver fuentes. Una segunda pasada revisa veredictos y frases antes de compartir. Las preguntas del caso añaden fichas nuevas.
3. **Cuéntalo:** «para el chat» (una ficha y un texto) o «para redes» (carrusel de hasta seis). El enlace con las fuentes es opcional y corto.

## Medición

Solo contadores por día en el Worker, sin datos de nadie: aperturas, piezas, respuestas desde memoria, preguntas, compartidas, enlaces abiertos, receptores que crean, vuelven a los 7 días y llamadas a la IA.

## Límites que conviene saber

- Lo que se escribe se envía a Anthropic para leerlo y buscar fuentes.
- La calidad depende de lo que encuentre la búsqueda. La revisión automática ayuda, pero conviene mirar las fuentes antes de mandar.
- El plan gratuito de Cloudflare KV admite 1.000 escrituras al día: suficiente para una prueba con decenas de personas, no para un lanzamiento.
