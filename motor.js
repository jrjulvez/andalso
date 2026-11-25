// and also · motor
// Habla con la IA a través del intermediario (invitación) o directamente con la clave propia.
// La clave y el código viven solo en este dispositivo (localStorage).
(function () {
  const API = 'https://api.anthropic.com/v1/messages';
  const VERS = ['es así', 'a medias', 'no es así', 'sin fuente', 'dicho'];
  const ESTADOS = ['hecho asentado', 'confirmado', 'anunciado', 'en revisión', 'en discusión', 'desmentido', 'opinión', 'sin datos'];
  const DEF = { modelo: 'claude-sonnet-5-5', rapido: 'claude-haiku-5-5', busquedas: 6 };

  const guarda = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };
  const lee = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const ajustes = {
    get clave() { return lee('aa_clave'); }, set clave(v) { guarda('aa_clave', v); },
    get codigo() { return lee('aa_codigo'); }, set codigo(v) { guarda('aa_codigo', v); }
  };
  const proxy = () => ((window.AA_CONFIG && window.AA_CONFIG.proxy) || '').trim().replace(/\/$/, '');
  // con clave propia se usa la clave; si no, la invitación (intermediario + código)
  const modo = () => ajustes.clave ? 'clave' : (proxy() && ajustes.codigo ? 'invitado' : (proxy() ? 'falta_codigo' : 'sin_clave'));

  const hoy = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const REGLAS = () => `Eres el motor de «and also», una app española para personas de 18 a 35 años. Alguien quiere entender algo que le ha llegado (un mensaje de un grupo, un titular, un enlace) o un tema por el que pregunta, y contar el resto: lo que hay detrás, por qué pasa, desde cuándo, a quién afecta, si es lo normal, qué también es verdad. No eres un verificador que reparte aprobados: ayudas a entender, y la comprobación con fuentes es la garantía.

Hoy es ${hoy()}. Escribe en castellano de España, frases cortas y claras, sin adjetivos de relleno.

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
    const cuerpo = { model: modelo || DEF.modelo, max_tokens: maxTokens || 4000, system: sistema, messages: mensajes };
    if (busquedas) cuerpo.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: busquedas }];
    const cab = m === 'invitado'
      ? { 'content-type': 'application/json', 'x-andalso-codigo': ajustes.codigo }
      : { 'content-type': 'application/json', 'x-api-key': ajustes.clave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    const t0 = Date.now();
    let r;
    for (let intento = 0; ; intento++) {
      try { r = await fetch(m === 'invitado' ? proxy() + '/' : API, { method: 'POST', signal: señal, headers: cab, body: JSON.stringify(cuerpo) }); break; }
      catch (e) {
        if (e && e.name === 'AbortError') throw { codigo: 'cancelado', mensaje: 'Cancelado.' };
        const seg = Math.round((Date.now() - t0) / 1000);
        // si falla enseguida, suele ser un corte puntual: un reintento
        if (intento === 0 && seg < 15) { await new Promise(x => setTimeout(x, 1500)); continue; }
        throw { codigo: 'red', mensaje: m === 'invitado' ? 'No llego al servidor de and also (falló a los ' + seg + ' s). Prueba otra vez; si sigue, cambia de wifi a datos o al revés.' : 'No hay conexión con Anthropic (falló a los ' + seg + ' s). Revisa tu conexión.' };
      }
    }
    let datos = null; try { datos = await r.json(); } catch (e) {}
    if (!r.ok) {
      const msg = (datos && datos.error && datos.error.message) || ('Error ' + r.status);
      const tipo = datos && datos.error && datos.error.type;
      if (tipo === 'codigo') throw { codigo: 'codigo', mensaje: 'Tu invitación ya no vale. Pide un enlace nuevo a quien te lo pasó.' };
      if (tipo === 'cupo') throw { codigo: 'cupo', mensaje: 'Has llegado al límite de hoy de tu invitación. Mañana vuelve a funcionar.' };
      if (tipo === 'origen' || tipo === 'config') throw { codigo: 'config', mensaje: 'El intermediario de and also no está bien configurado. Avisa a quien te lo pasó.' };
      if (r.status === 401) throw { codigo: 'clave', mensaje: m === 'invitado' ? 'La clave de la invitación ha dejado de funcionar. Avisa a quien te lo pasó.' : 'Tu clave no vale o ha caducado. Revísala en Ajustes.' };
      if (r.status === 429) throw { codigo: 'limite', mensaje: 'Hay mucha gente usándolo ahora mismo. Espera un minuto y vuelve a probar.' };
      if (r.status === 529 || r.status >= 500) throw { codigo: 'saturado', mensaje: 'La IA está saturada ahora mismo. Vuelve a probar en un rato.' };
      if (/web.?search/i.test(msg)) throw { codigo: 'busqueda', mensaje: 'La cuenta no tiene activada la búsqueda web. Hay que activarla en la consola de Anthropic.' };
      if (/credit|balance|billing|spend/i.test(msg)) throw { codigo: 'saldo', mensaje: m === 'invitado' ? 'La invitación se ha quedado sin saldo. Avisa a quien te lo pasó.' : 'Tu cuenta de Anthropic no tiene saldo.' };
      throw { codigo: 'api', mensaje: msg };
    }
    const texto = (datos.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const errBusqueda = (datos.content || []).some(b => b.type === 'web_search_tool_result' && b.content && b.content.type === 'web_search_tool_result_error');
    const uso = datos.usage || {};
    const consumo = {
      entrada: (uso.input_tokens || 0) + (uso.cache_read_input_tokens || 0) + (uso.cache_creation_input_tokens || 0),
      salida: uso.output_tokens || 0,
      busquedas: (uso.server_tool_use && uso.server_tool_use.web_search_requests) || 0
    };
    return { texto, consumo, errBusqueda };
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
  const urlOK = u => (/^https?:\/\/[^\s"'<>]+$/.test(u || '') ? u : '');
  const preguntasOK = a => (Array.isArray(a) ? a : []).map(limpia).filter(x => x && x.length <= 110);
  const contenidoDe = entrada => {
    const c = [];
    if (entrada.imagen) {
      c.push({ type: 'image', source: { type: 'base64', media_type: entrada.imagen.tipo, data: entrada.imagen.datos } });
      c.push({ type: 'text', text: 'Esto es una captura que le ha llegado a la persona. Retecléala: solo el texto del mensaje o de la noticia, sin nombres de personas privadas, teléfonos, horas de chat ni interfaz.' + (entrada.texto ? '\nComentario de quien la comparte: ' + entrada.texto : '') });
    } else {
      c.push({ type: 'text', text: 'Esto es lo que ha escrito la persona. Puede ser algo que le ha llegado (texto reenviado, titular, enlace) o una pregunta suya sobre un tema:\n«' + entrada.texto + '»' + (/https?:\/\//.test(entrada.texto) ? '\nSi es un enlace, busca esa noticia y trabaja con su titular y lo que afirma.' : '') });
    }
    return c;
  };

  // ---------- 0. vista previa rápida, sin búsqueda: solo lo que se dice, nunca datos ----------
  async function previa(entrada, señal) {
    const c = contenidoDe(entrada);
    c.push({ type: 'text', text: 'Sin buscar nada y sin juzgarlo: «gancho» = la idea central en 12 palabras como mucho, tal como la diría quien la manda o la pregunta. «titulo» = 2–4 palabras.\n<json>{"gancho":"","titulo":""}</json>' });
    const r = await llamar({ sistema: 'Responde solo con JSON entre <json> y </json>. Castellano de España.', mensajes: [{ role: 'user', content: c }], modelo: DEF.rapido, maxTokens: 200, señal });
    const j = sacarJSON(r.texto);
    return { gancho: limpia(j.gancho).slice(0, 140), titulo: limpia(j.titulo).slice(0, 40) };
  }

  // ---------- 1. leer ----------
  async function leer(entrada, señal) {
    const c = contenidoDe(entrada);
    const largo = !entrada.imagen && entrada.texto.length > 600;
    c.push({ type: 'text', text: `Haz esto, en este orden de importancia:
1. «resumen»: qué es esto, en dos frases claras, como se lo explicarías a un amigo: de qué va, quién lo dice y por qué importa.
2. «estado»: en qué punto está lo principal. «etiqueta», una de estas: ${ESTADOS.map(e => '«' + e + '»').join(', ')}. «explicacion»: una o dos frases que lo justifiquen (por ejemplo: un anuncio de hace horas que nadie ha revisado aún es «anunciado», no «confirmado»). Con su fuente y url. Si lo principal es un anuncio, un estudio o una demostración, busca la fuente original y dilo.
3. «es_pregunta»: true si es una pregunta o duda de la persona («¿por qué…?», «me han dicho que…», «explícame…»); false si es algo que le ha llegado.
4. «original»: ${largo ? 'el texto es LARGO: no lo copies entero. Escribe solo sus 3 a 6 afirmaciones centrales, cada una copiada palabra por palabra del texto, separadas por un espacio.' : 'si le ha llegado, el texto retecleado tal cual (sin datos de personas privadas; si es un enlace, el titular). Si es una pregunta, lo que se suele oír o dar por hecho sobre ese tema, en una a tres frases neutras y sin cifras inventadas.'}
5. «tramos»: parte el original en 2–6 afirmaciones. Cada «texto», un trozo copiado EXACTAMENTE del original. Prioriza lo que más importa y lo más dudoso. Para cada una busca y da veredicto, «porque» (UNA frase de 15 palabras como mucho, que se entienda sola), la fuente y su «url».
6. «also»: el hecho comprobado que más amplía lo que llegó o mejor responde a la pregunta: lo que también es verdad y no se cuenta. Mejor con un número que dé contexto. «grande»: 14 palabras como mucho. Siempre con fuente y url.
7. «en_una_frase»: lo que hay detrás, en una frase que impacte leída sola (20 palabras como mucho). Empieza por el contexto, no por un veredicto tipo «falso». No puede contradecir los veredictos ni el estado, ni cerrar nada abierto. Marca como mucho DOS palabras con **asteriscos**.
8. «para_el_chat»: lo que la persona escribiría en el grupo: una o dos frases, como un amigo, sin dar lecciones ni decir «falso», sin asteriscos.
9. «gancho»: la idea central de lo que llegó en 12 palabras como mucho, tal como la diría quien lo manda.
10. «preguntas»: 5 hilos para seguir investigando ESTE caso, como preguntas: contexto, causas, comparación, a quién afecta, qué dicen otros expertos, qué falta por saber. Concretas, con nombres y cifras del caso, 9 palabras como mucho. Nunca «¿es verdad?».
11. «titulo_corto»: 2–4 palabras. «fuente_original»: qué es («post de un foro», «captura de un titular», «texto reenviado», «tu pregunta»).
Sé breve en todo: la respuesta tiene que caber entera.

<json>{"resumen":"","estado":{"etiqueta":"","explicacion":"","fuente":"","url":""},"es_pregunta":false,"titulo_corto":"","fuente_original":"","original":"","tramos":[{"texto":"","veredicto":"","porque":"","fuente":"","url":""}],"also":{"grande":"","veredicto":"es así","fuente":"","url":""},"en_una_frase":"","para_el_chat":"","gancho":"","preguntas":["","","","",""]}</json>` });
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: c }], busquedas: DEF.busquedas, maxTokens: 8000, señal });
    return { datos: normalizarLectura(sacarJSON(r.texto)), consumo: r.consumo, errBusqueda: r.errBusqueda };
  }

  // busca un trozo dentro del original aunque cambien espacios, comillas, guiones o mayúsculas
  const nc = ch => /[«»“”„"'‘’]/.test(ch) ? '"' : /[–—−]/.test(ch) ? '-' : ch.toLowerCase();
  function localizar(orig, tx, desde) {
    let i = orig.indexOf(tx, desde);
    if (i >= 0) return [i, i + tx.length];
    let no = '', mapa = [];
    for (let k = 0; k < orig.length; k++) {
      const ch = orig[k];
      if (/\s/.test(ch)) { if (no && no[no.length - 1] !== ' ') { no += ' '; mapa.push(k); } continue; }
      no += nc(ch); mapa.push(k);
    }
    const nt = tx.replace(/\s+/g, ' ').trim().split('').map(nc).join('');
    let d = 0; while (d < mapa.length && mapa[d] < desde) d++;
    i = no.indexOf(nt, d);
    if (i < 0) return null;
    return [mapa[i], mapa[i + nt.length - 1] + 1];
  }
  function normalizarLectura(j) {
    let original = limpia(j.original);
    const lista = (j.tramos || []).map(t => ({ tx: limpia(t.texto), t })).filter(x => x.tx);
    if (!lista.length) throw { codigo: 'formato', mensaje: 'No he podido separar las afirmaciones. Vuelve a probar.' };
    // si ninguna afirmación cuadra con el original, el original pasa a ser las afirmaciones
    if (!original || !lista.some(x => localizar(original, x.tx, 0))) original = lista.map(x => x.tx).join(' ');
    const segs = [], tramos = {}, sueltos = []; let pos = 0, n = 0;
    lista.forEach(({ tx, t }) => {
      const r = localizar(original, tx, pos);
      const k = 't' + (n++);
      tramos[k] = { ver: verOK(t.veredicto), porque: limpia(t.porque), fuente: limpia(t.fuente) || 'sin fuente', url: urlOK(t.url) };
      if (!r) { sueltos.push({ k, t: tx }); return; }
      if (r[0] > pos) segs.push(original.slice(pos, r[0]));
      segs.push({ k, t: original.slice(r[0], r[1]) });
      pos = r[1];
    });
    if (pos < original.length) segs.push(original.slice(pos));
    // las que no cuadran no se pierden: van al final
    sueltos.forEach(x => { segs.push(' '); segs.push(x); });
    const e = j.estado || {};
    const a = j.also || {}, f = typeof j.en_una_frase === 'string' ? { neutro: j.en_una_frase } : (j.en_una_frase || {});
    return {
      resumen: limpia(j.resumen),
      estado: ESTADOS.indexOf(limpia(e.etiqueta)) >= 0 ? { etiqueta: limpia(e.etiqueta), explicacion: limpia(e.explicacion), fuente: limpia(e.fuente) || 'sin fuente', url: urlOK(e.url) } : null,
      titulo: limpia(j.titulo_corto) || 'Sin título',
      fuenteOriginal: limpia(j.fuente_original) || (j.es_pregunta ? 'tu pregunta' : 'lo que te llegó'),
      esPregunta: j.es_pregunta === true,
      gancho: limpia(j.gancho).slice(0, 140),
      preguntas: preguntasOK(j.preguntas).slice(0, 5),
      original: segs, tramos,
      portada: { neutro: limpia(f.neutro) },
      paraChat: limpia(j.para_el_chat).replace(/\*\*/g, '').slice(0, 280),
      also: limpia(a.grande) ? { big: limpia(a.grande), ver: verOK(a.veredicto || 'es así'), fuente: limpia(a.fuente) || 'sin fuente', url: urlOK(a.url) } : null
    };
  }

  // ---------- 2. revisión de calidad: una segunda mirada antes de compartir ----------
  async function revisar(L, señal) {
    const trs = L.original.filter(s => typeof s !== 'string').map(s => ({ k: s.k, texto: s.t, veredicto: L.tramos[s.k].ver, porque: L.tramos[s.k].porque, fuente: L.tramos[s.k].fuente, url: L.tramos[s.k].url }));
    const entrada = { tramos: trs, also: L.also, en_una_frase: L.portada.neutro, para_el_chat: L.paraChat };
    const txt = `Revisa esta pieza antes de que se comparta. No busques nada: juzga solo con lo que hay.
${JSON.stringify(entrada)}

Comprueba:
1. Cada veredicto encaja con su «porque» y tiene fuente. Si el «porque» no da una prueba concreta, o la fuente está vacía o es «sin fuente», el veredicto pasa a «sin fuente».
2. «en_una_frase» y «para_el_chat» no afirman más que los veredictos: nada «sin fuente» o «a medias» se da por cierto, nada abierto se da por cerrado.
3. Ninguna persona privada nombrada. Ninguna cifra que no esté en un tramo o en «also» con su fuente.
4. Neutralidad política.
Cambia SOLO lo que falle; si todo está bien, devuelve los mismos textos. «cambios»: una línea por cosa cambiada.

<json>{"cambios":[""],"tramos":[{"k":"","veredicto":"","porque":""}],"also":{"grande":"","veredicto":""},"en_una_frase":"","para_el_chat":""}</json>`;
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: txt }], maxTokens: 2500, señal });
    const j = sacarJSON(r.texto);
    const cambios = (Array.isArray(j.cambios) ? j.cambios : []).map(limpia).filter(Boolean);
    (j.tramos || []).forEach(t => {
      const o = L.tramos[t.k]; if (!o) return;
      if (VERS.indexOf(t.veredicto) >= 0) o.ver = t.veredicto;
      if (limpia(t.porque)) o.porque = limpia(t.porque);
    });
    if (L.also && j.also) { if (limpia(j.also.grande)) L.also.big = limpia(j.also.grande); if (VERS.indexOf(j.also.veredicto) >= 0) L.also.ver = j.also.veredicto; }
    if (typeof j.en_una_frase === 'string' && limpia(j.en_una_frase)) L.portada.neutro = limpia(j.en_una_frase);
    else if (j.en_una_frase && limpia(j.en_una_frase.neutro)) L.portada.neutro = limpia(j.en_una_frase.neutro);
    if (limpia(j.para_el_chat)) L.paraChat = limpia(j.para_el_chat).replace(/\*\*/g, '').slice(0, 280);
    return { cambios, consumo: r.consumo };
  }

  // ---------- 3. pregunta libre sobre la pieza ----------
  async function responder(pregunta, pieza, señal) {
    const ctx = 'Lo que llegó: «' + pieza.original.map(s => typeof s === 'string' ? s : s.t).join('') + '»\nYa comprobado: ' +
      Object.values(pieza.tramos).map(t => t.ver + ' — ' + t.porque).join(' | ');
    const txt = `${ctx}

PREGUNTA de la persona: «${pregunta}»

1. «relacion»: false si la pregunta no tiene nada que ver con lo que llegó; entonces no busques y da solo una «respuesta» de una frase.
2. Si tiene que ver, busca y contesta a SU pregunta. «titulo»: la respuesta en menos de 12 palabras, que impacte leída sola. «respuesta»: 1–2 frases. «items»: 1–3 puntos de 15 palabras como mucho, con veredicto, fuente y url. «veredicto»: el del punto más débil. Sin fuente, dilo con «sin fuente».
3. «siguientes»: 2 preguntas nuevas que surgen de esta respuesta, concretas para este caso, 9 palabras como mucho.

<json>{"relacion":true,"titulo":"","veredicto":"","fuente":"","respuesta":"","items":[{"texto":"","veredicto":"","fuente":"","url":""}],"siguientes":["",""]}</json>`;
    const r = await llamar({ sistema: REGLAS(), mensajes: [{ role: 'user', content: txt }], busquedas: DEF.busquedas, maxTokens: 3000, señal });
    return Object.assign(leerRespuesta(r.texto, pregunta), { consumo: r.consumo });
  }
  function leerRespuesta(texto, pregunta) {
    const j = sacarJSON(texto);
    if (j.relacion === false) return { ninguna: true, r: limpia(j.respuesta) || 'No encuentro relación entre tu pregunta y esto.' };
    const items = (j.items || []).map(e => ({ t: limpia(e.texto), ver: verOK(e.veredicto), f: limpia(e.fuente) || 'sin fuente', url: urlOK(e.url) })).filter(e => e.t).slice(0, 3);
    if (!items.length) {
      if (limpia(j.respuesta)) items.push({ t: limpia(j.respuesta), ver: 'sin fuente', f: 'sin fuente', url: '' });
      else throw { codigo: 'formato', mensaje: 'La respuesta ha llegado vacía. Vuelve a probar.' };
    }
    const rango = v => ({ 'es así': 0, 'dicho': 1, 'a medias': 2, 'sin fuente': 3, 'no es así': 4 }[v] || 0);
    const peor = items.map(e => e.ver).sort((a, b) => rango(b) - rango(a))[0];
    const q0 = pregunta.trim().replace(/^¿?\s*/, '').replace(/\s*\??$/, '');
    const q = '¿' + q0.charAt(0).toUpperCase() + q0.slice(1) + '?';
    return { siguientes: preguntasOK(j.siguientes).slice(0, 2), nodo: { q, titulo: limpia(j.titulo) || items[0].t, ver: verOK(j.veredicto || peor), fuente: limpia(j.fuente) || items[0].f, r: limpia(j.respuesta), items } };
  }
  // quien recibe un enlace puede preguntar sobre esa pieza sin invitación (con límite diario)
  async function preguntarSobrePieza(id, pregunta) {
    let r;
    try { r = await fetch(proxy() + '/r/' + encodeURIComponent(id), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pregunta }) }); }
    catch (e) { throw { codigo: 'red', mensaje: 'No llego al servidor. Prueba en un rato.' }; }
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw { codigo: 'api', mensaje: (d.error && d.error.type === 'cupo') ? 'Por hoy se han agotado las preguntas abiertas de esta pieza. Para seguir, pide una invitación.' : 'No ha funcionado. Prueba en un rato.' };
    return leerRespuesta((d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), pregunta);
  }

  async function probarClave() {
    await llamar({ sistema: 'Responde solo «ok».', mensajes: [{ role: 'user', content: 'ok' }], modelo: DEF.rapido, maxTokens: 5 });
    return true;
  }

  // ---------- intermediario: piezas, memoria, eventos, invitaciones ----------
  const pedir = async (ruta, opt = {}) => {
    if (!proxy()) throw { tipo: 'sin_proxy', mensaje: 'Esto necesita el intermediario.' };
    let r;
    try { r = await fetch(proxy() + ruta, { method: opt.metodo || 'GET', headers: Object.assign({ 'content-type': 'application/json' }, opt.anonimo ? {} : { 'x-andalso-codigo': ajustes.codigo || '' }), body: opt.cuerpo ? JSON.stringify(opt.cuerpo) : undefined }); }
    catch (e) { throw { tipo: 'red', mensaje: 'No llego al servidor. Prueba en un rato.' }; }
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) { const t = d.error && d.error.type; throw { tipo: t || 'error', estado: r.status, mensaje: t === 'sin_almacen' ? 'Falta activar el almacén en Cloudflare.' : t === 'codigo' ? 'Hace falta una invitación válida.' : (d.error && d.error.message) || 'No ha funcionado.' }; }
    return d;
  };
  const guardarPieza = async obj => (await pedir('/p', { metodo: 'POST', cuerpo: obj })).id;
  const leerPieza = async id => pedir('/p/' + encodeURIComponent(id), { anonimo: true });
  async function subirPortada(id, blob) {
    try { await fetch(proxy() + '/i/' + encodeURIComponent(id), { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-andalso-codigo': ajustes.codigo || '' }, body: blob }); } catch (e) {}
  }
  const enlaceDe = id => proxy() + '/v/' + id;
  async function huella(texto) {
    const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length < 12 || !(window.crypto && crypto.subtle)) return '';
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  }
  const memoria = {
    async leer(h) { if (!h || modo() !== 'invitado') return null; try { return await pedir('/c/' + h); } catch (e) { return null; } },
    async guardar(h, lectura) { if (!h || modo() !== 'invitado') return; try { await pedir('/c/' + h, { metodo: 'PUT', cuerpo: { lectura } }); } catch (e) {} }
  };
  function evento(ev) {
    if (!proxy()) return;
    try { fetch(proxy() + '/e', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ev }), keepalive: true }).catch(() => {}); } catch (e) {}
  }
  const yo = () => pedir('/yo');
  const invitaciones = {
    lista: () => pedir('/inv'),
    crear: nombre => pedir('/inv', { metodo: 'POST', cuerpo: { nombre } }),
    borrar: codigo => pedir('/inv/borrar', { metodo: 'POST', cuerpo: { codigo } })
  };
  const estadisticas = () => pedir('/stats');
  const ejemplo = {
    async leer() { if (!proxy()) return ''; try { const r = await fetch(proxy() + '/ejemplo'); const d = await r.json(); return d.id || ''; } catch (e) { return ''; } },
    fijar: id => pedir('/ejemplo', { metodo: 'POST', cuerpo: { id } })
  };

  window.MOTOR = { ejemplo, preguntarSobrePieza, subirPortada, enlaceDe, ESTADOS, previa, leer, revisar, responder, probarClave, ajustes, modo, proxy, VERS, guardarPieza, leerPieza, huella, memoria, evento, yo, invitaciones, estadisticas };
})();
