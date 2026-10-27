// Isolated preview only. The production entrypoint remains _worker.js.
import { handlePublicApi } from './api.js';
const CONFIG = { publicApiBase: '/api/public', publicDataSource: 'neon', readOnly: true };
function reply(request, text, status = 200, type = 'text/plain; charset=utf-8') {
  return new Response(request.method === 'HEAD' ? null : text, {
    status, headers: { 'content-type': type, 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow, noarchive' }
  });
}
function privateAsset(path) {
  let decoded = path;
  try { for (let i = 0; i < 2; i++) decoded = decodeURIComponent(decoded); } catch { return true; }
  return /[\x00-\x1f%]/.test(decoded) || /(^|\/)\./.test(decoded) ||
    /^\/(admin|neon|tests|docs|scripts|sql|supabase|node_modules|backup|backups|private|_private|historico|docling)(\/|$)/i.test(decoded) ||
    /^\/(?:_worker[^/]*|wrangler[^/]*|package(?:-lock)?\.json)$/i.test(decoded) ||
    /\.(?:sql|log|zip|map|db|sqlite|bak|pem|key|crt|ya?ml|toml)$/i.test(decoded);
}
export async function fetchPreview(request, env) {
  const url = new URL(request.url);
  if (['oswaldobocarica.com.br', 'www.oswaldobocarica.com.br'].includes(url.hostname)) {
    return reply(request, 'Este Worker e exclusivo de homologacao. A configuracao de producao nao deve ser substituida.', 503);
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return reply(request, 'Homologacao somente de leitura.', 405);
  }
  const api = await handlePublicApi(request, env);
  if (api) {
    api.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    return api;
  }
  if (url.pathname === '/config.js') {
    return reply(request, 'window.ENTRE_SABERES_CONFIG = ' + JSON.stringify(CONFIG) + ';\n', 200, 'application/javascript; charset=utf-8');
  }
  if (url.pathname === '/direct-edit.js') {
    return reply(request, '// Edicao desabilitada nesta homologacao somente de leitura.\n', 200, 'application/javascript; charset=utf-8');
  }
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/')) {
    return reply(request, 'Administracao, matriculas e gravacoes ainda nao foram migradas. Esta homologacao valida apenas a leitura publica.', 503);
  }
  if (privateAsset(url.pathname)) return reply(request, 'Nao encontrado.', 404);
  if (!env?.ASSETS?.fetch) return reply(request, 'Arquivos da homologacao indisponiveis.', 503);
  const asset = await env.ASSETS.fetch(request);
  const headers = new Headers(asset.headers);
  headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
}
export default { fetch: fetchPreview };
