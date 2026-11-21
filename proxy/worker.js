// and also · intermediario (Cloudflare Worker)
// Guarda la clave de Anthropic en secreto y deja que la app la use sin enseñarla.
// Variables (Cloudflare → Worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (secreto)  la clave de Anthropic
//   CODIGO             (secreto)  el código maestro: gestiona invitaciones y ve estadísticas
//   ORIGENES           (opcional) webs que pueden usarlo, separadas por comas
//   CUPO_DIARIO        (opcional) llamadas a la IA por invitación y día (por defecto 60)
// Almacén KV «PIEZAS»: piezas compartidas, invitaciones, cupos, contadores y memoria de respuestas.
const MODELOS = ['claude-sonnet-5-5', 'claude-haiku-5-5'];
const MAX_TOKENS = 8000;
const MAX_BUSQUEDAS = 6;
const MAX_PIEZA = 60000;
const DIA = 60 * 60 * 24;
const VIDA_PIEZA = DIA * 365;
const VIDA_MEMORIA = DIA * 3;      // una respuesta guardada vale 3 días: las noticias cambian
const EVENTOS = ['abre', 'pieza', 'memoria', 'pregunta', 'compartida', 'enlace_abierto', 'receptor_crea', 'vuelta7', 'llamada', 'error_red', 'error_formato', 'error_ia', 'error_otro'];
const ALFABETO = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nuevoId = n => { const b = crypto.getRandomValues(new Uint8Array(n)); return Array.from(b, x => ALFABETO[x % ALFABETO.length]).join(''); };
const hoy = () => new Date().toISOString().slice(0, 10);

