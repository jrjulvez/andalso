// and also · app
(function () {
  const M = window.MOTOR;
  const VERS = M.VERS;
  const INK = '#111111', PAPER = '#F4F4F1', GRIS = '#55534E';
  const MK = { 'es así': 'es', 'a medias': 'medias', 'no es así': 'no', 'sin fuente': 'sin', 'dicho': 'dicho' };
  const PESO = { 'no es así': 0, 'a medias': 1, 'sin fuente': 2, 'dicho': 3, 'es así': 4 };
  const VERBO = { 'es así': 'Es así', 'a medias': 'A medias', 'no es así': 'No es así', 'dicho': 'Es una opinión', 'sin fuente': 'Sin fuente' };
  const MAX_FICHAS = 6;
  const KEY_OK = k => k === 'gancho' || k === 'also' || /^f\d{1,2}$/.test(k) || /^l\d{1,2}$/.test(k);

  // ---------- utilidades ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hl = t => '<span class="hl"><span class="hlb" aria-hidden="true"></span><span class="hlt">' + t + '</span></span>';
  // cada palabra en su caja: la raya no se rompe al saltar de línea (ni en pantalla ni al exportar)
  const mark = (t, ver) => {
    if (MK[ver] === 'sin') return '<span class="sin">[<span class="t">' + t + '</span>]</span>';
    const c = MK[ver] || 'es', p = String(t).split(/(\s+)/).filter(x => x !== '');
    let out = '';
    for (let i = 0; i < p.length; i++) {
      if (/^\s+$/.test(p[i])) continue;
      const sp = (i + 1 < p.length && /^\s+$/.test(p[i + 1]) && i + 2 < p.length) ? ' ' : '';
      out += '<span class="' + c + '">' + p[i] + sp + '</span>';
    }
    return out;
  };
  const logo = fs => '<span class="logo" role="img" aria-label="and also" style="font-size:' + fs + 'px">and ' + hl('also') + '</span>';
  const logoBtn = sz => `<button class="btn" data-go="inicio" aria-label="and also: volver al principio" style="border:0;padding:0;min-height:0;background:none">${logo(sz)}</button>`;
  const resaltar = s => { let n = 0; return esc(s).replace(/\*\*([^*]+)\*\*/g, (m, x) => (++n <= 2 ? hl(x) : x)); };
  const plano = s => String(s || '').replace(/\*\*/g, '');
  const urlBien = u => typeof u === 'string' && /^https?:\/\/[^\s"'<>]+$/.test(u);
  const fuente = (f, url) => urlBien(url) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(f) + '</a>' : esc(f) + (f && f !== 'sin fuente' ? ' <span style="opacity:.7">(sin enlace)</span>' : '');
  const fecha = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
  const esta = (a, k) => (a || []).indexOf(k) >= 0;
  const sinComillas = s => String(s || '').replace(/^[«"“]+|[»"”.]+$/g, '');
  const lee = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const guarda = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };

  // ---------- almacenamiento local ----------
  const store = {
    lista() { try { return JSON.parse(localStorage.getItem('aa_piezas') || '[]').map(migrar).filter(Boolean); } catch (e) { return []; } },
    guardar(p) { try { const l = store.lista().filter(x => x.id !== p.id); l.unshift(p); localStorage.setItem('aa_piezas', JSON.stringify(l.slice(0, 30))); } catch (e) {} },
    borrar(id) { try { localStorage.setItem('aa_piezas', JSON.stringify(store.lista().filter(x => x.id !== id))); } catch (e) {} }
  };

  // ---------- estado ----------
  let S = { paso: 'inicio', P: null, hoja: null, error: '', entrada: { texto: '', imagen: null }, previa: null, cargando: null, det: {}, verOriginal: false, pp: 0, vista: null, yo: null, admin: null };
  let ctrl = null;
  const app = document.getElementById('app');
  const set = p => { Object.assign(S, p); render(); };
  const guardaP = () => { if (S.P) store.guardar(S.P); };

  // ---------- la pieza ----------
  function nuevaPieza(L) {
    const P = Object.assign({ v: 2, id: 'p' + Date.now().toString(36), creada: new Date().toISOString(), fecha: fecha(), N: {}, hechas: [], destino: 'chat', tono: 'neutro', conEnlace: false, consumo: { entrada: 0, salida: 0, busquedas: 0 }, revision: { estado: 'pendiente', cambios: [] } }, L);
    P.fichas = fichasPorDefecto(P);
    return P;
  }
  // piezas guardadas con la versión anterior
  function migrar(P) {
    if (!P || !Array.isArray(P.original) || !P.tramos || !P.portada) return null;
    if (P.v === 2) return P;
    const N = {};
    Object.keys(P.N || {}).forEach(k => { if (k !== 'also' && (!P.mapa || esta(P.mapa, k)) && P.N[k] && P.N[k].items) N[/^l\d+$/.test(k) ? k : 'l' + (Object.keys(N).length + 1)] = P.N[k]; });
    const a = P.N && P.N.also;
    const Q = { v: 2, id: P.id || 'p' + Date.now().toString(36), creada: P.creada, fecha: P.fecha, titulo: P.titulo || 'Sin título', fuenteOriginal: P.fuenteOriginal || 'lo que te llegó', esPregunta: !!P.esPregunta, gancho: P.gancho || '', preguntas: P.preguntas || [], hechas: P.hechas || [], original: P.original, tramos: P.tramos, portada: { neutro: P.portada.neutro || '', complice: P.portada.complice || P.portada.neutro || '' }, paraChat: P.paraChat || '', also: (P.alsoSlide && P.alsoSlide.big) || a ? { big: (P.alsoSlide && P.alsoSlide.big) || (a && a.titulo) || '', ver: (a && a.ver) || 'es así', fuente: (P.alsoSlide && P.alsoSlide.fuente) || (a && a.fuente) || '', url: (a && a.items && a.items[0] && a.items[0].url) || '' } : null, N, destino: P.largo === 'corta' ? 'chat' : 'redes', tono: P.tono === 'complice' ? 'complice' : 'neutro', conEnlace: !!P.conEnlace, corto: P.corto, consumo: P.consumo || { entrada: 0, salida: 0, busquedas: 0 }, revision: { estado: 'antigua', cambios: [] } };
    if (Q.also && !Q.also.big) Q.also = null;
    Q.fichas = fichasPorDefecto(Q);
    return Q;
  }
  const tramosOrden = P => P.original.filter(x => typeof x !== 'string' && P.tramos[x.k]).map((x, j) => ({ j, k: x.k, p: PESO[P.tramos[x.k].ver] })).sort((a, b) => a.p - b.p);
  const trs = P => P.original.filter(x => typeof x !== 'string' && P.tramos[x.k]);
  const ganchoDe = P => sinComillas(P.gancho || (() => { const t = tramosOrden(P)[0]; const seg = t && trs(P).find(x => x.k === t.k); return seg ? seg.t : P.titulo; })());
  function fichasPorDefecto(P) { return ['gancho'].concat(P.also ? ['also'] : [], Object.keys(P.N || {}), tramosOrden(P).slice(0, 2).map(x => 'f' + x.j)).slice(0, 5); }
  // todas las fichas posibles, en orden de lectura
  const candidatas = P => ['gancho'].concat(P.also ? ['also'] : [], Object.keys(P.N || {}).filter(k => P.N[k]), tramosOrden(P).map(x => 'f' + x.j));
  const valida = (P, k) => k === 'gancho' || (k === 'also' && !!P.also) || (/^f\d+$/.test(k) && !!trs(P)[+k.slice(1)]) || (/^l\d+$/.test(k) && !!(P.N || {})[k]);
  function diapos(P) {
    P = P || S.P;
    if (P.destino === 'chat') return ['gancho'];
    const sel = (P.fichas || []).filter(k => valida(P, k) && k !== 'gancho');
    return ['gancho'].concat(candidatas(P).filter(k => esta(sel, k))).slice(0, MAX_FICHAS);
  }
  const titular = P => P.portada[P.tono] || P.portada.neutro;

  // ---------- fichas (imágenes de 1080 × 1350) ----------
  function slideWrap(n, tot, dark, inner) {
    const bg = dark ? INK : PAPER, fg = dark ? PAPER : INK;
    return `<div class="slide" style="background:${bg};color:${fg};padding:72px 80px 64px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="logo" style="font-size:44px;color:${fg}">and ${hl('also')}</span><span style="font-size:26px;opacity:.7">${tot > 1 ? n + ' / ' + tot : ''}</span></div>${inner}</div>`;
  }
  function slideHTML(P, k, n, tot) {
    const pie = (txt, dark) => `<div style="margin-top:auto;padding-top:22px;border-top:3px solid ${dark ? PAPER : INK};display:flex;justify-content:space-between;gap:20px;font-size:24px"><span>${txt}</span><span>${esc(P.fecha || fecha())}</span></div>`;
    if (k === 'gancho') {
      const g = ganchoDe(P), t = titular(P), largo = plano(t).length, nP = Object.keys(P.tramos).length + (P.also ? 1 : 0) + Object.keys(P.N || {}).length;
      return slideWrap(n, tot, false, `<span style="margin-top:110px;font-size:30px;font-weight:500">${P.esPregunta ? 'se dice que' : 'te ha llegado que'}</span>
<span style="margin-top:18px;font-size:${g.length > 80 ? 46 : 56}px;line-height:1.15;font-weight:500;color:${GRIS}">«${esc(g)}»</span>
<span style="margin-top:auto;font-size:30px;font-weight:500">lo que hay detrás</span>
<span style="margin-top:16px;font-size:${largo > 80 ? 92 : largo > 50 ? 112 : 132}px;line-height:.95;font-weight:700;letter-spacing:-.04em">${resaltar(t)}</span>
<div style="height:70px"></div>${pie(nP + ' puntos comprobados con fuentes')}`);
    }
    if (k === 'also') {
      const big = P.also.big;
      return slideWrap(n, tot, true, `<span style="margin-top:110px;font-size:30px;font-weight:500">lo que también es verdad</span>
<span style="margin-top:28px;font-size:${big.length > 90 ? 84 : big.length > 60 ? 100 : 116}px;line-height:.98;font-weight:700;letter-spacing:-.035em">${esc(big)}</span>
<div style="height:60px"></div>${pie(esc(P.also.fuente), true)}`);
    }
    if (/^f\d+$/.test(k)) {
      const seg = trs(P)[+k.slice(1)], t = P.tramos[seg.k];
      return slideWrap(n, tot, false, `<span style="margin-top:110px;font-size:30px;font-weight:500">${P.esPregunta ? 'se dice que' : 'el mensaje dice'}</span>
<span style="margin-top:18px;font-size:${seg.t.length > 90 ? 50 : 62}px;line-height:1.2;font-weight:500">${mark(esc(seg.t), t.ver)}</span>
<span style="margin-top:auto;font-size:${VERBO[t.ver].length > 10 ? 124 : 150}px;line-height:.92;font-weight:700;letter-spacing:-.045em">${esc(VERBO[t.ver])}</span>
<span style="margin-top:30px;font-size:${(t.porque || '').length > 110 ? 44 : 52}px;line-height:1.15;font-weight:500;letter-spacing:-.015em">${esc(t.porque)}</span>
<div style="height:60px"></div>${pie(esc(t.fuente))}`);
    }
    const q = P.N[k];
    return slideWrap(n, tot, false, `<span style="margin-top:110px;font-size:40px;line-height:1.15;font-weight:600">${esc(q.q)}</span>
<span style="margin-top:auto;font-size:${q.titulo.length > 70 ? 88 : 104}px;line-height:.97;font-weight:700;letter-spacing:-.035em">${esc(q.titulo)}</span>
${q.r && q.r !== q.titulo ? `<span style="margin-top:30px;font-size:${q.r.length > 140 ? 38 : 44}px;line-height:1.2;font-weight:500">${esc(q.r)}</span>` : ''}
<div style="height:60px"></div>${pie(mark(esc(q.ver), q.ver) + ' · ' + esc(q.fuente))}`);
  }
  const slidesHTML = (P, keys) => keys.map((k, i) => slideHTML(P, k, i + 1, keys.length));
  function escalar() {
    app.querySelectorAll('.slidebox').forEach(b => {
      const w = b.classList.contains('thumb') ? 104 : b.classList.contains('fill') ? Math.min(420, b.parentElement.clientWidth) : Math.min(300, Math.round((app.clientWidth || 360) * 0.74));
      b.style.width = w + 'px'; b.style.height = Math.round(w * 1.25) + 'px'; b.firstChild.style.transform = 'scale(' + (w / 1080) + ')';
    });
  }

  // ---------- leer ----------
  async function empezar() {
    const t = (S.entrada.texto || '').trim();
    if (!t && !S.entrada.imagen) { set({ error: 'Pega lo que te ha llegado, sube una captura o escribe tu pregunta.' }); return; }
    const modo = M.modo();
    if (modo === 'falta_codigo') { set({ error: 'Abre and also desde el enlace de invitación que te han pasado: lleva tu acceso dentro.' }); return; }
    if (modo === 'sin_clave') { set({ paso: 'ajustes', error: 'Para empezar hace falta una invitación o una clave propia.' }); return; }
    ctrl = new AbortController();
    const entrada = { texto: t, imagen: S.entrada.imagen };
    set({ paso: 'leyendo', error: '', previa: null, cargando: { t0: Date.now() } });
    tic();
    // mientras busca, enseñar lo que se dice (sin datos: la vista previa no busca nada)
    M.previa(entrada, ctrl.signal).then(p => { if (S.paso === 'leyendo') set({ previa: p }); }).catch(() => {});
    try {
      const h = entrada.imagen ? '' : await M.huella(t);
      const mem = await M.memoria.leer(h);
      let P;
      if (mem && mem.lectura) {
        P = nuevaPieza(Object.assign({}, mem.lectura, { revision: { estado: 'hecho', cambios: [], memoria: true } }));
        P.veces = mem.veces || 2;
        M.evento('memoria');
      } else {
        const r = await M.leer(entrada, ctrl.signal);
        P = nuevaPieza(r.datos);
        sumar(P, r.consumo);
        if (r.errBusqueda) P.avisoBusqueda = true;
        P.huella = h;
        M.evento('pieza');
      }
      if (lee('aa_ref')) { M.evento('receptor_crea'); guarda('aa_ref', ''); }
      store.guardar(P); S.entrada = { texto: '', imagen: null };
      abrirPieza(P);
      if (P.revision.estado === 'pendiente') revisarPieza(P);
    } catch (e) {
      if (e && e.codigo === 'cancelado') { set({ paso: 'inicio' }); return; }
      set({ paso: 'inicio', error: (e && e.mensaje) || 'Algo ha fallado. Vuelve a probar.' });
    }
  }
  function sumar(P, c) { if (!c) return; P.consumo.entrada += c.entrada; P.consumo.salida += c.salida; P.consumo.busquedas += c.busquedas; }
  const lecturaDe = P => ({ titulo: P.titulo, fuenteOriginal: P.fuenteOriginal, esPregunta: P.esPregunta, gancho: P.gancho, preguntas: P.preguntas, original: P.original, tramos: P.tramos, portada: P.portada, paraChat: P.paraChat, also: P.also });
  async function revisarPieza(P) {
    P.revision = { estado: 'en_curso', cambios: [] }; if (S.P === P) render();
    try {
      const r = await M.revisar(P);
      sumar(P, r.consumo);
      P.revision = { estado: 'hecho', cambios: r.cambios };
      M.memoria.guardar(P.huella, lecturaDe(P));
    } catch (e) { P.revision = { estado: 'error', cambios: [] }; }
    store.guardar(P);
    if (S.P && S.P.id === P.id) { S.P = P; S.fichasListas = null; const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  function abrirPieza(P) { set({ P: migrar(P), paso: 'pieza', hoja: null, error: '', det: {}, verOriginal: false, alternativas: false, quiere: false, corto: null }); window.scrollTo(0, 0); }
  let reloj = null;
  function tic() {
    clearInterval(reloj);
    reloj = setInterval(() => {
      if (S.paso === 'leyendo' || (S.hoja && S.hoja.cargando)) {
        const s = Math.round((Date.now() - (S.cargando ? S.cargando.t0 : Date.now())) / 1000);
        const el = document.getElementById('seg'); if (el) el.textContent = s + ' s';
        const fase = document.getElementById('fase'); if (fase) fase.innerHTML = fasesHTML(s);
      } else clearInterval(reloj);
    }, 1000);
  }
  const FASES = [[0, 'Leyendo lo que te ha llegado'], [5, 'Buscando fuentes'], [20, 'Comprobando frase a frase'], [38, 'Preparando tus fichas']];
  const fasesHTML = s => FASES.map(([t, l], i) => { const hecho = i + 1 < FASES.length && s >= FASES[i + 1][0], activo = s >= t && !hecho; return `<li style="display:flex;gap:10px;align-items:center;font-size:16px;${s < t ? 'color:var(--line)' : ''}"><span aria-hidden="true" style="width:16px">${hecho ? '✓' : activo ? '•' : ''}</span><span class="${activo ? 'think' : ''}">${l}</span></li>`; }).join('');

  // ---------- preguntar ----------
  async function preguntar(texto) {
    texto = (texto || '').trim(); if (!texto) return;
    const P = S.P;
    const inp = document.getElementById('q'); if (inp) inp.value = '';
    ctrl = new AbortController();
    S.cargando = { t0: Date.now() };
    set({ hoja: { cargando: true, pregunta: texto } }); tic();
    try {
      const r = await M.responder(texto, P, ctrl.signal);
      sumar(P, r.consumo);
      P.hechas = (P.hechas || []).concat([texto]);
      if (r.ninguna) { guardaP(); set({ hoja: { ninguna: true, pregunta: texto, r: r.r } }); return; }
      if (r.siguientes && r.siguientes.length) P.preguntas = (P.preguntas || []).concat(r.siguientes.filter(q => !esta(P.preguntas, q)));
      M.evento('pregunta');
      guardaP();
      let n = 1; while (P.N['l' + n]) n++;
      set({ hoja: { k: 'l' + n, pregunta: texto, nodo: r.nodo } });
    } catch (e) {
      if (e && e.codigo === 'cancelado') { set({ hoja: null }); return; }
      set({ hoja: { error: (e && e.mensaje) || 'Algo ha fallado.', pregunta: texto } });
    }
  }

  // ---------- pantallas ----------
  function render() {
    const f = { inicio: vInicio, ajustes: vAjustes, guia: vGuia, leyendo: vLeyendo, pieza: vPieza, vista: vVista, cargavista: vCargaVista }[S.paso] || vInicio;
    app.innerHTML = f();
    bind();
    escalar();
    if (S.paso === 'pieza' && S.P && S.P.revision.estado !== 'en_curso' && (!fichasListas(S.P) || !enlaceListo(S.P)) && !preparando) programarPreparar();
  }

  function vInicio() {
    const todas = store.lista();
    const POR = 3, pags = Math.max(1, Math.ceil(todas.length / POR));
    S.pp = Math.min(Math.max(S.pp || 0, 0), pags - 1);
    const piezas = todas.slice(S.pp * POR, S.pp * POR + POR);
    const modo = M.modo();
    const resto = ['¿Por qué ha pasado?', '¿Desde cuándo?', '¿A quién afecta?', '¿Es lo normal?', '¿Qué también es verdad?', '¿Qué no se sabe aún?'];
    const puedePegar = !!(navigator.clipboard && navigator.clipboard.readText);
    return `<header class="top">${logoBtn(24)}<button class="link" data-go="ajustes" style="font-weight:500">Ajustes</button></header>
<main style="display:flex;flex-direction:column">
<section class="pad" style="padding-top:20px;display:flex;flex-direction:column;gap:22px">
<h1 style="margin:0;font-size:46px;line-height:.96;letter-spacing:-.04em;font-weight:700">Lo que te llega es una parte.<br>Cuenta el ${hl('resto')}.</h1>
${S.error ? `<div class="err" role="alert">${esc(S.error)}</div>` : ''}
<form id="fin" class="composer">
<label for="tin" style="font-size:15px;font-weight:600">¿Qué quieres entender?</label>
<textarea id="tin" rows="4" placeholder="Pega una noticia, un mensaje o un enlace… o pregunta por cualquier tema">${esc(S.entrada.texto)}</textarea>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
${puedePegar ? '<button type="button" class="link" data-pegar>Pegar</button>' : ''}
<label class="link" style="cursor:pointer">${S.entrada.imagen ? 'Captura lista ✓' : 'Subir una captura'}<input id="fimg" type="file" accept="image/*" class="sr"></label>
${S.entrada.imagen ? '<button type="button" class="link" data-quitaimg>Quitar</button>' : ''}
</div>
<button class="btn dark" type="submit" style="min-height:54px;font-size:17px">Cuéntame el resto</button>
</form>
<div style="display:flex;flex-direction:column;gap:8px"><span class="small">o empieza así</span>
<div style="display:flex;flex-wrap:wrap;gap:8px">${['¿Por qué ', '¿Qué hay detrás de ', '¿Cómo me afecta ', 'Explícame '].map(t => `<button class="chip" data-empieza="${esc(t)}">${esc(t.trim())}…</button>`).join('')}</div></div>
<button class="link" data-go="guia" style="align-self:flex-start">Úsalo desde WhatsApp →</button>
${modo === 'falta_codigo' ? '<p class="small" style="margin:0">Ábrelo desde el enlace de invitación que te han pasado: lleva tu acceso dentro.</p>' : ''}
</section>
${todas.length ? `<section class="pad" style="padding-top:4px;display:flex;flex-direction:column;gap:10px">
<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lab">tus piezas</span><span class="small" style="font-size:12px">${todas.length}</span></div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${piezas.map(p => `<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><button class="btn" data-abrir="${esc(p.id)}" aria-label="Abrir ${esc(p.titulo)}" style="border:0;padding:0;min-height:0;display:flex;flex-direction:column;gap:6px;text-align:left"><div class="slidebox thumb">${slideHTML(p, 'gancho', 1, 1)}</div><span style="font-size:13px;line-height:1.2;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.titulo)}</span></button><span style="display:flex;justify-content:space-between;align-items:center"><span class="small" style="font-size:11px">${esc(p.fecha || '')}</span><button class="link" data-borrar="${esc(p.id)}" aria-label="Borrar ${esc(p.titulo)}" style="font-size:11px;color:var(--grey);padding:0">Borrar</button></span></div>`).join('')}</div>
${pags > 1 ? `<div style="display:flex;justify-content:space-between;align-items:center"><button class="btn" data-pp="-1" ${S.pp === 0 ? 'disabled' : ''} aria-label="Más recientes" style="min-height:40px;min-width:48px">←</button><span class="small">${S.pp + 1} de ${pags}</span><button class="btn" data-pp="1" ${S.pp >= pags - 1 ? 'disabled' : ''} aria-label="Anteriores" style="min-height:40px;min-width:48px">→</button></div>` : ''}
</section>` : ''}
<section style="background:var(--ink);color:var(--paper);padding:30px 20px 32px;display:flex;flex-direction:column;gap:20px">
<h2 style="margin:0;font-size:32px;line-height:1;letter-spacing:-.03em">Todo lo que te llega tiene un ${hl('resto')}.</h2>
<div style="display:flex;flex-direction:column">${resto.map((q, i) => `<span style="font-size:${i % 2 ? 24 : 27}px;line-height:1.25;font-weight:${i % 2 ? 500 : 700};letter-spacing:-.02em;opacity:${1 - i * 0.09}">${q}</span>`).join('')}</div>
<div style="display:flex;flex-direction:column;gap:16px;border-top:2px solid #3A3936;padding-top:20px">
<div><h3 style="margin:0 0 3px;font-size:19px">Entiéndelo</h3><p style="margin:0;font-size:15px;line-height:1.45;color:#D9D7D1">Una noticia, un rumor o un tema: el contexto, el porqué y lo que no te cuentan.</p></div>
<div><h3 style="margin:0 0 3px;font-size:19px">Tira del hilo</h3><p style="margin:0;font-size:15px;line-height:1.45;color:#D9D7D1">Cada respuesta abre preguntas nuevas, pensadas para ese caso.</p></div>
<div><h3 style="margin:0 0 3px;font-size:19px">Cuéntalo entero</h3><p style="margin:0;font-size:15px;line-height:1.45;color:#D9D7D1">Una ficha y un texto listos para tu grupo, o un carrusel para tus redes.</p></div>
</div>
<p style="margin:0;font-size:13px;line-height:1.45;color:#BDBBB5">Todo con fuentes. Lo que es opinión, se dice. Lo que no se sabe, también.</p>
</section>
<p class="small pad" style="margin:0;line-height:1.45;padding-top:16px">Tus piezas se guardan en este dispositivo. Lo que escribes se envía a la IA para buscar fuentes; nunca nombres de personas privadas.</p>
</main>`;
  }

  function vGuia() {
    return `<header class="top">${logoBtn(22)}<button class="btn" data-go="inicio" style="min-height:36px;font-size:13px">Volver</button></header>
<main class="pad" style="display:flex;flex-direction:column;gap:18px">
<h1 style="margin:6px 0 0;font-size:30px;line-height:1.02;letter-spacing:-.025em">Úsalo desde WhatsApp</h1>
<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:19px">En cualquier móvil, en dos toques</h2>
<ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:6px"><li>En WhatsApp, mantén pulsado el mensaje y pulsa <b>Copiar</b>.</li><li>Abre and also y pulsa <b>Pegar</b>. Listo.</li></ol></section>
<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:19px">Android: directo desde Compartir</h2>
<ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:6px"><li>Abre and also en Chrome, menú ⋮ → <b>Instalar aplicación</b>.</li><li>Desde ese momento, al pulsar <b>Compartir</b> en un mensaje o enlace, aparece and also en la lista.</li></ol></section>
<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:19px">iPhone: un Atajo para enlaces y textos</h2>
<p style="margin:0;font-size:14px;line-height:1.45;color:var(--grey)">Sirve desde Safari, Instagram, X o cualquier app que tenga el botón de compartir.</p>
<ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:6px"><li>Abre la app <b>Atajos</b> y crea uno nuevo con <b>+</b>.</li><li>En los detalles del atajo, activa <b>Mostrar en hoja de compartir</b> y elige <b>Texto</b> y <b>URL</b>.</li><li>Añade la acción <b>Codificar URL</b> con la entrada del atajo.</li><li>Añade <b>Abrir URL</b> con esta dirección seguida del resultado anterior:<br><code style="font-size:13px;word-break:break-all">https://jrjulvez.github.io/andalso/?t=</code></li><li>Llámalo <b>Cuéntame el resto</b>. Aparecerá al pulsar Compartir.</li></ol>
<p style="margin:0;font-size:13px;line-height:1.45;color:var(--grey)">Antes, abre una vez el enlace de invitación en Safari para que la invitación quede guardada allí.</p></section>
</main>`;
  }

  function vLeyendo() {
    const s = S.cargando ? Math.round((Date.now() - S.cargando.t0) / 1000) : 0;
    return `<header class="top">${logo(22)}</header>
<main class="pad" style="display:flex;flex-direction:column;gap:22px;padding-top:28px">
${S.previa && S.previa.gancho ? `<div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;font-weight:600;color:var(--grey)">Te ha llegado que</span><span style="font-size:24px;line-height:1.25;font-weight:500">«${esc(sinComillas(S.previa.gancho))}»</span></div>` : '<span style="font-size:24px;line-height:1.25;font-weight:500" class="think">Leyendo…</span>'}
<ul id="fase" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px">${fasesHTML(s)}</ul>
<p class="small" style="margin:0">Suele tardar entre 20 y 60 segundos · <span id="seg">${s} s</span></p>
<button class="btn" data-cancelar>Cancelar</button>
</main>`;
  }

  function detalleHTML(P, k) {
    if (k === 'gancho') return `<div class="det"><span class="lab">${P.esPregunta ? 'lo que se suele dar por hecho' : 'lo que llegó, frase a frase'}</span>${trs(P).map(seg => { const t = P.tramos[seg.k]; return `<div class="fila"><span class="lab" style="font-size:12px">${esc(t.ver)}</span><span style="font-size:15px;line-height:1.35;font-weight:500">${mark(esc(seg.t), t.ver)}</span><span style="font-size:14px;line-height:1.35;color:var(--grey)">${esc(t.porque)} · ${fuente(t.fuente, t.url)}</span></div>`; }).join('')}</div>`;
    if (k === 'also') return `<div class="det"><span class="lab" style="font-size:12px">${esc(P.also.ver)}</span><span style="font-size:15px;line-height:1.35">${esc(P.also.big)}</span><span style="font-size:14px;color:var(--grey)">${fuente(P.also.fuente, P.also.url)}</span></div>`;
    if (/^f\d+$/.test(k)) { const seg = trs(P)[+k.slice(1)], t = P.tramos[seg.k]; return `<div class="det"><span class="lab" style="font-size:12px">${esc(t.ver)}</span><span style="font-size:15px;line-height:1.35;font-weight:500">${mark(esc(seg.t), t.ver)}</span><span style="font-size:14px;line-height:1.35;color:var(--grey)">${esc(t.porque)} · ${fuente(t.fuente, t.url)}</span></div>`; }
    const n = P.N[k];
    return `<div class="det"><span style="font-size:15px;line-height:1.4">${esc(n.r || n.titulo)}</span>${n.items.map(e => `<div class="fila"><span class="lab" style="font-size:12px">${esc(e.ver)}</span><span style="font-size:15px;line-height:1.35;font-weight:500">${esc(e.t)}</span><span style="font-size:14px;color:var(--grey)">${fuente(e.f, e.url)}</span></div>`).join('')}<button class="link" data-quitaq="${k}" style="align-self:flex-start;color:var(--grey);font-size:13px">Quitar esta pregunta</button></div>`;
  }

  function vPieza() {
    const P = S.P, chat = P.destino === 'chat', d = diapos(P), sel = d.slice(1);
    const hechas = (P.hechas || []).map(x => x.toLowerCase());
    const sugeridas = (P.preguntas || []).filter(q => !esta(hechas, q.toLowerCase())).slice(0, 5);
    const rev = P.revision || {};
    const revHTML = rev.estado === 'en_curso' ? '<span class="think">Revisando veredictos y fuentes…</span>'
      : rev.estado === 'hecho' ? (rev.memoria ? 'Respuesta ya revisada' : rev.cambios.length ? `Revisado · ${rev.cambios.length} ${rev.cambios.length === 1 ? 'ajuste' : 'ajustes'} <button class="link" data-verajustes style="font-size:13px;padding:0">ver</button>` : 'Revisado: todo cuadra con sus fuentes')
        : rev.estado === 'error' ? 'No se ha podido revisar: mira las fuentes antes de enviar' : '';
    const cartas = candidatas(P).map(k => {
      const dentro = k === 'gancho' || esta(sel, k);
      return `<article class="fcard${!chat && !dentro ? ' fuera' : ''}"><button class="slidebtn" data-det="${k}" aria-label="Ver detalle y fuentes"><div class="slidebox fill">${slideHTML(P, k, 1, 1)}</div></button>
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:40px">
${chat ? (k === 'gancho' ? '<span style="font-size:13px;font-weight:600">Esta es la que se envía</span>' : '<span class="small" style="font-size:13px">Para que entiendas el resto</span>') : (k === 'gancho' ? '<span style="font-size:13px;font-weight:600">Portada · siempre va</span>' : `<button class="incl${dentro ? ' on' : ''}" data-incluir="${k}" aria-pressed="${dentro}">${dentro ? '✓ En el carrusel' : '+ Añadir al carrusel'}</button>`)}
<button class="link" data-det="${k}" style="font-size:13px">${S.det[k] ? 'Ocultar fuentes' : 'Fuentes y detalle'}</button></div>
${S.det[k] ? detalleHTML(P, k) : ''}</article>`;
    }).join('');
    const body = `<div style="display:flex;flex-direction:column">
${P.avisoBusqueda ? '<div class="pad" style="padding-bottom:0"><div class="err">Alguna búsqueda falló mientras leía. Revisa las fuentes antes de mandar nada.</div></div>' : ''}
<section class="pad" style="display:flex;flex-direction:column;gap:8px;padding-bottom:14px">
${S.verOriginal ? `<p style="margin:4px 0 0;font-size:15px;line-height:1.6;color:var(--grey)">${esc(P.original.map(s => typeof s === 'string' ? s : s.t).join(''))}</p>` : ''}
<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><button class="link" data-veroriginal style="color:var(--grey);font-weight:500">${S.verOriginal ? 'Ocultar el texto' : 'Ver el texto entero'}</button>${P.veces > 1 ? `<span class="small">${P.veces} personas han preguntado esto</span>` : ''}</div>
${revHTML ? `<span class="small" style="line-height:1.4">${revHTML}</span>` : ''}
${S.verAjustes && rev.cambios && rev.cambios.length ? `<ul class="small" style="margin:0;padding-left:18px;line-height:1.45">${rev.cambios.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
</section>
<section class="pad" style="display:flex;flex-direction:column;gap:12px;padding-top:0;padding-bottom:16px">
<div class="seg" role="radiogroup" aria-label="para dónde">${[['chat', 'Para el chat', '1 ficha + texto'], ['redes', 'Para redes', 'carrusel de ' + (chat ? Math.min(MAX_FICHAS, 1 + (P.fichas || []).filter(k => k !== 'gancho' && valida(P, k)).length) : d.length)]].map(([k, l, s]) => `<button class="btn ${P.destino === k ? 'on' : ''}" role="radio" aria-checked="${P.destino === k}" data-destino="${k}" style="min-height:52px;display:flex;flex-direction:column;justify-content:center;gap:1px"><span>${l}</span><span style="font-size:11px;font-weight:500">${s}</span></button>`).join('')}</div>
<div class="seg" role="radiogroup" aria-label="tono">${[['neutro', 'Te lo explico'], ['complice', 'Yo también lo pensé']].map(([k, l]) => `<button class="btn ${P.tono === k ? 'on' : ''}" role="radio" aria-checked="${P.tono === k}" data-tono="${k}">${l}</button>`).join('')}</div>
</section>
<section class="pad" style="display:flex;flex-direction:column;gap:22px;padding-top:0">${cartas}</section>
<section class="pad" style="display:flex;flex-direction:column;gap:10px;padding-top:6px">
<span style="font-size:14px;font-weight:600;color:var(--grey)">Sigue preguntando</span>
${sugeridas.map(q => `<button class="sug" data-sug="${esc(q)}"><span>${esc(q)}</span><span aria-hidden="true">→</span></button>`).join('')}
<form id="fq" class="composer" style="gap:8px;padding:10px"><label for="q" class="sr">Tu pregunta</label><div style="display:flex;gap:8px"><input id="q" type="text" autocomplete="off" enterkeyhint="send" placeholder="${sugeridas.length ? 'O escribe la tuya' : 'Escribe tu pregunta'}" style="border:0;padding:0 4px;background:transparent"><button class="btn dark" type="submit" style="min-height:44px">Preguntar</button></div></form>
<span class="small">Cada respuesta se convierte en una ficha.</span>
</section>
<section class="pad" style="display:flex;flex-direction:column;gap:10px;padding-top:6px">
<label for="chat" style="font-size:14px;font-weight:600;color:var(--grey)">${chat ? 'Texto para el chat' : 'Texto para acompañar'}</label>
<textarea id="chat" rows="3" style="min-height:84px;font-size:16px">${esc(P.paraChat || plano(titular(P)))}</textarea>
<button class="opt ${P.conEnlace ? 'on' : ''}" role="switch" aria-checked="${!!P.conEnlace}" data-conenlace><span class="sw" aria-hidden="true"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:700">Añadir un enlace con las fuentes</span><span style="font-size:13px;line-height:1.3;color:var(--grey)">${P.conEnlace ? 'Quien lo abra verá todas las fichas y las fuentes.' : 'Desactivado: solo se comparten la ficha y el texto.'}</span></span><span></span></button>
${P.conEnlace ? `<div style="display:flex;gap:8px;align-items:center;min-height:40px">${S.corto && S.corto.error ? `<span class="small" style="color:var(--ink)">${esc(S.corto.error)}</span>` : enlaceListo(P) && P.corto ? `<span style="flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(P.corto.url.replace(/^https:\/\//, ''))}</span><button class="btn" data-copiar style="min-height:40px;font-size:14px">Copiar</button>` : '<span class="small think">Creando el enlace…</span>'}</div>` : ''}
${S.error ? `<div class="err" role="alert">${esc(S.error)}</div>` : ''}
${S.alternativas || (S.fichas && fichasListas(P) && !puedeCompartirFicheros(S.fichas.files)) ? alternativasHTML(P) : ''}
</section>
</div>`;
    const n = d.length, que = (chat ? 'la ficha y el texto' : 'las ' + n + ' fichas') + (P.conEnlace && !(S.corto && S.corto.error) ? (chat ? ' con enlace' : ' y el enlace') : '');
    const bar = `<div class="bar" style="flex-direction:row">${rev.estado === 'en_curso' ? `<button class="btn dark" data-compartir style="flex:1 1 auto;min-height:52px;font-size:16px;opacity:.75"><span class="think">Revisando antes de compartir…</span></button>` : fichasListas(P) && enlaceListo(P) ? `<button class="btn dark" data-compartir style="flex:1 1 auto;min-height:52px;font-size:16px">${S.quiere ? 'Listo: compartir ' : 'Compartir '}${que}</button>` : `<button class="btn dark" data-compartir style="flex:1 1 auto;min-height:52px;font-size:16px;opacity:.75"><span class="think">Preparando ${chat ? 'la ficha' : 'las fichas'}…</span></button>`}</div>`;
    return `<header class="top"><div style="display:flex;align-items:baseline;gap:12px;min-width:0">${logoBtn(22)}<span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(P.titulo)}</span></div></header>
<main style="border-top:2px solid var(--ink)">${body}</main>${bar}${hojaHTML()}`;
  }

  function hojaHTML() {
    const h = S.hoja; if (!h) return '';
    let inner = '';
    if (h.cargando) inner = `<span style="font-size:17px" class="think">Buscando fuentes…</span><span class="small"><span id="seg">0 s</span></span><button class="btn" data-cancelar>Cancelar</button>`;
    else if (h.error) inner = `<div class="err" role="alert">${esc(h.error)}</div><button class="btn dark" data-close>Vale</button>`;
    else if (h.ninguna) inner = `<span style="font-size:16px;line-height:1.4">${esc(h.r)}</span><span class="small">No me la invento: queda fuera de la pieza.</span><button class="btn dark" data-close>Vale</button>`;
    else {
      const n = h.nodo;
      inner = `<span style="font-size:22px;line-height:1.15;font-weight:700;letter-spacing:-.015em">${esc(n.titulo)}</span>${n.r && n.r !== n.titulo ? `<span style="font-size:16px;line-height:1.4">${esc(n.r)}</span>` : ''}
<div class="list">${n.items.map(e => `<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:700">${esc(e.t)}</span><span style="font-size:12px;color:var(--grey)">${esc(e.ver)} · ${fuente(e.f, e.url)}</span></div>`).join('')}</div>
<div style="display:flex;gap:10px"><button class="btn dark" data-accept style="flex:1 1 auto">Añadir como ficha</button><button class="btn" data-close>Ahora no</button></div>`;
    }
    return `<div class="sheetbg" data-close-bg><div class="sheet" role="dialog" aria-modal="true" aria-label="respuesta"><div class="grab" aria-hidden="true"></div>
<span class="small">has preguntado</span><span style="font-size:18px;font-weight:600;line-height:1.25">«${esc(h.pregunta)}»</span>${inner}</div></div>`;
  }

  // ---------- compartir: fichas y enlace preparados de antemano ----------
  // El móvil solo deja abrir «compartir» justo después del toque: todo se prepara antes.
  const firma = o => { const t = JSON.stringify(o); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return t.length + ':' + h; };
  function piezaMin(P) {
    const N = {}; Object.keys(P.N || {}).forEach(k => { N[k] = P.N[k]; });
    return { v: 2, titulo: P.titulo, fuenteOriginal: P.fuenteOriginal, esPregunta: !!P.esPregunta, gancho: P.gancho || '', original: P.original, tramos: P.tramos, portada: P.portada, also: P.also, N, fichas: P.fichas, destino: P.destino, tono: P.tono, fecha: P.fecha };
  }
  const firmaFichas = P => firma({ d: diapos(P), m: piezaMin(P) });
  const enlaceListo = P => !P.conEnlace || (S.corto && S.corto.error) || (P.corto && P.corto.firma === firma(piezaMin(P)));
  const fichasListas = P => !!(S.fichas && S.fichas.firma === firmaFichas(P));
  async function enlaceCorto() {
    const P = S.P, min = piezaMin(P), f = firma(min);
    if (P.corto && P.corto.firma === f) return P.corto.url;
    const id = await M.guardarPieza(min);
    P.corto = { firma: f, url: location.origin + location.pathname + '#v=' + id }; guardaP();
    return P.corto.url;
  }
  async function generarFichas(P) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const cont = document.getElementById('export'); cont.innerHTML = slidesHTML(P, diapos(P)).join('');
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
    const P = S.P; if (!P || S.paso !== 'pieza' || P.revision.estado === 'en_curso') return;
    preparando = true; otraVez = false;
    try {
      if (!fichasListas(P)) {
        const f = firmaFichas(P), files = await generarFichas(P);
        if (S.fichas && S.fichas.urls) S.fichas.urls.forEach(u => URL.revokeObjectURL(u));
        S.fichas = { firma: f, files, urls: files.map(x => URL.createObjectURL(x)) };
      }
      if (P.conEnlace && !enlaceListo(P)) {
        try { const url = await enlaceCorto(); S.corto = { url }; } catch (e) { S.corto = { error: (e && e.mensaje) || 'No he podido crear el enlace.' }; }
      }
    } catch (e) { S.error = 'No he podido preparar las imágenes en este navegador.'; }
    preparando = false;
    if (otraVez || (S.P && S.fichas && S.fichas.firma !== firmaFichas(S.P))) programarPreparar();
    if (S.paso === 'pieza') { const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  const puedeCompartirFicheros = files => !!(navigator.canShare && navigator.share && files && navigator.canShare({ files }));
  function textoCompartir(P) {
    const url = P.conEnlace && P.corto && P.corto.firma === firma(piezaMin(P)) ? P.corto.url : '';
    const t = P.destino === 'chat' ? (P.paraChat || plano(titular(P))) : '';
    return [t, url].filter(Boolean).join('\n');
  }
  function compartir() {
    // sin esperas antes de navigator.share: tiene que ir pegado al toque
    const P = S.P;
    if (P.revision.estado === 'en_curso' || !fichasListas(P) || !enlaceListo(P)) { S.quiere = true; render(); programarPreparar(); return; }
    S.quiere = false;
    const files = S.fichas.files, text = textoCompartir(P);
    let datos = text ? { files, text } : { files };
    if (text && !(navigator.canShare && navigator.canShare(datos))) datos = { files };
    if (puedeCompartirFicheros(files)) {
      navigator.share(datos).then(() => M.evento('compartida')).catch(e => { if (e && e.name !== 'AbortError') { S.alternativas = true; S.error = 'El móvil no ha dejado compartir. Usa una de estas opciones.'; render(); } });
    } else { S.alternativas = true; S.error = ''; render(); }
  }
  function descargar() {
    if (!S.fichas) return;
    S.fichas.files.forEach((f, i) => { const a = document.createElement('a'); a.href = S.fichas.urls[i]; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
    M.evento('compartida');
  }
  async function copiarImagen(b) {
    try { await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': S.fichas.files[0] })]); b.textContent = 'Copiada: pégala en el chat'; M.evento('compartida'); }
    catch (e) { b.textContent = 'No se puede copiar aquí: mantenla pulsada'; }
  }
  function alternativasHTML(P) {
    if (!S.fichas) return '';
    const text = textoCompartir(P), n = S.fichas.files.length;
    return `<div class="card" style="display:flex;flex-direction:column;gap:12px">
<span style="font-size:16px;font-weight:700">Otras formas de mandarla</span>
<span style="font-size:14px;line-height:1.4">Mantén pulsada ${n === 1 ? 'la imagen' : 'una imagen'} para copiarla o guardarla. Si estás dentro de WhatsApp, Instagram o Gmail, abre esta página en Safari o Chrome para compartir con un toque.</span>
<div style="display:flex;gap:8px;overflow-x:auto">${S.fichas.urls.map((u, i) => `<img src="${u}" alt="ficha ${i + 1}" style="width:${n === 1 ? 150 : 110}px;height:auto;border:2px solid var(--ink);flex:none">`).join('')}</div>
${window.ClipboardItem && navigator.clipboard && navigator.clipboard.write ? `<button class="btn" data-copiaimg>${n === 1 ? 'Copiar la imagen' : 'Copiar la primera imagen'}</button>` : ''}
${text ? `<a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Mandar el texto por WhatsApp</a>` : ''}
<button class="btn" data-descargar>${n === 1 ? 'Guardar la imagen' : 'Guardar las ' + n + ' imágenes'}</button>
</div>`;
  }

  // ---------- quien recibe el enlace ----------
  function validarPieza(P) {
    try {
      P = migrar(P); if (!P) return null;
      P.original = P.original.filter(s => typeof s === 'string' || (s && typeof s.t === 'string' && P.tramos[s.k]));
      Object.values(P.tramos).forEach(t => { if (VERS.indexOf(t.ver) < 0) t.ver = 'sin fuente'; if (!urlBien(t.url)) t.url = ''; });
      const N = {}; Object.keys(P.N || {}).forEach(k => { const n = P.N[k]; if (/^l\d{1,2}$/.test(k) && n && Array.isArray(n.items) && typeof n.titulo === 'string') { n.items.forEach(e => { if (!urlBien(e.url)) e.url = ''; if (VERS.indexOf(e.ver) < 0) e.ver = 'sin fuente'; }); N[k] = n; } });
      P.N = N;
      if (P.also && !urlBien(P.also.url)) P.also.url = '';
      P.fichas = (P.fichas || []).filter(KEY_OK);
      P.destino = P.destino === 'chat' ? 'chat' : 'redes';
      P.tono = P.tono === 'complice' ? 'complice' : 'neutro';
      return P;
    } catch (e) { return null; }
  }
  function leerEnlaceLargo() {
    const m = location.hash.match(/^#p=(.+)$/); if (!m || !window.LZString) return null;
    try { return validarPieza(JSON.parse(window.LZString.decompressFromEncodedURIComponent(m[1]))); } catch (e) { return null; }
  }
  async function cargarCorto() {
    const m = location.hash.match(/^#v=([A-Za-z0-9]{6,16})$/); if (!m) return false;
    set({ paso: 'cargavista', errorVista: '' });
    try { const P = validarPieza(await M.leerPieza(m[1])); if (!P) throw 0; abrirVista(P, m[1]); }
    catch (e) { set({ paso: 'cargavista', errorVista: e && e.tipo === 'no_existe' ? 'Esta pieza no existe o ha caducado.' : 'No he podido abrir esta pieza. Prueba en un rato.' }); }
    return true;
  }
  function abrirVista(P, id) {
    const k = 'aa_vista_' + (id || firma(P.original));
    if (!lee(k)) { guarda(k, '1'); M.evento('enlace_abierto'); }
    set({ paso: 'vista', vista: P, det: {} });
  }
  function vCargaVista() {
    const home = esc(location.origin + location.pathname);
    return `<header class="top"><a href="${home}" aria-label="and also: ir al principio" style="text-decoration:none">${logo(24)}</a></header><main class="pad" style="display:flex;flex-direction:column;gap:16px;padding-top:40px">${S.errorVista ? `<div class="err" role="alert">${esc(S.errorVista)}</div><a class="btn dark" href="${home}" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Ir a and also</a>` : '<span class="think" style="font-size:18px">Abriendo la pieza…</span>'}</main>`;
  }
  function vVista() {
    const P = S.vista, home = esc(location.origin + location.pathname), todas = candidatas(P);
    return `<header class="top"><a href="${home}" aria-label="and also: ir al principio" style="text-decoration:none">${logo(24)}</a><a class="btn" href="${home}" data-ref style="display:inline-flex;align-items:center;text-decoration:none;min-height:36px;font-size:13px">Haz la tuya</a></header>
<main style="display:flex;flex-direction:column;gap:14px">
<div class="pad" style="padding-bottom:0;display:flex;flex-direction:column;gap:8px"><span class="lab">te lo han contado entero</span><h1 style="margin:0;font-size:30px;line-height:1.04;letter-spacing:-.025em">${resaltar(titular(P))}</h1></div>
<div class="slides">${slidesHTML(P, todas).map(s => `<div class="slidebox">${s}</div>`).join('')}</div>
<div class="pad" style="padding-top:0;display:flex;flex-direction:column;gap:12px">
${todas.map(k => `<div style="border-top:2px solid var(--ink);padding-top:10px;display:flex;flex-direction:column;gap:6px"><button class="link" data-det="${k}" style="align-self:flex-start;font-size:15px;text-align:left">${k === 'gancho' ? (P.esPregunta ? 'Lo que se suele dar por hecho' : 'Lo que llegó, frase a frase') : k === 'also' ? 'Lo que también es verdad' : /^f/.test(k) ? '«' + esc(trs(P)[+k.slice(1)].t) + '»' : esc(P.N[k].q)} ${S.det[k] ? '▴' : '▾'}</button>${S.det[k] ? detalleHTML(P, k).replace(/<button class="link" data-quitaq[^>]*>[^<]*<\/button>/, '') : ''}</div>`).join('')}
<p class="small" style="margin:0;line-height:1.45">Hecha con and also el ${esc(P.fecha || '')}. Cada punto lleva su veredicto: ${VERS.join(', ')}. Lo que es opinión lleva nombre.</p>
</div>
<section style="background:var(--ink);color:var(--paper);padding:26px 20px 30px;display:flex;flex-direction:column;gap:14px">
<h2 style="margin:0;font-size:28px;line-height:1.02;letter-spacing:-.03em">¿Te ha llegado algo a ti? Cuéntale el ${hl('resto')}.</h2>
<a class="btn" href="${home}" data-ref style="display:flex;align-items:center;justify-content:center;text-decoration:none;min-height:52px;background:var(--paper);color:var(--ink);border-color:var(--paper)">Abrir and also</a>
<p style="margin:0;font-size:13px;line-height:1.45;color:#BDBBB5">and also funciona con invitación. Si no tienes, pídesela a quien te ha mandado esto.</p>
</section>
</main>`;
  }

  // ---------- ajustes y administración ----------
  function vAjustes() {
    const modo = M.modo(), yo = S.yo, maestro = yo && yo.rol === 'maestro', A = S.admin || {};
    const nombres = { abre: 'Aperturas', pieza: 'Piezas nuevas', memoria: 'Desde memoria', pregunta: 'Preguntas', compartida: 'Compartidas', enlace_abierto: 'Enlaces abiertos', receptor_crea: 'Receptores que crean', vuelta7: 'Vuelven a los 7 días', llamada: 'Llamadas a la IA' };
    return `<header class="top">${logoBtn(22)}<button class="btn" data-go="inicio" style="min-height:36px;font-size:13px">Volver</button></header>
<main class="pad" style="display:flex;flex-direction:column;gap:18px">
<h1 style="margin:6px 0 0;font-size:30px;line-height:1.02;letter-spacing:-.025em">Ajustes</h1>
${S.error ? `<div class="aviso">${esc(S.error)}</div>` : ''}
<section class="card" style="display:flex;flex-direction:column;gap:8px"><span class="lab">tu acceso</span>
${modo === 'clave' ? '<span style="font-size:16px;line-height:1.4">Usas tu propia clave de Anthropic.</span>' : M.ajustes.codigo ? `<span style="font-size:16px;line-height:1.4">${!yo ? '<span class="think">Comprobando tu invitación…</span>' : yo.error ? esc(yo.error) : maestro ? 'Tienes el código maestro: gestionas las invitaciones.' : 'Invitación de <b>' + esc(yo.nombre) + '</b> · hoy ' + yo.usadas + ' de ' + yo.cupo + ' consultas.'}</span><button class="btn" type="button" data-borracodigo>Quitar la invitación de este móvil</button>` : '<span style="font-size:16px;line-height:1.4">No tienes invitación en este móvil. Abre el enlace de invitación que te han pasado.</span>'}
</section>
${maestro ? `<section class="card" style="display:flex;flex-direction:column;gap:10px"><span class="lab">invitaciones</span>
<p style="margin:0;font-size:14px;line-height:1.45">Una por persona, con ${A.cupo || 60} consultas al día. Si una se filtra, revócala y solo se corta esa.</p>
<form id="finv" style="display:flex;gap:8px"><label for="ninv" class="sr">Nombre</label><input id="ninv" type="text" placeholder="Nombre de la persona" maxlength="40" autocomplete="off"><button class="btn dark" type="submit">Crear</button></form>
${A.nueva ? `<div class="aviso" style="display:flex;flex-direction:column;gap:8px"><span>Invitación para <b>${esc(A.nueva.nombre)}</b>. Mándale este enlace:</span><span style="font-size:13px;word-break:break-all">${esc(A.nueva.url)}</span><div style="display:flex;gap:8px"><button class="btn" data-copiainv>Copiar</button>${navigator.share ? '<button class="btn" data-compartinv>Compartir</button>' : ''}</div></div>` : ''}
${A.error ? `<div class="err">${esc(A.error)}</div>` : ''}
${A.lista ? (A.lista.length ? `<ul class="list" style="margin:0;padding:0;list-style:none">${A.lista.map(i => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:flex;flex-direction:column"><span style="font-weight:600">${esc(i.nombre)}</span><span class="small" style="font-size:12px">hoy ${i.hoy} consultas · …${esc(i.codigo.slice(-4))}</span></span><button class="link" data-revocar="${esc(i.codigo)}" style="color:var(--grey)">Revocar</button></li>`).join('')}</ul>` : '<span class="small">Aún no has creado ninguna.</span>') : '<span class="small think">Cargando…</span>'}
</section>
<section class="card" style="display:flex;flex-direction:column;gap:10px"><span class="lab">uso de los últimos 7 días</span>
${A.stats ? `<table class="stats"><thead><tr><th></th>${A.stats.slice(0, 7).reverse().map(d => `<th>${esc(d.dia.slice(8))}</th>`).join('')}<th>Total</th></tr></thead><tbody>${Object.keys(nombres).map(ev => `<tr><td>${nombres[ev]}</td>${A.stats.slice(0, 7).reverse().map(d => `<td>${d[ev] || ''}</td>`).join('')}<td><b>${A.stats.slice(0, 7).reduce((s, d) => s + (d[ev] || 0), 0)}</b></td></tr>`).join('')}</tbody></table><span class="small">Solo contadores por día: ni quién, ni qué se ha preguntado.</span>` : '<span class="small think">Cargando…</span>'}
</section>` : ''}
<button class="link" data-go="guia" style="align-self:flex-start">Úsalo desde WhatsApp →</button>
<details class="card"><summary style="font-weight:600;cursor:pointer">Avanzado: usar tu propia clave de Anthropic</summary>
<form id="fcl" style="display:flex;flex-direction:column;gap:10px;margin-top:12px"><label for="cl" class="small">Tu clave se guarda solo en este móvil y tiene prioridad sobre la invitación. Necesita la búsqueda web activada.</label>
<input id="cl" type="password" autocomplete="off" spellcheck="false" placeholder="${M.ajustes.clave ? 'Guardada: ••••' + esc(M.ajustes.clave.slice(-4)) : 'sk-ant-…'}">
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" type="submit">Guardar</button><button class="btn" type="button" data-probar>Probar</button>${M.ajustes.clave ? '<button class="btn" type="button" data-borraclave>Borrar la clave</button>' : ''}</div>
<span id="estado" class="small" aria-live="polite"></span></form></details>
</main>`;
  }
  async function cargarAjustes() {
    if (M.modo() !== 'invitado') return;
    try { S.yo = await M.yo(); } catch (e) { S.yo = { error: e.mensaje || 'No he podido comprobar la invitación.' }; }
    if (S.paso === 'ajustes') render();
    if (S.yo && S.yo.rol === 'maestro') {
      S.admin = S.admin || {};
      try { const l = await M.invitaciones.lista(); S.admin.lista = l.invitaciones; S.admin.cupo = l.cupo; } catch (e) { S.admin.error = e.mensaje; S.admin.lista = []; }
      try { S.admin.stats = (await M.estadisticas()).dias; } catch (e) { S.admin.stats = []; }
      if (S.paso === 'ajustes') render();
    }
  }

  // ---------- eventos de la interfaz ----------
  function bind() {
    const q = (sel, fn) => app.querySelectorAll(sel).forEach(fn);
    q('[data-go]', b => b.onclick = () => {
      const go = b.dataset.go;
      if (go === 'inicio') { if (location.hash) history.replaceState(null, '', location.pathname); S.hoja = null; S.corto = null; S.fichas = null; }
      set({ paso: go, error: '' }); window.scrollTo(0, 0);
      if (go === 'ajustes') cargarAjustes();
    });
    q('[data-abrir]', b => b.onclick = () => { const p = store.lista().find(x => x.id === b.dataset.abrir); if (p) { S.fichas = null; abrirPieza(p); } });
    q('[data-borrar]', b => b.onclick = () => { store.borrar(b.dataset.borrar); render(); });
    q('[data-pp]', b => b.onclick = () => { S.pp = (S.pp || 0) + (+b.dataset.pp); render(); });
    q('[data-empieza]', b => b.onclick = () => { const t = document.getElementById('tin'); t.value = b.dataset.empieza; S.entrada.texto = t.value; t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    q('[data-pegar]', b => b.onclick = async () => { try { const t = await navigator.clipboard.readText(); if (t) { S.entrada.texto = t; render(); } } catch (e) { b.textContent = 'Mantén pulsado el cuadro y pega'; } });
    q('[data-sug]', b => b.onclick = () => preguntar(b.dataset.sug));
    q('[data-veroriginal]', b => b.onclick = () => set({ verOriginal: !S.verOriginal }));
    q('[data-verajustes]', b => b.onclick = () => set({ verAjustes: !S.verAjustes }));
    const keep = fn => { const y = window.scrollY; fn(); render(); window.scrollTo(0, y); };
    q('[data-det]', b => b.onclick = () => keep(() => { S.det[b.dataset.det] = !S.det[b.dataset.det]; }));
    q('[data-destino]', b => b.onclick = () => keep(() => { S.P.destino = b.dataset.destino; S.alternativas = false; guardaP(); }));
    q('[data-tono]', b => b.onclick = () => keep(() => { S.P.tono = b.dataset.tono; guardaP(); }));
    q('[data-incluir]', b => b.onclick = () => keep(() => {
      const P = S.P, k = b.dataset.incluir;
      if (esta(P.fichas, k)) P.fichas = P.fichas.filter(x => x !== k);
      else if (diapos(P).length < MAX_FICHAS) P.fichas = (P.fichas || []).concat([k]);
      else { S.error = 'Caben ' + MAX_FICHAS + ' fichas como mucho. Quita otra antes.'; return; }
      S.error = ''; guardaP();
    }));
    q('[data-quitaq]', b => b.onclick = () => keep(() => { const P = S.P, k = b.dataset.quitaq; delete P.N[k]; P.fichas = P.fichas.filter(x => x !== k); S.det[k] = false; guardaP(); }));
    q('[data-accept]', b => b.onclick = () => {
      const h = S.hoja, P = S.P; P.N[h.k] = h.nodo;
      if (diapos(Object.assign({}, P, { destino: 'redes' })).length < MAX_FICHAS) P.fichas = (P.fichas || []).concat([h.k]);
      guardaP(); S.det[h.k] = false; set({ hoja: null });
      setTimeout(() => { const el = app.querySelector('[data-det="' + h.k + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    });
    q('[data-close]', b => b.onclick = () => set({ hoja: null }));
    q('[data-cancelar]', b => b.onclick = () => { if (ctrl) ctrl.abort(); });
    q('[data-compartir]', b => b.onclick = () => compartir());
    q('[data-descargar]', b => b.onclick = () => descargar());
    q('[data-copiaimg]', b => b.onclick = () => copiarImagen(b));
    q('[data-conenlace]', b => b.onclick = () => keep(() => { S.P.conEnlace = !S.P.conEnlace; S.corto = null; guardaP(); }));
    q('[data-copiar]', b => b.onclick = async () => { try { await navigator.clipboard.writeText(await enlaceCorto()); b.textContent = 'Copiado'; } catch (e) { b.textContent = 'No se pudo'; } });
    q('[data-quitaimg]', b => b.onclick = () => { S.entrada.imagen = null; render(); });
    q('[data-ref]', b => b.addEventListener('click', () => guarda('aa_ref', '1')));
    q('[data-borracodigo]', b => b.onclick = () => { M.ajustes.codigo = ''; S.yo = null; render(); });
    q('[data-borraclave]', b => b.onclick = () => { M.ajustes.clave = ''; render(); });
    q('[data-revocar]', b => b.onclick = async () => { b.textContent = 'Revocando…'; try { await M.invitaciones.borrar(b.dataset.revocar); S.admin.lista = S.admin.lista.filter(i => i.codigo !== b.dataset.revocar); } catch (e) { S.admin.error = e.mensaje; } render(); });
    q('[data-copiainv]', b => b.onclick = async () => { try { await navigator.clipboard.writeText(S.admin.nueva.url); b.textContent = 'Copiado'; } catch (e) {} });
    q('[data-compartinv]', b => b.onclick = () => { navigator.share({ text: 'Te paso and also: ' + S.admin.nueva.url }).catch(() => {}); });
    q('[data-probar]', b => b.onclick = async () => { const est = document.getElementById('estado'); est.textContent = 'Probando…'; try { await M.probarClave(); est.textContent = 'Funciona.'; } catch (e) { est.textContent = (e && e.mensaje) || 'No funciona.'; } });
    const bg = app.querySelector('[data-close-bg]'); if (bg && !(S.hoja && S.hoja.cargando)) bg.onclick = e => { if (e.target === bg) set({ hoja: null }); };
    const tin = document.getElementById('tin'); if (tin) tin.oninput = () => { S.entrada.texto = tin.value; };
    const chat = document.getElementById('chat'); if (chat) chat.oninput = () => { S.P.paraChat = chat.value.slice(0, 400); guardaP(); };
    const fimg = document.getElementById('fimg'); if (fimg) fimg.onchange = () => leerImagen(fimg.files && fimg.files[0]);
    const fin = document.getElementById('fin'); if (fin) fin.onsubmit = e => { e.preventDefault(); empezar(); };
    const fq = document.getElementById('fq'); if (fq) fq.onsubmit = e => { e.preventDefault(); preguntar(document.getElementById('q').value); };
    const finv = document.getElementById('finv'); if (finv) finv.onsubmit = async e => {
      e.preventDefault(); const nombre = document.getElementById('ninv').value.trim(); if (!nombre) return;
      try { const r = await M.invitaciones.crear(nombre); S.admin.nueva = { nombre: r.nombre, url: location.origin + location.pathname + '?c=' + r.codigo }; S.admin.lista = [{ codigo: r.codigo, nombre: r.nombre, hoy: 0 }].concat(S.admin.lista || []); S.admin.error = ''; }
      catch (er) { S.admin.error = er.mensaje; }
      render();
    };
    const fcl = document.getElementById('fcl'); if (fcl) fcl.onsubmit = e => { e.preventDefault(); const v = document.getElementById('cl').value.trim(); if (v) M.ajustes.clave = v; render(); };
    const sh = app.querySelector('.sheet'); if (sh) { const b = sh.querySelector('button'); if (b) b.focus(); }
  }

  function leerImagen(f) {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { set({ error: 'Sube la captura como imagen PNG, JPG o WebP.' }); return; }
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      // reducir a 1280 px de lado: menos peso para el intermediario y menos gasto
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      S.entrada.imagen = { tipo: 'image/jpeg', datos: c.toDataURL('image/jpeg', 0.75).split(',')[1] }; URL.revokeObjectURL(url); S.error = ''; render();
    };
    img.onerror = () => set({ error: 'No he podido abrir esa imagen.' });
    img.src = url;
  }

  // ---------- arranque ----------
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.hoja && !S.hoja.cargando) set({ hoja: null }); });
  window.addEventListener('resize', () => escalar());
  window.addEventListener('hashchange', () => { const P = leerEnlaceLargo(); if (P) abrirVista(P); else cargarCorto(); });
  (function () {
    // medición anónima: una apertura al día por dispositivo y si vuelve a los 7 días
    const dia = new Date().toISOString().slice(0, 10);
    if (lee('aa_dia') !== dia) { guarda('aa_dia', dia); M.evento('abre'); }
    if (!lee('aa_alta')) guarda('aa_alta', dia);
    else if (!lee('aa_v7') && Date.now() - Date.parse(lee('aa_alta')) >= 7 * 864e5) { guarda('aa_v7', '1'); M.evento('vuelta7'); }
    const P = leerEnlaceLargo();
    if (P) { abrirVista(P); return; }
    if (/^#v=/.test(location.hash)) { cargarCorto(); return; }
    const u = new URLSearchParams(location.search);
    const cod = u.get('c');
    if (cod && /^[A-Za-z0-9_-]{6,64}$/.test(cod)) { M.ajustes.codigo = cod; history.replaceState(null, '', location.pathname); }
    const t = [u.get('t') || u.get('text') || '', u.get('u') || u.get('url') || ''].filter(Boolean).join(' ').trim();
    if (t) { S.entrada.texto = t; history.replaceState(null, '', location.pathname); }
    render();
  })();
})();
