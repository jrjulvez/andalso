// and also · app
(function () {
  const M = window.MOTOR;
  const INK = '#111111', PAPER = '#F4F4F1';
  const VERS = M.VERS;
  const MK = { 'es así': 'es', 'a medias': 'medias', 'no es así': 'no', 'sin fuente': 'sin', 'dicho': 'dicho' };
  const EST = { 'es así': 'solid', 'a medias': 'dotted', 'no es así': 'solid', 'sin fuente': 'dotted', 'dicho': 'dashed' };
  const DTIT = { also: 'also', relacion: 'Cadena', antes: 'Tiempo', normal: '¿Es lo normal?', dichos: 'Dichos', ami: '¿Y a mí?', falta: 'Qué falta saber' };
  const logoBtn = sz => `<button class="btn" data-go="inicio" aria-label="and also: volver al principio" style="border:0;padding:0;min-height:0;background:none">${logo(sz)}</button>`;
  const titDiapo = (P, k) => k === 'unica' ? 'Ficha única' : k === 'portada' ? 'Portada · en una frase' : k === 'enlace' ? 'Enlace · todo lo comprobado' : k === 'frases' ? 'Frase a frase · lo que llegó, revisado' : /^f\d+$/.test(k) ? 'Frase ' + (+k.slice(1) + 1) + ' · ' + (P.tramos[P.original.filter(x => typeof x !== 'string')[+k.slice(1)].k] || {}).ver : (DTIT[k] || 'Tu pregunta') + ' · ' + P.N[k].titulo;
  const ORDEN = ['also', 'relacion', 'antes', 'normal', 'dichos', 'ami', 'falta'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hl = t => '<span class="hl"><span class="hlb" aria-hidden="true"></span><span class="hlt">' + t + '</span></span>';
  // cada palabra en su propia caja: así la raya no se rompe al saltar de línea (ni en pantalla ni al exportar)
  const mark = (t, ver) => {
    if (MK[ver] === 'sin') return '<span class="sin">[<span class="t">' + t + '</span>]</span>';
    const c = MK[ver] || 'es';
    const p = String(t).split(/(\s+)/).filter(x => x !== '');
    let out = '';
    for (let i = 0; i < p.length; i++) {
      if (/^\s+$/.test(p[i])) continue;
      const sp = (i + 1 < p.length && /^\s+$/.test(p[i + 1]) && i + 2 < p.length) ? ' ' : '';
      out += '<span class="' + c + '">' + p[i] + sp + '</span>';
    }
    return out;
  };
  const logo = fs => '<span class="logo" role="img" aria-label="and also" style="font-size:' + fs + 'px">and ' + hl('also') + '</span>';
  const resaltar = s => { let n = 0; return esc(s).replace(/\*\*([^*]+)\*\*/g, (m, x) => (++n <= 2 ? hl(x) : x)); };
  const plano = s => String(s || '').replace(/\*\*/g, '');
  const fuente = (f, url) => (typeof url === 'string' && /^https?:\/\/[^\s"'<>]+$/.test(url)) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(f) + '</a>' : esc(f);
  const fecha = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');

  // ---------- almacenamiento local ----------
  const store = {
    lista() { try { return JSON.parse(localStorage.getItem('aa_piezas') || '[]'); } catch (e) { return []; } },
    guardar(p) { try { const l = store.lista().filter(x => x.id !== p.id); l.unshift(p); localStorage.setItem('aa_piezas', JSON.stringify(l.slice(0, 30))); } catch (e) {} },
    borrar(id) { try { localStorage.setItem('aa_piezas', JSON.stringify(store.lista().filter(x => x.id !== id))); } catch (e) {} }
  };

  // ---------- estado ----------
  let S = { paso: 'inicio', P: null, tab: 'mapa', tramo: null, hoja: null, texto: '', cargando: null, error: '', entrada: { texto: '', imagen: null }, aviso: '', exportando: false, enlace: '', vista: null };
  let ctrl = null;
  const app = document.getElementById('app');
  const esta = (a, k) => a.indexOf(k) >= 0;
  const set = p => { Object.assign(S, p); render(); };
  const guardaP = () => { if (S.P && !S.P.demo) store.guardar(S.P); };

  function nuevaPieza(base, demo) {
    return Object.assign({
      id: 'p' + Date.now().toString(36), demo: !!demo, creada: new Date().toISOString(), fecha: fecha(),
      mapa: ['also'], fuera: [], largo: 'corta', tono: 'neutro', consumo: { entrada: 0, salida: 0, busquedas: 0 }, banco: null, alias: {}, orden: ORDEN.slice()
    }, base);
  }
  function sumaConsumo(c) { if (!c || !S.P) return; S.P.consumo.entrada += c.entrada; S.P.consumo.salida += c.salida; S.P.consumo.busquedas += c.busquedas; }

  // ---------- cálculos ----------
  const incl = () => S.P.mapa.filter(k => !esta(S.P.fuera, k) && S.P.N[k]);
  function cuenta(P) {
    P = P || S.P; const c = {};
    Object.values(P.tramos).forEach(t => { c[t.ver] = (c[t.ver] || 0) + 1; });
    P.mapa.filter(k => !esta(P.fuera, k) && P.N[k]).forEach(k => { const v = P.N[k].ver; c[v] = (c[v] || 0) + 1; });
    return c;
  }
  function garantia(html, P) {
    P = P || S.P; const c = cuenta(P); const tot = Object.values(c).reduce((a, b) => a + b, 0);
    return 'revisado ' + (P.fecha || fecha()) + ' · ' + tot + ' puntos: ' + VERS.filter(v => c[v]).map(v => c[v] + ' ' + (html ? mark(v, v) : v)).join(' · ');
  }
  const etiqueta = P => P.esPregunta ? 'lo que se da por hecho' : 'lo que te llegó · ' + esc(P.fuenteOriginal) + ', retecleado';
  const PESO = { 'no es así': 0, 'a medias': 1, 'sin fuente': 2, 'dicho': 3, 'es así': 4 };
  function diapos(P) {
    P = P || S.P;
    const i = P.mapa.filter(k => !esta(P.fuera, k) && P.N[k]), resto = i.filter(k => k !== 'also'), conAlso = esta(i, 'also');
    // corta: 1 ficha que lo resume todo · media: hasta 3 · entera: hasta 5
    if (P.largo === 'corta') return ['unica'];
    const d = ['portada'].concat(conAlso ? ['also'] : [], ['frases']);
    if (P.largo === 'media') return d.concat(resto).slice(0, 3);
    // entera: tus preguntas primero; si faltan, las frases más importantes, cada una en su ficha
    const trs = P.original.filter(x => typeof x !== 'string').map((x, j) => ({ j, p: PESO[(P.tramos[x.k] || {}).ver] })).sort((a, b) => a.p - b.p).map(x => 'f' + x.j);
    return d.concat(resto, trs).slice(0, 5);
  }
  const originalHTML = (P, marcas, clic) => P.original.map(s => typeof s === 'string' ? esc(s) :
    (clic ? '<button class="tramo ' + (S.tramo === s.k ? 'sel' : '') + '" data-tramo="' + s.k + '">' + mark(esc(s.t), P.tramos[s.k].ver) + '</button>' : (marcas ? mark(esc(s.t), P.tramos[s.k].ver) : esc(s.t)))).join('');

  // ---------- ir a una pieza ----------
  function abrirPieza(P) { set({ P, paso: 'compo', tab: 'mapa', tramo: P.inicio || Object.keys(P.tramos)[0], hoja: null, error: '', enlace: '' }); window.scrollTo(0, 0); }
  function abrirDemo(k) {
    const D = JSON.parse(JSON.stringify(window.DEMO[k]));
    const banco = D.N; const P = nuevaPieza({ titulo: D.titulo, fuenteOriginal: D.fuenteOriginal, original: D.original, tramos: D.tramos, inicio: D.inicio, portada: D.portada, alsoSlide: D.alsoSlide, N: { also: banco.also }, banco, alias: D.alias || {}, orden: D.orden }, true);
    P.fecha = '19 nov';
    abrirPieza(P);
  }

  // ---------- leer con el motor ----------
  async function empezar() {
    const t = (S.entrada.texto || '').trim();
    if (!t && !S.entrada.imagen) { set({ error: 'Pega lo que te han mandado o sube una captura.' }); return; }
    const modo = M.modo();
    if (modo === 'falta_codigo') { set({ error: 'Abre and also desde el enlace de invitación que te han pasado: lleva tu acceso dentro.' }); return; }
    if (modo === 'sin_clave') { set({ paso: 'ajustes', aviso: 'Para leer tus propios mensajes, and also usa una clave de Anthropic. Ponla aquí y vuelve.' }); return; }
    ctrl = new AbortController();
    set({ paso: 'leyendo', error: '', cargando: { t0: Date.now() } });
    tic();
    try {
      const r = await M.leer({ texto: t, imagen: S.entrada.imagen }, ctrl.signal);
      const P = nuevaPieza(r.datos, false); if (r.consumo) { P.consumo.entrada += r.consumo.entrada; P.consumo.salida += r.consumo.salida; P.consumo.busquedas += r.consumo.busquedas; }
      if (r.errBusqueda) P.avisoBusqueda = true;
      store.guardar(P); S.entrada = { texto: '', imagen: null };
      abrirPieza(P);
    } catch (e) {
      if (e && e.codigo === 'cancelado') { set({ paso: 'inicio' }); return; }
      set({ paso: 'inicio', error: (e && e.mensaje) || 'Algo ha fallado. Vuelve a probar.' });
    }
  }
  let reloj = null;
  function tic() { clearInterval(reloj); reloj = setInterval(() => { if (S.paso === 'leyendo' || (S.hoja && S.hoja.cargando)) { const el = document.getElementById('seg'); if (el) el.textContent = Math.round((Date.now() - (S.cargando ? S.cargando.t0 : Date.now())) / 1000) + ' s'; } else clearInterval(reloj); }, 1000); }

  // ---------- preguntar ----------
  async function preguntarTipo(tipo, pregunta) {
    const P = S.P; if (P.alias[tipo]) tipo = P.alias[tipo];
    if (P.N[tipo] && esta(P.mapa, tipo)) { set({ hoja: { k: tipo, pregunta, nodo: P.N[tipo], ya: true } }); return; }
    if (P.demo) {
      const n = P.banco[tipo];
      if (!n) { set({ hoja: { ninguna: true, pregunta, r: 'En este ejemplo no he preparado esa pregunta. Con tu clave, and also la buscaría.' } }); return; }
      set({ hoja: { k: tipo, pregunta, nodo: n } }); return;
    }
    ctrl = new AbortController();
    S.cargando = { t0: Date.now() };
    set({ hoja: { cargando: true, pregunta, tipo } }); tic();
    try {
      const r = await M.responder(tipo, P, pregunta, ctrl.signal);
      sumaConsumo(r.consumo); guardaP();
      if (r.sinRelacion) set({ hoja: { ninguna: true, pregunta, r: r.r } });
      else set({ hoja: { k: tipo, pregunta, nodo: r.nodo } });
    } catch (e) {
      if (e && e.codigo === 'cancelado') { set({ hoja: null }); return; }
      set({ hoja: { error: (e && e.mensaje) || 'Algo ha fallado.', pregunta } });
    }
  }
  async function preguntarTexto(texto) {
    texto = (texto || '').trim(); if (!texto) return;
    const P = S.P;
    const inp = document.getElementById('q'); if (inp) inp.value = '';
    if (P.demo) {
      const tipo = M.porPalabras(texto);
      if (tipo === 'verdad') { set({ tab: 'mapa', hoja: { verdad: true, pregunta: texto } }); return; }
      if (tipo === 'ninguna' || !P.banco[P.alias[tipo] || tipo]) { set({ hoja: { ninguna: true, pregunta: texto, r: 'En este ejemplo solo están preparadas las preguntas de los botones. Con un mensaje tuyo, and also busca la respuesta a cualquier pregunta.' } }); return; }
      preguntarTipo(tipo, texto); return;
    }
    ctrl = new AbortController();
    S.cargando = { t0: Date.now() };
    set({ hoja: { cargando: true, pregunta: texto, tipo: null } }); tic();
    try {
      const r = await M.responderLibre(texto, P, ctrl.signal);
      sumaConsumo(r.consumo); guardaP();
      if (r.tipo === 'verdad') { set({ tab: 'mapa', hoja: { verdad: true, pregunta: texto } }); return; }
      if (r.tipo === 'ninguna') { set({ hoja: { ninguna: true, pregunta: texto, r: r.r + ' No me la invento: queda fuera de la pieza.' } }); return; }
      // una de las fijas que aún no está: ocupa su hueco; si no, va como pregunta tuya
      let k = r.tipo;
      if (k === 'libre' || (P.N[k] && esta(P.mapa, k))) { let n = 1; while (P.N['l' + n] || (S.hoja && S.hoja.k === 'l' + n)) n++; k = 'l' + n; }
      set({ hoja: { k, pregunta: texto, nodo: r.nodo } });
    } catch (e) {
      if (e && e.codigo === 'cancelado') { set({ hoja: null }); return; }
      set({ hoja: { error: (e && e.mensaje) || 'Algo ha fallado.', pregunta: texto } });
    }
  }

  // ---------- pantallas ----------
  function render() {
    const f = { inicio: vInicio, ajustes: vAjustes, leyendo: vLeyendo, compo: vCompo, envio: vEnvio, vista: vVista, cargavista: vCargaVista }[S.paso] || vInicio;
    app.innerHTML = f();
    bind();
    if (S.paso === 'envio' || S.paso === 'vista' || (S.paso === 'compo' && S.tab === 'pieza')) escalar();
    if (S.paso === 'compo' && S.tab === 'pieza' && S.P && (!fichasListas(S.P) || !enlaceListo(S.P)) && !preparando) programarPreparar();
  }

  function vInicio() {
    const piezas = store.lista().filter(p => !p.demo);
    const modo = M.modo();
    const legend = VERS.map(v => `<span style="white-space:nowrap">${mark(v, v)}</span>`).join('<span style="opacity:.5"> · </span>');
    return `<header class="top">${logoBtn(24)}<button class="btn" data-go="ajustes" style="border:0;padding:0;min-height:36px;font-size:14px;font-weight:500;text-decoration:underline;text-underline-offset:3px">Ajustes</button></header>
<main style="display:flex;flex-direction:column">
<section class="pad" style="padding-top:20px;display:flex;flex-direction:column;gap:22px">
<h1 style="margin:0;font-size:46px;line-height:.96;letter-spacing:-.04em;font-weight:700">Lo que te llega es una parte.<br>Cuenta el ${hl('resto')}.</h1>
${S.error ? `<div class="err" role="alert">${esc(S.error)}</div>` : ''}
<form id="fin" class="composer">
<label for="tin" style="font-size:15px;font-weight:600">Pega lo que te ha llegado o pregúntalo</label>
<textarea id="tin" rows="4" placeholder="Un mensaje, un titular, un enlace… o «¿es verdad que…?»">${esc(S.entrada.texto)}</textarea>
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
<label class="link" style="cursor:pointer">${S.entrada.imagen ? 'Captura lista ✓' : '+ Subir una captura'}<input id="fimg" type="file" accept="image/*" class="sr"></label>
${S.entrada.imagen ? '<button type="button" class="link" data-quitaimg>Quitar</button>' : ''}
</div>
<button class="btn dark" type="submit" style="min-height:54px;font-size:17px">Cuéntame el resto</button>
</form>
<div style="display:flex;flex-direction:column;gap:8px"><span class="small">o empieza así</span>
<div style="display:flex;flex-wrap:wrap;gap:8px">${['¿Es verdad que ', 'Me han dicho que ', '¿Por qué '].map(t => `<button class="chip" data-empieza="${esc(t)}">${esc(t.trim())}…</button>`).join('')}</div></div>
${modo === 'sin_clave' ? '<p class="small" style="margin:0">Para empezar necesitas una clave de Anthropic: la pones una vez en Ajustes y se queda solo en este móvil.</p>' : ''}${modo === 'falta_codigo' ? '<p class="small" style="margin:0">Ábrelo desde el enlace de invitación que te han pasado: lleva tu acceso dentro.</p>' : ''}
</section>
${piezas.length ? `<section class="pad" style="padding-top:4px;display:flex;flex-direction:column;gap:8px"><span class="lab">tus piezas</span>
<ul class="list" style="margin:0;padding:0;list-style:none">${piezas.map(p => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><button class="btn" data-abrir="${esc(p.id)}" style="border:0;padding:0;text-align:left;flex:1 1 auto;min-height:44px;display:flex;flex-direction:column;justify-content:center;gap:2px"><span style="font-size:16px">${esc(p.titulo)}</span><span class="small" style="font-weight:500;font-size:12px">${esc(p.fecha || '')}</span></button><button class="link" data-borrar="${esc(p.id)}" aria-label="Borrar ${esc(p.titulo)}" style="color:var(--grey)">Borrar</button></li>`).join('')}</ul></section>` : ''}
<section style="background:var(--ink);color:var(--paper);padding:28px 20px 30px;display:flex;flex-direction:column;gap:22px">
<span class="lab" style="color:#BDBBB5">qué te devuelve</span>
<div class="paso"><span class="num">1</span><div><h2>Cada frase, con su marca</h2><p style="font-size:15px;line-height:1.9">${legend}</p></div></div>
<div class="paso"><span class="num">2</span><div><h2>Lo que también es verdad</h2><p>El dato que el mensaje no cuenta, con su fuente. Y respuesta a lo que quieras preguntar.</p></div></div>
<div class="paso"><span class="num">3</span><div><h2>Una ficha para el grupo</h2><p>Una, tres o cinco imágenes. Si quieres, un enlace corto con todas las fuentes.</p></div></div>
</section>
<p class="small pad" style="margin:0;line-height:1.45;padding-top:16px">Tus piezas se guardan en este dispositivo. Lo que escribes se envía a la IA para buscar fuentes; nunca nombres de personas privadas.</p>
</main>`;
  }

  function vAjustes() {
    const clave = M.ajustes.clave;
    const mod = M.ajustes.modelo;
    const opciones = [['claude-sonnet-5-5', 'Sonnet 5.5 · equilibrado (recomendado)'], ['claude-opus-5-5', 'Opus 5.5 · más fino, más caro'], ['claude-haiku-5-5', 'Haiku 5.5 · rápido y barato']];
    return `<header class="top">${logoBtn(22)}<button class="btn" data-go="inicio" style="min-height:36px;font-size:13px">Volver</button></header>
<main class="pad" style="display:flex;flex-direction:column;gap:16px">
<h1 style="margin:6px 0 0;font-size:30px;line-height:1.02;letter-spacing:-.025em">${M.proxy() ? 'Ajustes' : 'Tu IA, tu clave'}</h1>
${S.aviso ? `<div class="aviso">${esc(S.aviso)}</div>` : ''}
${M.proxy() ? `<div class="card" style="display:flex;flex-direction:column;gap:8px"><span class="lab">invitación</span><span style="font-size:16px;line-height:1.4">${M.ajustes.codigo ? 'Estás usando una invitación: no necesitas clave ni pagar nada. Pega un mensaje y listo.' : 'No tienes invitación en este móvil. Abre el enlace de invitación que te han pasado.'}</span>${M.ajustes.codigo ? '<button class="btn" type="button" data-borracodigo>Quitar la invitación de este móvil</button>' : ''}</div>
<p class="small" style="margin:0">Si prefieres usar tu propia cuenta de Anthropic, pon tu clave abajo: tendrá prioridad sobre la invitación.</p>` : ''}
<p style="margin:0;font-size:16px;line-height:1.45">and also no tiene servidor ni cobra nada. Usa tu cuenta de Anthropic: pagas tú lo que gastas, directamente, y nadie más ve tu clave.</p>
<ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:6px">
<li>Entra en la consola de Anthropic (<a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>) y añade algo de saldo. Con pocos euros da para muchas piezas.</li>
<li>Activa la <strong>búsqueda web</strong> en la configuración de tu organización. Sin ella, and also no puede buscar fuentes.</li>
<li>Crea una clave de API y pégala aquí.</li>
</ol>
<form id="fcl" style="display:flex;flex-direction:column;gap:10px">
<label for="cl" class="lab">tu clave</label>
<input id="cl" type="password" autocomplete="off" spellcheck="false" placeholder="${clave ? 'Guardada: ••••' + esc(clave.slice(-4)) : 'sk-ant-…'}">
<label for="mo" class="lab">modelo</label>
<select id="mo">${opciones.map(([v, l]) => `<option value="${v}" ${v === mod ? 'selected' : ''}>${l}</option>`).join('')}</select>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" type="submit" style="flex:1 1 auto">Guardar</button><button class="btn" type="button" data-probar ${M.modo() === 'clave' || M.modo() === 'invitado' ? '' : 'disabled'}>${M.modo() === 'invitado' ? 'Probar la conexión' : 'Probar la clave'}</button></div>
${clave ? '<button class="btn" type="button" data-borraclave>Borrar la clave de este móvil</button>' : ''}
<p id="estado" class="small" aria-live="polite" style="margin:0"></p>
</form>
<div style="border-top:2px solid var(--ink);padding-top:12px;display:flex;flex-direction:column;gap:6px">
<span class="lab">cuánto cuesta</span>
<p style="margin:0;font-size:15px;line-height:1.45">Leer un mensaje hace hasta 6 búsquedas y cada pregunta, hasta 6 más. La búsqueda cuesta 10 $ por cada 1.000 (1 céntimo cada una), más el texto que lee el modelo. Una pieza completa suele quedarse en céntimos; en la pieza ves cuántas búsquedas ha gastado.</p>
</div>
</main>`;
  }

  function vLeyendo() {
    return `<header class="top">${logo(22)}</header>
<main class="pad" style="display:flex;flex-direction:column;gap:16px">
<h1 style="margin:30px 0 0;font-size:34px;line-height:1.02;letter-spacing:-.03em"><span class="think">Leyendo y buscando fuentes</span></h1>
<ol style="margin:0;padding-left:20px;font-size:16px;line-height:1.6"><li>Retecleo lo que te ha llegado, sin datos de personas privadas.</li><li>Lo parto en frases y busco cada una.</li><li>Busco lo que también es verdad y no te cuentan.</li></ol>
<p class="small" style="margin:0">Suele tardar entre 20 y 60 segundos · <span id="seg">0 s</span></p>
<button class="btn" data-cancelar>Cancelar</button>
</main>`;
  }

  function pasosHTML() {
    return `<nav aria-label="pasos" class="tabs">${[['mapa', '1', 'Lo que hay detrás'], ['pieza', '2', 'Tu ficha']].map(([k, n, l]) => `<button class="${S.tab === k ? 'on' : ''}" aria-current="${S.tab === k ? 'step' : 'false'}" data-tab="${k}"><span class="n">paso ${n}</span>${l}</button>`).join('')}</nav>`;
  }

  function vCompo() {
    const P = S.P;
    if (S.tab !== 'pieza') S.tab = 'mapa';
    let body = '';
    if (S.tab === 'mapa') {
      const nAlso = P.N.also, alsoDentro = nAlso && esta(P.mapa, 'also') && !esta(P.fuera, 'also');
      const tuyas = P.mapa.filter(k => k !== 'also' && P.N[k]);
      const sugeridas = P.orden.filter(k => M.PREGUNTA[k] && k !== 'also' && !(P.N[k] && esta(P.mapa, k)));
      const tarjeta = k => { const n = P.N[k], dentro = !esta(P.fuera, k); return `<div class="card" style="display:flex;flex-direction:column;gap:4px;${dentro ? '' : 'border-color:var(--line);color:var(--soft)'}">
<span class="lab" style="font-size:10px">${esc(n.q)}</span>
<button class="btn" data-ver="${k}" style="border:0;padding:0;min-height:0;text-align:left;font-size:17px;line-height:1.2;font-weight:700;color:inherit">${esc(n.titulo)}</button>
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:12px;color:var(--grey)">${mark(esc(n.ver), n.ver)} · ${esc(n.fuente)}</span><button class="link" data-toggle="${k}" style="color:inherit;font-size:13px">${dentro ? 'quitar de la ficha' : 'volver a meter'}</button></div></div>`; };
      body = `<div style="display:flex;flex-direction:column">
${P.avisoBusqueda ? '<div class="pad" style="padding-bottom:0"><div class="err">Alguna búsqueda falló mientras leía. Revisa las fuentes antes de mandar nada.</div></div>' : ''}
<section class="pad" style="display:flex;flex-direction:column;gap:10px">
<span class="lab">${P.esPregunta ? 'lo que se da por hecho' : 'lo que te llegó · ' + esc(P.fuenteOriginal)}</span>
<p style="margin:0;font-size:22px;line-height:1.55;font-weight:500">${originalHTML(P, true, true)}</p>
<span class="small" style="line-height:1.7">Toca una frase para ver por qué. ${VERS.map(v => mark(v, v)).join(' · ')}</span>
</section>
<section style="background:var(--ink);color:var(--paper);padding:20px 20px 22px;display:flex;flex-direction:column;gap:8px">
<span class="lab" style="color:#BDBBB5">en una frase</span>
<span style="font-size:26px;line-height:1.08;font-weight:700;letter-spacing:-.02em">${resaltar(P.portada[P.tono] || P.portada.neutro)}</span>
</section>
${nAlso ? `<section class="pad" style="display:flex;flex-direction:column;gap:10px">
<span class="lab">${hl('also')} · ¿qué también es verdad?</span>
<div class="card" style="display:flex;flex-direction:column;gap:6px;${alsoDentro ? '' : 'border-color:var(--line);color:var(--soft)'}"><button class="btn" data-ver="also" style="border:0;padding:0;min-height:0;text-align:left;font-size:19px;line-height:1.2;font-weight:700;color:inherit">${esc(P.alsoSlide.big || nAlso.titulo)}</button>
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:12px;color:var(--grey)">${esc(nAlso.fuente)}</span><button class="link" data-toggle="also" style="color:inherit;font-size:13px">${alsoDentro ? 'quitar de la ficha' : 'volver a meter'}</button></div></div>
</section>` : ''}
<section class="pad" style="padding-top:${nAlso ? 0 : 18}px;display:flex;flex-direction:column;gap:10px">
<span class="lab">pregunta más</span>
${tuyas.map(tarjeta).join('')}
<form id="fq" class="composer" style="gap:8px;padding:10px"><label for="q" class="sr">Tu pregunta</label><div style="display:flex;gap:8px"><input id="q" type="text" autocomplete="off" enterkeyhint="send" placeholder="Escribe tu pregunta" style="border:0;padding:0 4px;background:transparent"><button class="btn dark" type="submit" style="min-height:44px">Preguntar</button></div></form>
${sugeridas.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${sugeridas.map(k => `<button class="chip" data-q="${k}">${esc(M.PREGUNTA[k])}</button>`).join('')}</div>` : ''}
<span class="small">Lo que preguntes y aceptes puede entrar en tu ficha.</span>
</section>
</div>`;
    } else {
      const d = diapos();
      const c = P.consumo;
      const nLargo = k => diapos(Object.assign({}, P, { largo: k })).length;
      const LARGOS = [['corta', 'Corta', 'Una sola ficha con todo lo esencial.'], ['media', 'Media', 'Portada, lo que también es verdad y frase a frase.'], ['entera', 'Entera', 'Añade tus preguntas o las frases clave en su propia ficha.']];
      const TONOS = [['neutro', 'Neutro'], ['complice', 'Cómplice'], ['seco', 'Seco']];
      body = `<div style="display:flex;flex-direction:column;gap:22px;padding:18px 0 24px">
<section style="display:flex;flex-direction:column;gap:10px">
<div style="padding:0 20px;display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h2 style="margin:0;font-size:22px;letter-spacing:-.02em">Así la verá tu grupo</h2><span class="small" aria-live="polite"><b style="color:var(--ink)">${d.length} ${d.length === 1 ? 'ficha' : 'fichas'}</b>${d.length > 1 ? ' · desliza' : ''}</span></div>
<div class="slides" id="slides">${slidesHTML(P).map(x => `<div class="slidebox">${x}</div>`).join('')}</div>
</section>
<section class="pad" style="padding-top:0;padding-bottom:0;display:flex;flex-direction:column" role="radiogroup" aria-label="largo">
<span class="lab" style="margin-bottom:8px">largo</span>
${LARGOS.map(([k, l, txt]) => `<button class="opt ${P.largo === k ? 'on' : ''}" role="radio" aria-checked="${P.largo === k}" data-largo="${k}"><span class="dot" aria-hidden="true"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:700">${l}</span><span style="font-size:13px;line-height:1.3;color:var(--grey)">${txt}</span></span><span style="font-size:13px;font-weight:600;white-space:nowrap">${nLargo(k)} ${nLargo(k) === 1 ? 'ficha' : 'fichas'}</span></button>`).join('')}
${P.largo === 'entera' && !P.mapa.some(k => k !== 'also' && P.N[k] && !esta(P.fuera, k)) ? '<button class="btn" data-tab="mapa" style="border:0;padding:8px 0 0;min-height:0;text-align:left;font-size:13px;font-weight:500;text-decoration:underline;text-underline-offset:3px">Añade preguntas en «Detrás» y entrarán aquí.</button>' : ''}
</section>
<section class="pad" style="padding-top:0;padding-bottom:0;display:flex;flex-direction:column" role="radiogroup" aria-label="tono">
<span class="lab" style="margin-bottom:8px">tono de la portada</span>
${TONOS.map(([k, l]) => `<button class="opt ${P.tono === k ? 'on' : ''}" role="radio" aria-checked="${P.tono === k}" data-tono="${k}"><span class="dot" aria-hidden="true"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:600;color:var(--grey)">${l}</span><span style="font-size:16px;line-height:1.25;font-weight:600">${esc(plano(P.portada[k]))}</span></span><span></span></button>`).join('')}
</section>
<div class="pad" style="padding-top:0;padding-bottom:0;display:flex;flex-direction:column;gap:8px">
${S.error ? `<div class="err" role="alert">${esc(S.error)}</div>` : ''}
${S.alternativas || (S.fichas && fichasListas(P) && !puedeCompartirFicheros(S.fichas.files)) ? alternativasHTML(P) : ''}
${P.demo ? '' : `<button class="opt ${P.conEnlace ? 'on' : ''}" role="switch" aria-checked="${!!P.conEnlace}" data-conenlace style="margin-top:0"><span class="sw" aria-hidden="true"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:700">Añadir un enlace con las fuentes</span><span style="font-size:13px;line-height:1.3;color:var(--grey)">${P.conEnlace ? 'Irá un enlace corto debajo de las fichas.' : 'Desactivado: solo se comparten las fichas.'}</span></span><span></span></button>
${P.conEnlace ? `<div style="display:flex;gap:8px;align-items:center;min-height:44px">${S.corto && S.corto.error ? `<span class="small" style="color:var(--ink)">${esc(S.corto.error)}</span>` : enlaceListo(P) && P.corto ? `<span style="flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(P.corto.url.replace(/^https:\/\//, ''))}</span><button class="btn" data-copiar style="min-height:40px;font-size:14px">Copiar</button>` : '<span class="small think">Creando el enlace…</span>'}</div>` : ''}`}
${P.demo ? '<p class="small" style="margin:0">Ejemplo con respuestas preparadas y comprobadas a mano.</p>' : M.modo() === 'invitado' ? `<p class="small" style="margin:0">Esta pieza ha hecho ${c.busquedas} búsqueda${c.busquedas === 1 ? '' : 's'} de fuentes.</p>` : `<p class="small" style="margin:0">Esta pieza ha hecho ${c.busquedas} búsqueda${c.busquedas === 1 ? '' : 's'} (${(c.busquedas / 100).toFixed(2).replace('.', ',')} $) y ha procesado unos ${Math.round(c.entrada / 1000)}.000 tokens.</p>`}
</div>
</div>`;
    
    }
    const bar = S.tab === 'pieza' ?
      `<div class="bar" style="flex-direction:row">${(() => { const listo = fichasListas(P) && enlaceListo(P), n = diapos().length, que = (n === 1 ? 'la ficha' : 'las ' + n + ' fichas') + (P.conEnlace && !P.demo && !(S.corto && S.corto.error) ? ' y el enlace' : '');
        return listo ? `<button class="btn dark" data-compartir style="flex:1 1 auto;min-height:52px;font-size:16px">${S.quiere ? 'Listo: compartir ' : 'Compartir '}${que}</button>` : `<button class="btn dark" data-compartir style="flex:1 1 auto;min-height:52px;font-size:16px;opacity:.75"><span class="think">Preparando ${que}…</span></button>`; })()}</div>` :
      `<div class="bar" style="flex-direction:row"><button class="btn dark" data-tab="pieza" style="flex:1 1 auto;min-height:52px;font-size:16px">Siguiente: tu ficha →</button></div>`;
    return `<header class="top"><div style="display:flex;align-items:baseline;gap:12px;min-width:0">${logoBtn(22)}<span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(P.titulo)}</span></div></header>
${pasosHTML()}<main>${body}</main>${bar}${hojaHTML()}`;
  }

  function hojaHTML() {
    const h = S.hoja; if (!h) return '';
    let inner = '';
    if (h.tramo) {
      const P = S.P, seg = P.original.find(x => typeof x !== 'string' && x.k === h.tramo), t = P.tramos[h.tramo];
      return `<div class="sheetbg" data-close-bg><div class="sheet" role="dialog" aria-modal="true" aria-label="por qué"><div class="grab" aria-hidden="true"></div>
<span style="font-size:19px;font-weight:600;line-height:1.35">${mark(esc(seg ? seg.t : ''), t.ver)}</span>
<span class="lab">${esc(t.ver)}</span><span style="font-size:17px;line-height:1.4">${esc(t.porque)}</span><span class="small">${fuente(t.fuente, t.url)}</span>
<button class="btn dark" data-close>Vale</button></div></div>`;
    }
    if (h.cargando) {
      inner = `<span class="lab">and also${h.tipo ? ' · ' + esc(M.PREGUNTA[h.tipo]) : ''}</span><span style="font-size:17px" class="think">${h.tipo ? 'Buscando fuentes…' : 'Entendiendo tu pregunta…'}</span><span class="small"><span id="seg">0 s</span></span>
<button class="btn" data-cancelar>Cancelar</button>`;
    } else if (h.error) {
      inner = `<div class="err" role="alert">${esc(h.error)}</div><button class="btn dark" data-close>Vale</button>`;
    } else if (h.ninguna) {
      inner = `<span class="lab">and also</span><span style="font-size:16px;line-height:1.4">${esc(h.r)}</span><button class="btn dark" data-close>Vale</button>`;
    } else if (h.verdad) {
      inner = `<span class="lab">and also · frase a frase</span><span style="font-size:16px;line-height:1.4">Cada frase de lo que te llegó ya lleva su marca: arriba del todo. Toca cualquiera para ver por qué y con qué fuente.</span><button class="btn dark" data-close>Verlo</button>`;
    } else {
      const n = h.nodo;
      inner = `<span class="lab">and also · ${esc(n.q)}</span><span style="font-size:16px;line-height:1.4">${esc(n.r || n.titulo)}</span>
<div class="list">${n.items.map(e => `<div class="row" style="grid-template-columns:22px minmax(0,1fr);column-gap:8px"><div class="spine" aria-hidden="true"><i style="border-left-style:${EST[e.ver]}"></i></div><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:700">${esc(e.t)}</span><span style="font-size:12px;color:var(--grey)">${esc(e.ver)} · ${fuente(e.f, e.url)}</span></div></div>`).join('')}</div>
<div style="display:flex;gap:10px">${h.ya ? `<button class="btn dark" data-close style="flex:1 1 auto">Cerrar</button>` : `<button class="btn dark" data-accept style="flex:1 1 auto">Añadir a lo que hay detrás</button><button class="btn" data-close>Ahora no</button>`}</div>`;
    }
    return `<div class="sheetbg" data-close-bg><div class="sheet" role="dialog" aria-modal="true" aria-label="respuesta de and also"><div class="grab" aria-hidden="true"></div>
<span class="small">has preguntado</span><span style="font-size:18px;font-weight:600;line-height:1.25">«${esc(h.pregunta)}»</span>${inner}</div></div>`;
  }

  // ---------- diapositivas ----------
  function slideWrap(n, tot, dark, inner) {
    const bg = dark ? INK : PAPER, fg = dark ? PAPER : INK;
    return `<div class="slide" style="background:${bg};color:${fg}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="logo" style="font-size:46px;color:${fg}">and ${hl('also')}</span><span style="font-size:26px">${tot > 1 ? n + '/' + tot : ''}</span></div>${inner}</div>`;
  }
  function slidesHTML(P) {
    const d = diapos(P), tot = d.length;
    return d.map((k, i) => {
      const n = i + 1;
      if (k === 'unica') {
        const largo = P.original.map(s => typeof s === 'string' ? s : s.t).join('').length;
        return slideWrap(n, tot, false, `<span style="margin-top:64px;font-size:26px">${etiqueta(P)}</span>
<span style="margin-top:16px;font-size:${largo > 260 ? 32 : largo > 160 ? 38 : 44}px;line-height:1.5">${originalHTML(P, true, false)}</span>
<span style="margin-top:64px;font-size:26px">en una frase</span>
<span style="margin-top:12px;font-size:${plano(P.portada[P.tono]).length > 70 ? 78 : 96}px;line-height:.98;font-weight:650;letter-spacing:-.035em">${resaltar(P.portada[P.tono])}</span>
${P.alsoSlide && P.alsoSlide.big && esta(P.mapa, 'also') && !esta(P.fuera, 'also') ? `<div style="margin-top:auto;background:${INK};color:${PAPER};padding:36px 40px;display:flex;flex-direction:column;gap:14px"><span style="font-size:26px">¿qué también es verdad?</span><span style="font-size:${P.alsoSlide.big.length > 90 ? 46 : 56}px;line-height:1.08;font-weight:600;letter-spacing:-.02em">${esc(P.alsoSlide.big)}</span><span style="font-size:22px">${esc(P.alsoSlide.fuente)}</span></div>` : ''}
<div style="margin-top:${P.alsoSlide && P.alsoSlide.big && esta(P.mapa, 'also') && !esta(P.fuera, 'also') ? '40px' : 'auto'};border-top:3px solid ${INK};padding-top:18px"><span style="font-size:24px;line-height:1.5">${garantia(true, P)}</span></div>`);
      }
      if (k === 'portada') return slideWrap(n, tot, false, `<span style="margin-top:56px;font-size:26px">${etiqueta(P)}</span>
<span style="margin-top:18px;font-size:${P.original.map(s => typeof s === 'string' ? s : s.t).join('').length > 180 ? 34 : 44}px;line-height:1.55">${originalHTML(P, true, false)}</span>
<span style="margin-top:48px;font-size:26px">en una frase</span>
<span style="margin-top:12px;font-size:${plano(P.portada[P.tono]).length > 70 ? 78 : 96}px;line-height:.98;font-weight:650;letter-spacing:-.035em">${resaltar(P.portada[P.tono])}</span>
<div style="margin-top:auto;border-top:3px solid ${INK};padding-top:20px"><span style="font-size:24px;line-height:1.5">${garantia(true, P)}</span></div>`);
      if (k === 'also') return slideWrap(n, tot, true, `<span style="margin-top:130px;font-size:26px">¿qué también es verdad?</span>
<span style="margin-top:20px;align-self:flex-start;font-size:200px;line-height:1.1;font-weight:700;letter-spacing:-.04em">${hl('also')}</span>
<span style="margin-top:56px;font-size:${(P.alsoSlide.big || '').length > 90 ? 64 : 82}px;line-height:.97;font-weight:600;letter-spacing:-.035em">${esc(P.alsoSlide.big)}</span>
${P.alsoSlide.sub ? `<span style="margin-top:40px;font-size:40px;line-height:1.2;font-weight:500">${esc(P.alsoSlide.sub)}</span>` : ''}
<span style="margin-top:auto;font-size:24px">${esc(P.alsoSlide.fuente)}</span>`);
      if (k === 'frases') {
        const tr = P.original.filter(s => typeof s !== 'string').slice(0, 6);
        return slideWrap(n, tot, false, `<span style="margin-top:70px;font-size:26px">lo que llegó, frase a frase</span>
<span style="margin-top:14px;font-size:84px;line-height:.95;font-weight:600;letter-spacing:-.035em">Cada frase, con su marca y su porqué.</span>
<div style="margin-top:44px;display:flex;flex-direction:column;border-bottom:2px solid ${INK}">${tr.map(s => { const t = P.tramos[s.k]; return `<div style="padding:16px 0;border-top:2px solid ${INK};display:flex;flex-direction:column;gap:6px"><span style="font-size:${tr.length > 4 ? 30 : 36}px;line-height:1.25;font-weight:600">${mark(esc(s.t), t.ver)}</span><span style="font-size:${tr.length > 4 ? 22 : 26}px;line-height:1.3">${esc(t.ver)} · ${esc(t.porque)}</span></div>`; }).join('')}</div>`);
      }
      if (/^f\d+$/.test(k)) {
        const trs = P.original.filter(x => typeof x !== 'string'), j = +k.slice(1), s = trs[j], t = P.tramos[s.k];
        return slideWrap(n, tot, false, `<span style="margin-top:70px;font-size:26px">lo que llegó · frase ${j + 1} de ${trs.length}</span>
<span style="margin-top:24px;font-size:${s.t.length > 120 ? 56 : 72}px;line-height:1.12;font-weight:600;letter-spacing:-.025em">${mark(esc(s.t), t.ver)}</span>
<span style="margin-top:56px;font-size:30px;font-weight:600">${esc(t.ver)}</span>
<span style="margin-top:14px;font-size:${(t.porque || '').length > 160 ? 34 : 42}px;line-height:1.22;font-weight:500">${esc(t.porque)}</span>
<span style="margin-top:auto;font-size:24px">${esc(t.fuente || '')}</span>`);
      }
      if (k === 'enlace') return slideWrap(n, tot, false, `<span style="margin-top:70px;font-size:26px">¿quieres bajar más?</span>
<span style="margin-top:14px;font-size:100px;line-height:.92;font-weight:600;letter-spacing:-.035em">Todo lo comprobado, en el enlace.</span>
<div style="margin-top:50px;display:flex;flex-direction:column;border-bottom:2px solid ${INK}">${P.mapa.filter(q => q !== 'also' && P.N[q] && !esta(P.fuera, q)).slice(0, 5).map(q => `<div style="padding:18px 0;border-top:2px solid ${INK};font-size:30px;font-weight:500">${esc(P.N[q].q)} · ${esc(P.N[q].titulo)}</div>`).join('') || `<div style="padding:18px 0;border-top:2px solid ${INK};font-size:30px;font-weight:500">frase a frase, con sus fuentes</div>`}</div>
<span style="margin-top:50px;font-size:44px;font-weight:600;letter-spacing:-.02em">el enlace va en el mensaje ↓</span>
<div style="margin-top:auto;display:flex;justify-content:space-between;font-size:26px"><span>hecha con and also</span><span>haz la tuya</span></div>`);
      const q = P.N[k];
      return slideWrap(n, tot, false, `<span style="margin-top:70px;font-size:26px">${esc(q.q)}</span>
<span style="margin-top:14px;font-size:${q.titulo.length > 60 ? 72 : 90}px;line-height:.95;font-weight:600;letter-spacing:-.035em">${esc(q.titulo)}</span>
<div style="margin-top:56px;display:flex;flex-direction:column;border-bottom:2px solid ${INK}">${q.items.slice(0, 5).map(e => `<div style="display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:20px;padding:22px 0;border-top:2px solid ${INK}"><div style="display:flex;justify-content:center"><div style="width:0;border-left:6px ${EST[e.ver]} ${INK}"></div></div><div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:42px;line-height:1.08;font-weight:600">${esc(e.t)}</span><span style="font-size:26px">${esc(e.ver)} · ${esc(e.f)}</span></div></div>`).join('')}</div>`);
    });
  }
  function escalar() {
    const box = document.getElementById('slides'); if (!box) return;
    const w = S.paso === 'compo' ? Math.min(260, Math.round((app.clientWidth || 360) * 0.64)) : Math.min(300, Math.round((app.clientWidth || 360) * 0.74));
    box.querySelectorAll('.slidebox').forEach(b => { b.style.width = w + 'px'; b.style.height = Math.round(w * 1.25) + 'px'; b.firstChild.style.transform = 'scale(' + (w / 1080) + ')'; });
  }

  // ---------- enlace sin servidor ----------
  function piezaMin(P) {
    const N = {}; P.mapa.filter(k => P.N[k] && !esta(P.fuera, k)).forEach(k => { N[k] = P.N[k]; });
    return { v: 1, titulo: P.titulo, fuenteOriginal: P.fuenteOriginal, original: P.original, esPregunta: !!P.esPregunta, tramos: P.tramos, portada: P.portada, alsoSlide: P.alsoSlide, N, mapa: Object.keys(N), fuera: [], largo: P.largo, tono: P.tono, fecha: P.fecha, orden: P.orden };
  }
  function enlaceDe(P) {
    const z = window.LZString.compressToEncodedURIComponent(JSON.stringify(piezaMin(P)));
    return location.origin + location.pathname + '#p=' + z;
  }
  function leerEnlace() {
    const m = location.hash.match(/^#p=(.+)$/); if (!m) return null;
    try { return validarPieza(JSON.parse(window.LZString.decompressFromEncodedURIComponent(m[1]))); } catch (e) { return null; }
  }
  async function cargarCorto() {
    const m = location.hash.match(/^#v=([A-Za-z0-9]{6,16})$/); if (!m) return false;
    set({ paso: 'cargavista' });
    try { const P = validarPieza(await M.leerPieza(m[1])); if (!P) throw 0; set({ paso: 'vista', vista: P }); }
    catch (e) { set({ paso: 'cargavista', errorVista: e && e.tipo === 'no_existe' ? 'Esta pieza no existe o ha caducado.' : 'No he podido abrir esta pieza. Prueba en un rato.' }); }
    return true;
  }
  function validarPieza(P) {
    try {
      if (!P || !Array.isArray(P.original) || !P.tramos || !P.portada || !P.N) return null;
      // descartar tramos sin datos y valores raros
      P.original = P.original.filter(s => typeof s === 'string' || (s && typeof s.t === 'string' && P.tramos[s.k]));
      Object.values(P.tramos).forEach(t => { if (VERS.indexOf(t.ver) < 0) t.ver = 'sin fuente'; });
      P.mapa = (P.mapa || []).filter(k => (ORDEN.indexOf(k) >= 0 || /^l\d{1,2}$/.test(k)) && P.N[k] && Array.isArray(P.N[k].items));
      P.fuera = []; P.largo = ['corta', 'media', 'entera'].indexOf(P.largo) >= 0 ? P.largo : 'corta';
      P.tono = ['neutro', 'complice', 'seco'].indexOf(P.tono) >= 0 ? P.tono : 'neutro';
      P.alsoSlide = P.alsoSlide || { big: '', sub: '', fuente: '' };
      return P;
    } catch (e) {}
    return null;
  }

  function vEnvio() {
    const P = S.P;
    const puedeCompartir = !!(navigator.canShare && navigator.share);
    return `<header class="top">${logoBtn(22)}<button class="btn" data-volver style="min-height:36px;font-size:13px">Volver a editar</button></header>
<main style="display:flex;flex-direction:column;gap:12px;padding-top:6px">
<div class="pad" style="padding-bottom:0;display:flex;flex-direction:column;gap:8px"><span class="lab">así lo verá tu grupo</span><h2 style="margin:0;font-size:26px;line-height:1.05;letter-spacing:-.02em">${diapos().length} imágenes y un enlace. Desliza para verlas.</h2></div>
<div class="slides" id="slides">${slidesHTML(P).map(s => `<div class="slidebox">${s}</div>`).join('')}</div>
<div class="pad" style="padding-top:0;display:flex;flex-direction:column;gap:10px">
${S.error ? `<div class="err" role="alert">${esc(S.error)}</div>` : ''}
<button class="btn dark" data-compartir ${S.exportando ? 'disabled' : ''} style="min-height:52px;font-size:16px">${S.exportando ? '<span class="think">Preparando las imágenes…</span>' : (puedeCompartir ? 'Compartir imágenes y enlace' : 'Descargar las imágenes')}</button>
<button class="btn" data-copiar style="min-height:48px">Copiar el enlace</button>
${S.enlace ? `<p class="small" style="margin:0;word-break:break-all">${esc(S.enlace.slice(0, 90))}…</p>` : ''}
<p class="small" style="margin:0;line-height:1.45">El enlace lleva la pieza dentro: quien lo abra ve todo lo comprobado, con sus fuentes, sin cuentas ni servidores.</p>
</div></main>`;
  }

  // enlace corto: la pieza se guarda en el intermediario y el enlace lleva solo su código
  const firma = o => { const t = JSON.stringify(o); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return t.length + ':' + h; };
  async function enlaceCorto() {
    const P = S.P, min = piezaMin(P), f = firma(min);
    if (P.corto && P.corto.firma === f) return P.corto.url;
    const id = await M.guardarPieza(min);
    P.corto = { firma: f, url: location.origin + location.pathname + '#v=' + id }; guardaP();
    return P.corto.url;
  }
  async function prepararCorto() {
    S.corto = { cargando: true }; render();
    try { const url = await enlaceCorto(); S.corto = { url }; } catch (e) { S.corto = { error: (e && e.mensaje) || 'No he podido crear el enlace.' }; }
    if (S.paso === 'compo') render();
  }

  // ---------- fichas preparadas de antemano ----------
  // El móvil solo deja abrir «compartir» justo después del toque, así que las imágenes
  // y el enlace se preparan antes y el botón comparte al instante.
  const firmaFichas = P => firma({ d: diapos(P), m: piezaMin(P) });
  const enlaceListo = P => !P.conEnlace || P.demo || (S.corto && S.corto.error) || (P.corto && P.corto.firma === firma(piezaMin(P)));
  const fichasListas = P => !!(S.fichas && S.fichas.firma === firmaFichas(P));
  async function generarFichas(P) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const cont = document.getElementById('export'); cont.innerHTML = slidesHTML(P).join('');
    const files = [], nodos = Array.from(cont.children);
    for (let i = 0; i < nodos.length; i++) {
      const canvas = await window.html2canvas(nodos[i], { scale: 1, width: 1080, height: 1350, backgroundColor: null, logging: false });
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      files.push(new File([blob], 'andalso-' + (i + 1) + '.png', { type: 'image/png' }));
    }
    cont.innerHTML = '';
    return files;
  }
  let prepTimer = null, preparando = false, otraVez = false;
  function programarPreparar() { clearTimeout(prepTimer); prepTimer = setTimeout(preparar, 250); }
  async function preparar() {
    if (preparando) { otraVez = true; return; }
    const P = S.P; if (!P || S.paso !== 'compo' || S.tab !== 'pieza') return;
    preparando = true; otraVez = false;
    try {
      const f = firmaFichas(P);
      if (!fichasListas(P)) {
        const files = await generarFichas(P);
        if (S.fichas && S.fichas.urls) S.fichas.urls.forEach(u => URL.revokeObjectURL(u));
        S.fichas = { firma: f, files, urls: files.map(x => URL.createObjectURL(x)) };
      }
      if (P.conEnlace && !P.demo && !enlaceListo(P)) {
        try { const url = await enlaceCorto(); S.corto = { url }; } catch (e) { S.corto = { error: (e && e.mensaje) || 'No he podido crear el enlace.' }; }
      }
    } catch (e) { S.error = 'No he podido preparar las imágenes en este navegador.'; }
    preparando = false;
    if (otraVez || (S.P && S.fichas && S.fichas.firma !== firmaFichas(S.P))) { programarPreparar(); }
    if (S.paso === 'compo' && S.tab === 'pieza') { const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  const puedeCompartirFicheros = files => !!(navigator.canShare && navigator.share && files && navigator.canShare({ files }));

  function exportar() {
    // sin esperas antes de navigator.share: tiene que ir pegado al toque
    const P = S.P;
    if (!fichasListas(P) || !enlaceListo(P)) { S.quiere = true; render(); programarPreparar(); return; }
    S.quiere = false;
    const files = S.fichas.files, url = P.conEnlace && !P.demo && P.corto && P.corto.firma === firma(piezaMin(P)) ? P.corto.url : '';
    let datos = url ? { files, text: url } : { files };
    if (url && !(navigator.canShare && navigator.canShare(datos))) datos = { files };
    if (puedeCompartirFicheros(files)) {
      navigator.share(datos).catch(e => { if (e && e.name !== 'AbortError') { S.alternativas = true; S.error = 'El móvil no ha dejado compartir. Usa una de estas opciones.'; render(); } });
    } else { S.alternativas = true; S.error = ''; render(); }
  }
  function descargar() {
    if (!S.fichas) return;
    S.fichas.files.forEach((f, i) => { const a = document.createElement('a'); a.href = S.fichas.urls[i]; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
  }
  async function copiarImagen(i, b) {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': S.fichas.files[i] })]);
      b.textContent = 'Copiada: pégala en el chat';
    } catch (e) { b.textContent = 'No se puede copiar aquí: mantenla pulsada'; }
  }
  function alternativasHTML(P) {
    if (!S.fichas) return '';
    const url = P.conEnlace && !P.demo && P.corto ? P.corto.url : '';
    const n = S.fichas.files.length;
    return `<div class="card" style="display:flex;flex-direction:column;gap:12px">
<span style="font-size:16px;font-weight:700">Otras formas de mandarla</span>
<span style="font-size:14px;line-height:1.4">Mantén pulsada ${n === 1 ? 'la imagen' : 'una imagen'} para copiarla o guardarla en fotos. Si estás dentro de WhatsApp, Instagram o Gmail, abre esta página en Safari o Chrome para compartir con un toque.</span>
<div style="display:flex;gap:8px;overflow-x:auto">${S.fichas.urls.map((u, i) => `<img src="${u}" alt="ficha ${i + 1}" style="width:${n === 1 ? 150 : 110}px;height:auto;border:2px solid var(--ink);flex:none">`).join('')}</div>
${window.ClipboardItem && navigator.clipboard && navigator.clipboard.write ? `<button class="btn" data-copiaimg="0">${n === 1 ? 'Copiar la imagen' : 'Copiar la primera imagen'}</button>` : ''}
${url ? `<a class="btn" href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Mandar el enlace por WhatsApp</a>` : ''}
<button class="btn" data-descargar>${n === 1 ? 'Guardar la imagen' : 'Guardar las ' + n + ' imágenes'}</button>
</div>`;
  }

  // ---------- vista de quien recibe el enlace ----------
  function vCargaVista() {
    const home = esc(location.origin + location.pathname);
    return `<header class="top"><a href="${esc(location.origin + location.pathname)}" aria-label="and also: ir al principio" style="text-decoration:none">${logo(24)}</a></header><main class="pad" style="display:flex;flex-direction:column;gap:16px;padding-top:40px">${S.errorVista ? `<div class="err" role="alert">${esc(S.errorVista)}</div><a class="btn dark" href="${home}" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Ir a and also</a>` : '<span class="think" style="font-size:18px">Abriendo la pieza…</span>'}</main>`;
  }
  function vVista() {
    const P = S.vista;
    const nodos = P.mapa.filter(k => P.N[k]);
    return `<header class="top"><a href="${esc(location.origin + location.pathname)}" aria-label="and also: ir al principio" style="text-decoration:none">${logo(24)}</a><a class="btn" href="${esc(location.origin + location.pathname)}" style="display:inline-flex;align-items:center;text-decoration:none;min-height:36px;font-size:13px">Haz la tuya</a></header>
<main style="display:flex;flex-direction:column;gap:12px">
<div class="pad" style="padding-bottom:0;display:flex;flex-direction:column;gap:8px"><span class="lab">te lo han contado entero</span><h1 style="margin:0;font-size:30px;line-height:1.04;letter-spacing:-.025em">${resaltar(P.portada[P.tono] || P.portada.neutro)}</h1></div>
<div class="slides" id="slides">${slidesHTML(P).map(s => `<div class="slidebox">${s}</div>`).join('')}</div>
<div class="pad" style="padding-top:0;display:flex;flex-direction:column;gap:14px">
<span class="lab">lo que llegó, frase a frase</span>
<p style="margin:0;font-size:18px;line-height:1.6">${originalHTML(P, true, false)}</p>
<ul class="list" style="margin:0;padding:0;list-style:none">${P.original.filter(s => typeof s !== 'string').map(s => { const t = P.tramos[s.k]; return `<li style="display:flex;flex-direction:column;gap:3px"><span style="font-size:14px;font-weight:600">${mark(esc(s.t), t.ver)} · ${esc(t.ver)}</span><span style="font-size:15px;line-height:1.35">${esc(t.porque)}</span><span class="small" style="font-size:12px">${fuente(t.fuente, t.url)}</span></li>`; }).join('')}</ul>
${nodos.length ? `<span class="lab" style="margin-top:6px">lo que hay detrás</span>` : ''}
${nodos.map(k => { const n = P.N[k]; return `<div class="card" style="display:flex;flex-direction:column;gap:6px"><span class="lab" style="font-size:10px">${k === 'also' ? hl('also') + ' · ' : ''}${esc(n.q)}</span><span style="font-size:17px;font-weight:700;line-height:1.2">${esc(n.titulo)}</span>${n.r ? `<span style="font-size:15px;line-height:1.4">${esc(n.r)}</span>` : ''}<div class="list">${n.items.map(e => `<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${esc(e.t)}</span><span style="font-size:12px;color:var(--grey)">${esc(e.ver)} · ${fuente(e.f, e.url)}</span></div>`).join('')}</div></div>`; }).join('')}
<p class="small" style="margin:0">${garantia(false, P)}</p>
<p class="small" style="margin:0;line-height:1.45">Hecha con and also. Cada punto lleva su veredicto: ${VERS.join(', ')}. Lo que es opinión lleva nombre.</p>
<a class="btn dark" href="${esc(location.origin + location.pathname)}" style="display:flex;align-items:center;justify-content:center;text-decoration:none;min-height:52px">Cuenta tú el resto de algo</a>
</div></main>`;
  }

  // ---------- eventos ----------
  function bind() {
    const q = (sel, fn) => app.querySelectorAll(sel).forEach(fn);
    q('[data-go]', b => b.onclick = () => { if (b.dataset.go === 'inicio' && location.hash) history.replaceState(null, '', location.pathname); if (b.dataset.go === 'inicio') { S.hoja = null; S.corto = null; } set({ paso: b.dataset.go, error: '', aviso: b.dataset.go === 'ajustes' ? S.aviso : '' }); window.scrollTo(0, 0); });
    q('[data-demo]', b => b.onclick = () => abrirDemo(b.dataset.demo));
    q('[data-abrir]', b => b.onclick = () => { const p = store.lista().find(x => x.id === b.dataset.abrir); if (p) abrirPieza(p); });
    q('[data-borrar]', b => b.onclick = () => { store.borrar(b.dataset.borrar); render(); });
    q('[data-tab]', b => b.onclick = () => { set({ tab: b.dataset.tab, alternativas: false, quiere: false, error: '' }); window.scrollTo(0, 0); });
    q('[data-tramo]', b => b.onclick = () => set({ tramo: b.dataset.tramo, hoja: { tramo: b.dataset.tramo } }));
    q('[data-empieza]', b => b.onclick = () => { const t = document.getElementById('tin'); t.value = b.dataset.empieza; S.entrada.texto = t.value; t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    q('[data-q]', b => b.onclick = () => preguntarTipo(b.dataset.q, '¿' + M.PREGUNTA[b.dataset.q].charAt(1).toUpperCase() + M.PREGUNTA[b.dataset.q].slice(2)));
    q('[data-ver]', b => b.onclick = () => { const k = b.dataset.ver; set({ hoja: { k, pregunta: S.P.N[k].q, nodo: S.P.N[k], ya: true } }); });
    q('[data-toggle]', b => b.onclick = () => { const k = b.dataset.toggle, P = S.P; P.fuera = esta(P.fuera, k) ? P.fuera.filter(z => z !== k) : P.fuera.concat([k]); guardaP(); render(); });
    q('[data-largo]', b => b.onclick = () => { const y = window.scrollY; S.P.largo = b.dataset.largo; S.enlace = ''; guardaP(); S.corto = null; render(); window.scrollTo(0, y); });
    q('[data-tono]', b => b.onclick = () => { const y = window.scrollY; S.P.tono = b.dataset.tono; S.enlace = ''; guardaP(); S.corto = null; render(); window.scrollTo(0, y); });
    q('[data-accept]', b => b.onclick = () => { const h = S.hoja, P = S.P; P.N[h.k] = h.nodo; if (!esta(P.mapa, h.k)) P.mapa.push(h.k); if (!esta(P.orden, h.k)) P.orden.push(h.k); P.fuera = P.fuera.filter(z => z !== h.k); guardaP(); set({ hoja: null, tab: 'mapa' }); });
    q('[data-close]', b => b.onclick = () => set({ hoja: null }));
    q('[data-cancelar]', b => b.onclick = () => { if (ctrl) ctrl.abort(); });
    q('[data-volver]', b => b.onclick = () => set({ paso: 'compo', tab: 'pieza', error: '' }));
    q('[data-compartir]', b => b.onclick = () => exportar());
    q('[data-descargar]', b => b.onclick = () => descargar());
    q('[data-copiaimg]', b => b.onclick = () => copiarImagen(+b.dataset.copiaimg, b));
    q('[data-conenlace]', b => b.onclick = () => { const P = S.P; P.conEnlace = !P.conEnlace; guardaP(); S.corto = null; render(); });
    q('[data-copiar]', b => b.onclick = async () => {
      if (S.P.demo) { S.enlace = ''; b.textContent = 'Los ejemplos no tienen enlace'; return; }
      let u = ''; try { u = await enlaceCorto(); } catch (e) { b.textContent = 'Sin enlace'; return; } S.enlace = u;
      try { await navigator.clipboard.writeText(u); b.textContent = 'Copiado'; } catch (e) { render(); }
    });
    q('[data-quitaimg]', b => b.onclick = () => { S.entrada.imagen = null; render(); });
    const bg = app.querySelector('[data-close-bg]'); if (bg && !(S.hoja && S.hoja.cargando)) bg.onclick = e => { if (e.target === bg) set({ hoja: null }); };
    const tin = document.getElementById('tin'); if (tin) tin.oninput = () => { S.entrada.texto = tin.value; };
    const fimg = document.getElementById('fimg'); if (fimg) fimg.onchange = () => leerImagen(fimg.files && fimg.files[0]);
    const fin = document.getElementById('fin'); if (fin) fin.onsubmit = e => { e.preventDefault(); empezar(); };
    const fq = document.getElementById('fq'); if (fq) fq.onsubmit = e => { e.preventDefault(); preguntarTexto(document.getElementById('q').value); };
    const fcl = document.getElementById('fcl'); if (fcl) fcl.onsubmit = e => {
      e.preventDefault(); const v = document.getElementById('cl').value.trim(); const mo = document.getElementById('mo').value;
      if (v) M.ajustes.clave = v; M.ajustes.modelo = mo; S.aviso = ''; render();
      const est = document.getElementById('estado'); if (est) est.textContent = 'Guardado en este móvil.';
    };
    q('[data-probar]', b => b.onclick = async () => {
      const est = document.getElementById('estado'); est.textContent = 'Probando…';
      try { await M.probarClave(); est.textContent = M.modo() === 'invitado' ? 'Funciona. Ya puedes pegar un mensaje.' : 'Funciona. Recuerda tener activada la búsqueda web.'; } catch (e) { est.textContent = (e && e.mensaje) || 'No funciona.'; }
    });
    q('[data-borraclave]', b => b.onclick = () => { M.ajustes.clave = ''; render(); });
    q('[data-borracodigo]', b => b.onclick = () => { M.ajustes.codigo = ''; render(); });
    const sh = app.querySelector('.sheet'); if (sh) { const b = sh.querySelector('button'); if (b) b.focus(); }
  }

  function leerImagen(f) {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { set({ error: 'Sube la captura como imagen PNG, JPG o WebP.' }); return; }
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      // reducir a 1600 px de lado para no gastar de más
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', 0.85);
      S.entrada.imagen = { tipo: 'image/jpeg', datos: d.split(',')[1] }; URL.revokeObjectURL(url); S.error = ''; render();
    };
    img.onerror = () => set({ error: 'No he podido abrir esa imagen.' });
    img.src = url;
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.hoja && !S.hoja.cargando) set({ hoja: null }); });
  window.addEventListener('resize', () => { if (S.paso === 'envio' || S.paso === 'vista' || (S.paso === 'compo' && S.tab === 'pieza')) escalar(); });
  window.addEventListener('hashchange', () => { const P = leerEnlace(); if (P) set({ paso: 'vista', vista: P }); else cargarCorto(); });

  // ---------- arranque ----------
  (function () {
    const P = leerEnlace();
    if (P) { S.paso = 'vista'; S.vista = P; }
    else if (/^#v=/.test(location.hash)) { cargarCorto(); return; }
    else {
      const u = new URLSearchParams(location.search);
      const cod = u.get('c');
      if (cod && /^[A-Za-z0-9_-]{6,64}$/.test(cod)) { M.ajustes.codigo = cod; history.replaceState(null, '', location.pathname); }
      const t = [u.get('t') || u.get('text') || '', u.get('u') || u.get('url') || ''].filter(Boolean).join(' ').trim();
      if (t) { S.entrada.texto = t; history.replaceState(null, '', location.pathname); }
    }
    render();
  })();
})();