export default {
  async fetch(req, env) {
    try { return await atender(req, env); }
    catch (e) {
      // devolver siempre un error legible (con CORS) en vez de cortar la conexión
      return new Response(JSON.stringify({ error: { type: 'intermediario', message: 'El intermediario ha fallado: ' + (e && e.message || 'error') } }), { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json' } });
    }
  }
};

async function atender(req, env) {
  const origen = req.headers.get('Origin') || '';
  const permitidos = (env.ORIGENES || 'https://jrjulvez.github.io').split(',').map(s => s.trim());
  const cors = {
    'Access-Control-Allow-Origin': permitidos.includes(origen) ? origen : permitidos[0],
    'Access-Control-Allow-Headers': 'content-type, x-andalso-codigo',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json', ...extra } });
  const err = (type, message, status) => json({ error: { type, message } }, status);
  const ruta = new URL(req.url).pathname;
  const kv = env.PIEZAS;
  const sinKV = () => err('sin_almacen', 'Falta el almacén de piezas.', 501);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // ---- público: leer una pieza compartida ----
  const mp = ruta.match(/^\/p\/([A-Za-z0-9]{6,16})$/);
  if (req.method === 'GET' && mp) {
    if (!kv) return sinKV();
    const v = await kv.get('p:' + mp[1]);
    if (!v) return err('no_existe', 'Esta pieza no existe o ha caducado.', 404);
    return new Response(v, { status: 200, headers: { ...cors, 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
  }
  if (req.method === 'GET' && ruta === '/') return json({ ok: true, servicio: 'and also', enlaces_cortos: !!kv, invitaciones: !!kv });

  // ---- público: eventos anónimos (solo contadores por día, sin datos de nadie) ----
  if (req.method === 'POST' && ruta === '/e') {
    if (!permitidos.includes(origen)) return err('origen', 'Origen no permitido.', 403);
    if (!kv) return json({ ok: false });
    let ev = ''; try { ev = (await req.json()).ev; } catch (e) {}
    if (!EVENTOS.includes(ev) || ev === 'llamada') return err('peticion', 'Evento no válido.', 400);
    await sumar(kv, 'e:' + hoy() + ':' + ev);
    return json({ ok: true });
  }

  if (!permitidos.includes(origen)) return err('origen', 'Origen no permitido.', 403);
  if (!env.ANTHROPIC_API_KEY) return err('config', 'Falta la clave en el intermediario.', 500);

  // ---- quién eres: código maestro o invitación guardada ----
  const codigo = req.headers.get('x-andalso-codigo') || '';
  let rol = null, inv = null;
  if (env.CODIGO && codigo === env.CODIGO) rol = 'maestro';
  else if (!env.CODIGO && !kv) rol = 'maestro';
  else if (kv && /^[A-Za-z0-9_-]{6,64}$/.test(codigo)) {
    const v = await kv.get('inv:' + codigo);
    if (v) { inv = JSON.parse(v); rol = 'invitado'; }
  }
  if (!rol) return err('codigo', 'Hace falta el enlace de invitación.', 401);
  const cupo = Number(env.CUPO_DIARIO) || 60;
  const claveCupo = 'q:' + hoy() + ':' + codigo;

  if (req.method === 'GET' && ruta === '/yo') {
    const usadas = rol === 'invitado' && kv ? Number(await kv.get(claveCupo)) || 0 : 0;
    return json({ rol, nombre: inv ? inv.nombre : 'tú', usadas, cupo: rol === 'invitado' ? cupo : null });
  }

  // ---- memoria de respuestas por huella del mensaje ----
  const mc = ruta.match(/^\/c\/([a-f0-9]{64})$/);
  if (mc) {
    if (!kv) return sinKV();
    const clave = 'c:' + mc[1];
    if (req.method === 'GET') {
      const v = await kv.get(clave);
      if (!v) return err('no_existe', 'No hay respuesta guardada.', 404);
      const o = JSON.parse(v); o.veces = (o.veces || 1) + 1;
      await kv.put(clave, JSON.stringify(o), { expirationTtl: VIDA_MEMORIA });
      return json(o);
    }
    if (req.method === 'PUT') {
      const txt = await req.text();
      if (txt.length > MAX_PIEZA) return err('grande', 'Demasiado grande.', 413);
      let o; try { o = JSON.parse(txt); if (!o || !o.lectura) throw 0; } catch (e) { return err('peticion', 'No válido.', 400); }
      const prev = await kv.get(clave);
      const veces = prev ? (JSON.parse(prev).veces || 1) : 1;
      await kv.put(clave, JSON.stringify({ lectura: o.lectura, veces, guardada: Date.now() }), { expirationTtl: VIDA_MEMORIA });
      return json({ ok: true, veces });
    }
  }

  // ---- guardar una pieza para el enlace corto ----
  if (req.method === 'POST' && ruta === '/p') {
    if (!kv) return sinKV();
    const txt = await req.text();
    if (txt.length > MAX_PIEZA) return err('grande', 'La pieza es demasiado grande.', 413);
    try { const o = JSON.parse(txt); if (!o || !Array.isArray(o.original) || !o.tramos) throw 0; } catch (e) { return err('peticion', 'Pieza no válida.', 400); }
    const id = nuevoId(9);
    await kv.put('p:' + id, txt, { expirationTtl: VIDA_PIEZA });
    return json({ id });
  }

  // ---- solo el código maestro: invitaciones y estadísticas ----
  if (ruta === '/inv' || ruta === '/inv/borrar' || ruta === '/stats') {
    if (rol !== 'maestro') return err('codigo', 'Solo con el código maestro.', 403);
    if (!kv) return sinKV();
    if (req.method === 'GET' && ruta === '/inv') {
      const l = await kv.list({ prefix: 'inv:' });
      const out = [];
      for (const k of l.keys) {
        const c = k.name.slice(4), v = JSON.parse(await kv.get(k.name) || '{}');
        out.push({ codigo: c, nombre: v.nombre || '', creada: v.creada || '', hoy: Number(await kv.get('q:' + hoy() + ':' + c)) || 0 });
      }
      out.sort((a, b) => (b.creada || '').localeCompare(a.creada || ''));
      return json({ invitaciones: out, cupo });
    }
    if (req.method === 'POST' && ruta === '/inv') {
      let nombre = ''; try { nombre = String((await req.json()).nombre || '').trim().slice(0, 40); } catch (e) {}
      if (!nombre) return err('peticion', 'Pon un nombre para la invitación.', 400);
      const c = nuevoId(12);
      await kv.put('inv:' + c, JSON.stringify({ nombre, creada: new Date().toISOString() }));
      return json({ codigo: c, nombre });
    }
    if (req.method === 'POST' && ruta === '/inv/borrar') {
      let c = ''; try { c = String((await req.json()).codigo || ''); } catch (e) {}
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(c)) return err('peticion', 'Código no válido.', 400);
      await kv.delete('inv:' + c);
      return json({ ok: true });
    }
    if (req.method === 'GET' && ruta === '/stats') {
      const dias = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(Date.now() - i * DIA * 1000).toISOString().slice(0, 10), fila = { dia: d };
        for (const ev of EVENTOS) fila[ev] = Number(await kv.get('e:' + d + ':' + ev)) || 0;
        dias.push(fila);
      }
      return json({ dias });
    }
  }

  if (req.method !== 'POST' || ruta !== '/') return err('peticion', 'Ruta no válida.', 404);

  // ---- llamada a la IA, con cupo por invitación ----
  if (rol === 'invitado' && kv) {
    const usadas = Number(await kv.get(claveCupo)) || 0;
    if (usadas >= cupo) return err('cupo', 'Has llegado al límite de hoy de tu invitación.', 429);
    await kv.put(claveCupo, String(usadas + 1), { expirationTtl: DIA * 2 });
  }
  let cuerpo;
  try { cuerpo = await req.json(); } catch (e) { return err('peticion', 'Petición no válida.', 400); }
  if (!MODELOS.includes(cuerpo.model)) cuerpo.model = MODELOS[0];
  cuerpo.max_tokens = Math.min(Number(cuerpo.max_tokens) || 1000, MAX_TOKENS);
  delete cuerpo.stream;
  if (Array.isArray(cuerpo.tools)) {
    cuerpo.tools = cuerpo.tools
      .filter(t => t && typeof t.type === 'string' && t.type.startsWith('web_search'))
      .map(t => ({ type: t.type, name: 'web_search', max_uses: Math.min(Number(t.max_uses) || 3, MAX_BUSQUEDAS) }));
    if (!cuerpo.tools.length) delete cuerpo.tools;
  }
  if (kv) await sumar(kv, 'e:' + hoy() + ':llamada');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(cuerpo)
  });
  return new Response(r.body, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
}

async function sumar(kv, clave) {
  const n = Number(await kv.get(clave)) || 0;
  await kv.put(clave, String(n + 1), { expirationTtl: DIA * 120 });
}
