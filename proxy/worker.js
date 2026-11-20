// and also · intermediario (Cloudflare Worker)
// Guarda la clave de Anthropic en secreto y deja que la app la use sin enseñarla.
// Variables (en Cloudflare → tu Worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (secreto)  tu clave de Anthropic
//   CODIGO             (secreto)  el código de invitación que va en el enlace
//   ORIGENES           (opcional) webs que pueden usarlo, separadas por comas
const MODELOS = ['claude-sonnet-5-5', 'claude-haiku-5-5'];
const MAX_TOKENS = 6000;
const MAX_BUSQUEDAS = 6;

export default {
  async fetch(req, env) {
    const origen = req.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES || 'https://jrjulvez.github.io').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': permitidos.includes(origen) ? origen : permitidos[0],
      'Access-Control-Allow-Headers': 'content-type, x-andalso-codigo',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (o, status) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: true, servicio: 'and also' }, 200);
    if (!permitidos.includes(origen)) return json({ error: { type: 'origen', message: 'Origen no permitido.' } }, 403);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { type: 'config', message: 'Falta la clave en el intermediario.' } }, 500);
    if (env.CODIGO && req.headers.get('x-andalso-codigo') !== env.CODIGO) {
      return json({ error: { type: 'codigo', message: 'Hace falta el enlace de invitación.' } }, 401);
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
