// and also · motor
// Llama a la API de Anthropic directamente desde el navegador con la clave del usuario.
// La clave vive solo en este dispositivo (localStorage) y solo se envía a api.anthropic.com.
(function () {
  const API = 'https://api.anthropic.com/v1/messages';
  const VERS = ['es así', 'a medias', 'no es así', 'sin fuente', 'dicho'];
  const TIPOS = ['also', 'relacion', 'antes', 'normal', 'dichos', 'ami', 'falta'];
  const PREGUNTA = {
    also: '¿qué también es verdad?', relacion: '¿qué tiene que ver?', antes: '¿qué pasó antes?',
    normal: '¿es lo normal?', dichos: '¿qué dice cada uno?', ami: '¿y a mí?', falta: '¿qué falta saber?'
  };
  const DEF = { modelo: 'claude-sonnet-5-5', rapido: 'claude-haiku-5-5', busquedas: 6 };

  const ajustes = {
    get clave() { try { return localStorage.getItem('aa_clave') || ''; } catch (e) { return ''; } },
    set clave(v) { try { v ? localStorage.setItem('aa_clave', v) : localStorage.removeItem('aa_clave'); } catch (e) {} },
    get modelo() { try { return localStorage.getItem('aa_modelo') || DEF.modelo; } catch (e) { return DEF.modelo; } },
    set modelo(v) { try { localStorage.setItem('aa_modelo', v); } catch (e) {} },
    get codigo() { try { return localStorage.getItem('aa_codigo') || ''; } catch (e) { return ''; } },
    set codigo(v) { try { v ? localStorage.setItem('aa_codigo', v) : localStorage.removeItem('aa_codigo'); } catch (e) {} }
  };
  const proxy = () => ((window.AA_CONFIG && window.AA_CONFIG.proxy) || '').trim();
  // con clave propia se usa la clave; si no, la invitación (intermediario + código)
  const modo = () => ajustes.clave ? 'clave' : (proxy() && ajustes.codigo ? 'invitado' : (proxy() ? 'falta_codigo' : 'sin_clave'));

  const hoy = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const REGLAS = () => `Eres el motor de «and also», una app española para personas de 18 a 35 años. Alguien ha recibido un mensaje en un grupo (WhatsApp, Instagram) y quiere contar el resto: lo que hay detrás, con qué tiene que ver, si es lo normal, qué le afecta. No eres un verificador que reparte aprobados: ayudas a ampliar y relacionar, y la comprobación es la garantía de que lo que añades es cierto.

Hoy es ${hoy()}. Escribe en castellano de España, frases cortas y secas, sin adjetivos de relleno.

REGLAS QUE NO SE ROMPEN
1. Cinco veredictos, y solo estos: «es así» (hay fuente que lo confirma), «a medias» (parte sí, parte no; o es valoración apoyada en un hecho), «no es así» (la fuente dice lo contrario), «sin fuente» (nadie lo confirma ni lo niega), «dicho» (opinión o promesa de alguien: se cita quién).
2. Nunca inventes un dato, una fecha, una cifra, una cita o un enlace. Si no encuentras fuente, el veredicto es «sin fuente». Cada «url» debe ser una página que has visto en esta búsqueda; si no la tienes, deja "".
3. Las valoraciones del autor («debacle», «escándalo», «las casualidades no existen») son «dicho», aunque suenen a hecho.
4. Coincidir en el tiempo no es causar. Una relación solo existe si una fuente la establece; si no, dilo.
5. Los motivos de la gente no se comprueban: se citan como «dicho», uno por parte, con su nombre.
6. Personas privadas: nunca escribas su nombre, teléfono ni nada que las identifique. Las figuras públicas sí.
7. Neutralidad política total: el mismo trato a todos los partidos. No digas qué partido controla una cámara ni quién gana algo que no esté cerrado oficialmente.
8. Lo que siga abierto (en investigación, sin confirmar) nunca se da por cerrado en ninguna otra parte.
9. No opinas. Si algo es opinión, lleva nombre.

Responde SOLO con un objeto JSON válido entre <json> y </json>, sin texto fuera.`;

  // ---------- llamada base ----------
  async function llamar({ sistema, mensajes, modelo, busquedas, maxTokens, señal }) {
    const m = modo();
    if (m === 'sin_clave') throw { codigo: 'sin_clave', mensaje: 'Falta tu clave de Anthropic. Ponla en Ajustes.' };
    if (m === 'falta_codigo') throw { codigo: 'sin_clave', mensaje: 'Abre and also desde el enlace de invitación que te han pasado.' };
    const cuerpo = { model: modelo || ajustes.modelo, max_tokens: maxTokens || 4000, system: sistema, messages: mensajes };
    if (busquedas) cuerpo.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: busquedas }];
    let r;
    try {
      const cab = m === 'invitado'
        ? { 'content-type': 'application/json', 'x-andalso-codigo': ajustes.codigo }
        : { 'content-type': 'application/json', 'x-api-key': ajustes.clave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
      r = await fetch(m === 'invitado' ? proxy() : API, { method: 'POST', signal: señal, headers: cab, body: JSON.stringify(cuerpo) });
    } catch (e) {
      if (e && e.name === 'AbortError') throw { codigo: 'cancelado', mensaje: 'Cancelado.' };
      throw { codigo: 'red', mensaje: m === 'invitado' ? 'No llego al servidor de and also. Si hay fútbol, algunas operadoras bloquean Cloudflare durante los partidos: prueba a cambiar de wifi a datos (o al revés) o vuelve cuando acabe el partido.' : 'No hay conexión con Anthropic. Revisa tu conexión y vuelve a probar.' };
    }
    let datos = null; try { datos = await r.json(); } catch (e) {}
    if (!r.ok) {
      const msg = (datos && datos.error && datos.error.message) || ('Error ' + r.status);
      const tipo = datos && datos.error && datos.error.type;
      if (tipo === 'codigo') throw { codigo: 'codigo', mensaje: 'Tu invitación no vale. Pide de nuevo el enlace a quien te lo pasó.' };
      if (tipo === 'origen' || tipo === 'config') throw { codigo: 'config', mensaje: 'El intermediario de and also no está bien configurado. Avisa a quien te lo pasó.' };
      if (r.status === 401) throw { codigo: 'clave', mensaje: m === 'invitado' ? 'La clave de la invitación ha dejado de funcionar. Avisa a quien te lo pasó.' : 'Tu clave no vale o ha caducado. Revísala en Ajustes.' };
      if (r.status === 429) throw { codigo: 'limite', mensaje: m === 'invitado' ? 'Hay mucha gente usando la invitación ahora mismo. Espera un minuto y vuelve a probar.' : 'Has llegado al límite de uso de tu cuenta por ahora. Espera un minuto.' };
      if (r.status === 529 || r.status >= 500) throw { codigo: 'saturado', mensaje: 'La API está saturada ahora mismo. Vuelve a probar en un rato.' };
      if (/web.?search/i.test(msg)) throw { codigo: 'busqueda', mensaje: 'Tu cuenta no tiene activada la búsqueda web. Actívala en la consola de Anthropic (es un interruptor) y vuelve a probar.' };
      if (/model/i.test(msg)) throw { codigo: 'modelo', mensaje: 'Tu cuenta no tiene acceso a ese modelo. Elige otro en Ajustes.' };
      if (/credit|balance|billing|spend/i.test(msg)) throw { codigo: 'saldo', mensaje: modo() === 'invitado' ? 'La invitación se ha quedado sin saldo este mes. Avisa a quien te lo pasó.' : 'Tu cuenta de Anthropic no tiene saldo. Añade crédito en la consola.' };
      throw { codigo: 'api', mensaje: msg };
    }
    const texto = (datos.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const errBusqueda = (datos.content || []).find(b => b.type === 'web_search_tool_result' && b.content && b.content.type === 'web_search_tool_result_error');
    const uso = datos.usage || {};
    const consumo = {
      entrada: (uso.input_tokens || 0) + (uso.cache_read_input_tokens || 0) + (uso.cache_creation_input_tokens || 0),
      salida: uso.output_tokens || 0,
      busquedas: (uso.server_tool_use && uso.server_tool_use.web_search_requests) || 0
    };
    return { texto, consumo, errBusqueda: !!errBusqueda, parada: datos.stop_reason };
  }

  function sacarJSON(texto) {
    let t = texto;
    const a = t.lastIndexOf('<json>'), b = t.lastIndexOf('</json>');
    if (a >= 0 && b > a) t = t.slice(a + 6, b);
    else { const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i >= 0 && j > i) t = t.slice(i, j + 1); }
    try { return JSON.parse(t); } catch (e) { throw { codigo: 'formato', mensaje: 'La respuesta ha llegado incompleta. Vuelve a probar.' }; }
  }
  const verOK = v => VERS.indexOf(v) >= 0 ? v : 'sin fuente';
  const limpia = s => (typeof s === 'string' ? s : '').trim();
  const urlOK = u => (/^https?:\/\//.test(u || '') ? u : '');

  // ---------- 1. leer lo que ha llegado ----------
  async function leer(entrada, señal) {
    const contenido = [];
    if (entrada.imagen) {
      contenido.push({ type: 'image', source: { type: 'base64', media_type: entrada.imagen.tipo, data: entrada.imagen.datos } });
      contenido.push({ type: 'text', text: 'Esto es una captura que ha llegado a un grupo. Primero retecléala: copia solo el texto del mensaje o de la noticia, sin nombres de personas privadas, teléfonos, horas de chat ni interfaz.' + (entrada.texto ? '\nComentario de quien la comparte: ' + entrada.texto : '') });
    } else {
      contenido.push({ type: 'text', text: 'Esto es lo que ha escrito la persona. Puede ser un mensaje que le ha llegado (texto reenviado, titular, enlace) o una pregunta o duda suya escrita con sus palabras:\n«' + entrada.texto + '»' + (/https?:\/\//.test(entrada.texto) ? '\nSi es un enlace, busca esa noticia y trabaja con su titular y lo que afirma.' : '') });
    }
    contenido.push({ type: 'text', text: `Haz esto:
0. Decide si es un MENSAJE que le ha llegado o una PREGUNTA suya («¿es verdad que…?», «me han dicho que…», «¿por qué…?»). «es_pregunta»: true o false.
1. «original»: si es un mensaje, el texto retecleado tal cual (sin datos de personas privadas); si es un enlace, el titular de la noticia. Si es una pregunta, lo que esa pregunta da por hecho, escrito como afirmaciones neutras en una a tres frases (por ejemplo «¿es verdad que la luz ha subido un 30 % por los impuestos?» → «La luz ha subido un 30 %. Es por los impuestos.»). Si no da nada por hecho, escribe la idea de fondo que se suele oír sobre ese tema, sin inventar cifras.
2. «tramos»: parte el original en 2–6 afirmaciones. Cada «texto» debe ser un trozo LITERAL del original. Para cada una busca y da veredicto, «porque» (una frase) y la fuente.
3. «also»: el hecho comprobado que más amplía lo que llegó, lo que también es verdad y el mensaje no cuenta. Mejor si tiene un número que da contexto. Nunca uno inventado para que quede bonito.
4. «en_una_frase»: la idea que se mandaría al grupo, en tres tonos. Debe empezar por lo que hay detrás, no por un veredicto tipo «falso» o «verdadero». No puede contradecir los veredictos ni cerrar nada que siga abierto. Marca como mucho DOS palabras con **asteriscos** (irán resaltadas).
   neutro: seco y claro. complice: empieza dándole al otro la razón que tiene («yo también lo pensé…»). seco: lo mínimo.
5. «titulo_corto»: 2–4 palabras para la lista de piezas. «fuente_original»: qué es (por ejemplo «captura de un titular», «texto reenviado», «tu pregunta»).

Formato:
<json>{"es_pregunta":false,"titulo_corto":"","fuente_original":"","original":"","tramos":[{"texto":"","veredicto":"","porque":"","fuente":"","url":""}],"also":{"titulo":"","grande":"","remate":"","veredicto":"es así","fuente":"","url":""},"en_una_frase":{"neutro":"","complice":"","seco":""}}</json>` });
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: contenido }], busquedas: DEF.busquedas, maxTokens: 5000, señal });
    const j = sacarJSON(r.texto);
    return { datos: normalizarLectura(j), consumo: r.consumo, errBusqueda: r.errBusqueda };
  }

  function normalizarLectura(j) {
    const original = limpia(j.original);
    if (!original) throw { codigo: 'formato', mensaje: 'No he podido leer el mensaje. Prueba a pegar el texto.' };
    // localizar cada tramo dentro del original, en orden
    const segs = []; const tramos = {}; let pos = 0, n = 0;
    (j.tramos || []).forEach(t => {
      const tx = limpia(t.texto); if (!tx) return;
      let i = original.indexOf(tx, pos);
      if (i < 0) i = original.toLowerCase().indexOf(tx.toLowerCase(), pos);
      if (i < 0) return;
      if (i > pos) segs.push(original.slice(pos, i));
      const k = 't' + (n++);
      segs.push({ k, t: original.slice(i, i + tx.length) });
      tramos[k] = { ver: verOK(t.veredicto), porque: limpia(t.porque), fuente: limpia(t.fuente) || '—', url: urlOK(t.url) };
      pos = i + tx.length;
    });
    if (pos < original.length) segs.push(original.slice(pos));
    if (!n) throw { codigo: 'formato', mensaje: 'No he podido separar las frases del mensaje. Vuelve a probar.' };
    const a = j.also || {};
    const f = j.en_una_frase || {};
    return {
      titulo: limpia(j.titulo_corto) || 'Sin título',
      fuenteOriginal: limpia(j.fuente_original) || (j.es_pregunta ? 'tu pregunta' : 'lo que te llegó'),
      esPregunta: j.es_pregunta === true,
      original: segs, tramos, inicio: 't0',
      portada: { neutro: limpia(f.neutro), complice: limpia(f.complice) || limpia(f.neutro), seco: limpia(f.seco) || limpia(f.neutro) },
      alsoSlide: { big: limpia(a.grande) || limpia(a.titulo), sub: limpia(a.remate), fuente: limpia(a.fuente) },
      N: { also: { q: PREGUNTA.also, titulo: limpia(a.titulo) || limpia(a.grande), ver: verOK(a.veredicto || 'es así'), fuente: limpia(a.fuente) || '—', r: limpia(a.remate) || limpia(a.grande), items: [{ t: limpia(a.grande) || limpia(a.titulo), ver: verOK(a.veredicto || 'es así'), f: limpia(a.fuente) || '—', url: urlOK(a.url) }] } }
    };
  }

  // ---------- 2. contestar una de las preguntas ----------
  const GUIA = {
    also: 'Otro hecho comprobado que amplía lo que llegó y no se cuenta.',
    relacion: 'Con qué tiene que ver: una cadena de 2–5 eslabones, cada uno con su veredicto. Si un eslabón no tiene fuente, ponlo como «sin fuente». Si no encuentras relación, dilo.',
    antes: 'Qué pasó antes: 2–5 fechas en orden, cada una con su fuente.',
    normal: 'Si esto es lo normal: el dato de frecuencia o de contexto histórico que dice si es raro o habitual.',
    dichos: 'Qué dice cada parte implicada: una cita por parte, con nombre, todas como «dicho». Mismo espacio para cada parte.',
    ami: 'Cómo afecta a alguien que vive en España: solo efectos con fuente. Si no hay efecto comprobado, dilo con «sin fuente».',
    falta: 'Qué no se sabe todavía: 1–4 preguntas abiertas, todas «sin fuente».'
  };
  async function responder(tipo, pieza, pregunta, señal) {
    const ctx = 'Lo que llegó: «' + pieza.original.map(s => typeof s === 'string' ? s : s.t).join('') + '»\nYa comprobado: ' +
      Object.values(pieza.tramos).map(t => t.ver + ' — ' + t.porque).join(' | ');
    const txt = `${ctx}

La persona pregunta: «${pregunta}»
Tipo de pregunta: ${PREGUNTA[tipo]} — ${GUIA[tipo]}

Busca y contesta. «respuesta»: 1–2 frases que se leen de un tirón. «titulo»: la idea en menos de 12 palabras. «items»: 1–5 puntos, cada uno con veredicto y fuente. «veredicto»: el del punto más débil. Si de verdad no hay relación con lo que llegó, pon "relacion": false y explica en «respuesta» que no la encuentras.

<json>{"relacion":true,"titulo":"","veredicto":"","fuente":"","respuesta":"","items":[{"texto":"","veredicto":"","fuente":"","url":""}]}</json>`;
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: txt }], busquedas: tipo === 'falta' ? 2 : DEF.busquedas, maxTokens: 3000, señal });
    const j = sacarJSON(r.texto);
    if (j.relacion === false) return { sinRelacion: true, r: limpia(j.respuesta) || 'No encuentro relación con lo que te llegó.', consumo: r.consumo };
    const items = (j.items || []).map(e => ({ t: limpia(e.texto), ver: verOK(e.veredicto), f: limpia(e.fuente) || '—', url: urlOK(e.url) })).filter(e => e.t).slice(0, 5);
    if (!items.length) throw { codigo: 'formato', mensaje: 'La respuesta ha llegado vacía. Vuelve a probar.' };
    const peor = items.map(e => e.ver).sort((a, b) => rango(b) - rango(a))[0];
    return { nodo: { q: PREGUNTA[tipo], titulo: limpia(j.titulo) || items[0].t, ver: verOK(j.veredicto || peor), fuente: limpia(j.fuente) || items[0].f, r: limpia(j.respuesta), items }, consumo: r.consumo };
  }
  // ---------- 2b. pregunta libre: una sola llamada que la entiende y la contesta ----------
  async function responderLibre(pregunta, pieza, señal) {
    const ctx = 'Lo que llegó: «' + pieza.original.map(s => typeof s === 'string' ? s : s.t).join('') + '»\nYa comprobado: ' +
      Object.values(pieza.tramos).map(t => t.ver + ' — ' + t.porque).join(' | ');
    const txt = `${ctx}

PREGUNTA LIBRE de la persona: «${pregunta}»

1. Decide qué es («tipo»):
   also = qué más es verdad o qué no cuenta el mensaje · relacion = con qué tiene que ver, causas, conexiones · antes = qué pasó antes · normal = si es normal o raro · dichos = qué dice cada parte · ami = cómo le afecta en España · falta = qué no se sabe · verdad = si el propio mensaje es verdad · libre = cualquier otra pregunta relacionada con lo que llegó · ninguna = no tiene nada que ver con lo que llegó.
2. Si es «verdad» o «ninguna», no busques: pon solo el tipo y una «respuesta» de una frase.
3. Si no, busca y contesta a SU pregunta tal como la ha hecho. «titulo»: la respuesta en menos de 12 palabras. «respuesta»: 1–2 frases. «items»: 1–5 puntos con veredicto y fuente. «veredicto»: el del punto más débil. Si no encuentras fuente, dilo con «sin fuente»; no rellenes.

<json>{"tipo":"","titulo":"","veredicto":"","fuente":"","respuesta":"","items":[{"texto":"","veredicto":"","fuente":"","url":""}]}</json>`;
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: txt }], busquedas: DEF.busquedas, maxTokens: 3000, señal });
    const j = sacarJSON(r.texto);
    const tipo = (TIPOS.indexOf(j.tipo) >= 0 || ['libre', 'verdad', 'ninguna'].indexOf(j.tipo) >= 0) ? j.tipo : 'libre';
    if (tipo === 'verdad') return { tipo, consumo: r.consumo };
    if (tipo === 'ninguna') return { tipo, r: limpia(j.respuesta) || 'No encuentro relación entre tu pregunta y lo que te ha llegado.', consumo: r.consumo };
    const items = (j.items || []).map(e => ({ t: limpia(e.texto), ver: verOK(e.veredicto), f: limpia(e.fuente) || '—', url: urlOK(e.url) })).filter(e => e.t).slice(0, 5);
    if (!items.length) {
      if (limpia(j.respuesta)) items.push({ t: limpia(j.respuesta), ver: 'sin fuente', f: 'sin fuente encontrada', url: '' });
      else throw { codigo: 'formato', mensaje: 'La respuesta ha llegado vacía. Vuelve a probar.' };
    }
    const peor = items.map(e => e.ver).sort((a, b) => rango(b) - rango(a))[0];
    const q = tipo === 'libre' ? '«' + pregunta.replace(/^[¿\s]+|[?\s]+$/g, '') + '»' : PREGUNTA[tipo];
    return { tipo, nodo: { q, titulo: limpia(j.titulo) || items[0].t, ver: verOK(j.veredicto || peor), fuente: limpia(j.fuente) || items[0].f, r: limpia(j.respuesta), items }, consumo: r.consumo };
  }
  function rango(v) { return { 'es así': 0, 'dicho': 1, 'a medias': 2, 'sin fuente': 3, 'no es así': 4 }[v] || 0; }

  // ---------- 3. entender una pregunta escrita ----------
  async function interpretar(texto, pieza, señal) {
    const ctx = pieza.original.map(s => typeof s === 'string' ? s : s.t).join('');
    const txt = `Clasifica la PREGUNTA sobre este MENSAJE en una categoría:
also = qué más es verdad, qué no cuenta, si hubo algo oculto
relacion = qué tiene que ver con otra cosa, conexiones, causas
antes = qué pasó antes, cronología
normal = si es normal, habitual, frecuente o raro
dichos = qué dice cada parte, quién culpa a quién
ami = cómo me afecta, consecuencias en España
falta = qué no se sabe todavía
verdad = si el propio mensaje es verdad
ninguna = no tiene que ver con este mensaje

MENSAJE: ${ctx}
PREGUNTA: ${texto}
Responde solo: <json>{"tipo":""}</json>`;
    try {
      const r = await llamar({ sistema: 'Clasificas preguntas. Respondes solo JSON.', mensajes: [{ role: 'user', content: txt }], modelo: DEF.rapido, maxTokens: 60, señal });
      const j = sacarJSON(r.texto);
      if (TIPOS.indexOf(j.tipo) >= 0 || j.tipo === 'verdad' || j.tipo === 'ninguna') return { tipo: j.tipo, consumo: r.consumo };
    } catch (e) { if (e && (e.codigo === 'clave' || e.codigo === 'sin_clave' || e.codigo === 'red')) throw e; }
    return { tipo: porPalabras(texto), consumo: null };
  }
  function porPalabras(t) {
    t = t.toLowerCase();
    const R = [['normal', /(normal|a menudo|habitual|frecuen|pasa mucho|casualidad|raro)/], ['antes', /(antes|cu[aá]ndo|cronolog|c[oó]mo se lleg|empez|origen)/], ['ami', /(a m[ií]|me afecta|afecta|espa[nñ]a|bolsillo|factura|precio|consecuen)/], ['dichos', /(qui[eé]n (ha )?dicho|qu[eé] dice|opina|culpa|declar)/], ['falta', /(no se sabe|falta|todav[ií]a|pendiente)/], ['relacion', /(qu[eé] tiene que ver|relaci|conect|vincul|tiene algo que ver)/], ['also', /(no cuenta|qu[eé] m[aá]s|algo m[aá]s|lo que no dice|tambi[eé]n|omite|ataque)/], ['verdad', /(es verdad|es cierto|es mentira|bulo|fake)/]];
    for (const [k, re] of R) if (re.test(t)) return k;
    return 'ninguna';
  }

  async function probarClave() {
    const r = await llamar({ sistema: 'Responde solo «ok».', mensajes: [{ role: 'user', content: 'ok' }], maxTokens: 5 });
    return !!r;
  }

  // ---------- enlaces cortos (las piezas se guardan en el intermediario) ----------
  async function guardarPieza(obj) {
    if (!proxy()) throw { tipo: 'sin_almacen', mensaje: 'El enlace corto necesita el intermediario.' };
    let r;
    try { r = await fetch(proxy().replace(/\/$/, '') + '/p', { method: 'POST', headers: { 'content-type': 'application/json', 'x-andalso-codigo': ajustes.codigo || '' }, body: JSON.stringify(obj) }); }
    catch (e) { throw { tipo: 'red', mensaje: 'No llego al servidor para crear el enlace. Si hay fútbol, puede estar bloqueado un rato. Las fichas se comparten igual.' }; }
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (r.ok && d.id) return d.id;
    const t = d.error && d.error.type;
    throw { tipo: t || 'error', mensaje: t === 'sin_almacen' ? 'Falta activar los enlaces cortos en Cloudflare.' : t === 'codigo' ? 'Hace falta el enlace de invitación para crear enlaces.' : 'No he podido crear el enlace.' };
  }
  async function leerPieza(id) {
    const r = await fetch(proxy().replace(/\/$/, '') + '/p/' + encodeURIComponent(id));
    if (!r.ok) throw { tipo: r.status === 404 ? 'no_existe' : 'error' };
    return r.json();
  }

  window.MOTOR = { guardarPieza, leerPieza, leer, responder, responderLibre, interpretar, porPalabras, probarClave, ajustes, modo, proxy, PREGUNTA, TIPOS, VERS, DEF };
})();
