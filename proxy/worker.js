// and also · intermediario (Cloudflare Worker)
// Guarda la clave de Anthropic en secreto y deja que la app la use sin enseñarla.
// Variables (en Cloudflare → tu Worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (secreto)  tu clave de Anthropic
//   CODIGO             (secreto)  el código de invitación que va en el enlace
//   ORIGENES           (opcional) webs que pueden usarlo, separadas por comas
// Almacén para los enlaces cortos (Settings → Bindings → KV namespace):
//   PIEZAS             un espacio KV donde se guardan las piezas compartidas
const MODELOS = ['claude-sonnet-5-5', 'claude-haiku-5-5'];
const MAX_TOKENS = 6000;
const MAX_BUSQUEDAS = 6;
const MAX_PIEZA = 60000;            // bytes por pieza guardada
const VIDA_PIEZA = 60 * 60 * 24 * 365; // un año
const ALFABETO = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nuevoId = () => { const b = crypto.getRandomValues(new Uint8Array(9)); return Array.from(b, x => ALFABETO[x % ALFABETO.length]).join(''); };

export default {
  async fetch(req, env) {
    const origen = req.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES || 'https://jrjulvez.github.io').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': permitidos.includes(origen) ? origen : permitidos[0],
      'Access-Control-Allow-Headers': 'content-type, x-andalso-codigo',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (o, status) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

    const ruta = new URL(req.url).pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // leer una pieza compartida: GET /p/<id> (público: quien tiene el enlace la ve)
    const mp = ruta.match(/^\/p\/([A-Za-z0-9]{6,16})$/);
    if (req.method === 'GET' && mp) {
      if (!env.PIEZAS) return json({ error: { type: 'sin_almacen', message: 'Falta el almacén de piezas.' } }, 501);
      const v = await env.PIEZAS.get('p:' + mp[1]);
      if (!v) return json({ error: { type: 'no_existe', message: 'Esta pieza no existe o ha caducado.' } }, 404);
      return new Response(v, { status: 200, headers: { ...cors, 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
    }
    if (req.method !== 'POST') return json({ ok: true, servicio: 'and also', enlaces_cortos: !!env.PIEZAS }, 200);
    if (!permitidos.includes(origen)) return json({ error: { type: 'origen', message: 'Origen no permitido.' } }, 403);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { type: 'config', message: 'Falta la clave en el intermediario.' } }, 500);
    if (env.CODIGO && req.headers.get('x-andalso-codigo') !== env.CODIGO) {
      return json({ error: { type: 'codigo', message: 'Hace falta el enlace de invitación.' } }, 401);
    }

    // guardar una pieza: POST /p (solo con invitación)
    if (ruta === '/p') {
      if (!env.PIEZAS) return json({ error: { type: 'sin_almacen', message: 'Falta el almacén de piezas.' } }, 501);
      const txt = await req.text();
      if (txt.length > MAX_PIEZA) return json({ error: { type: 'grande', message: 'La pieza es demasiado grande.' } }, 413);
      try { const o = JSON.parse(txt); if (!o || !Array.isArray(o.original) || !o.tramos) throw 0; } catch (e) { return json({ error: { type: 'peticion', message: 'Pieza no válida.' } }, 400); }
      const id = nuevoId();
      await env.PIEZAS.put('p:' + id, txt, { expirationTtl: VIDA_PIEZA });
      return json({ id }, 200);
    }

    let cuerpo;
    try { cuerpo = await req.json(); } catch (e) { return json({ error: { type: 'peticion', message: 'Petición no válida.' } }, 400); }

    // límites para que nadie pueda gastar de más con tu clave
    if (!MODELOS.includes(cuerpo.model)) cuerpo.model = MODELOS[0];
    cuerpo.max_tokens = Math.min(Number(cuerpo.max_tokens) || 1000, MAX_TOKENS);
    delete cuerpo.stream;
    if (Array.isArray(cuerpo.tools)) {
      cuerpo.tools = cuerpo.tools
        .filter(t => t && typeof t.type === 'string' && t.type.startsWith('web_search'))
        .map(t => ({ type: t.type, name: 'web_search', max_uses: Math.min(Number(t.max_uses) || 3, MAX_BUSQUEDAS) }));
      if (!cuerpo.tools.length) delete cuerpo.tools;
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(cuerpo)
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  }
};
