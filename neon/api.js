import { createReadOnlySql } from './database.js';
import { inteiroLimitado, validarFiltroPublicacao, listarPublicacoesPublicas, obterPublicacaoPublica } from './publicacoes.js';
const PREFIX = '/api/public/';
function response(request, data, status = 200, extraHeaders = {}) {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-entre-saberes-backend': 'neon-readonly',
      ...extraHeaders
    }
  });
}
function parameters(url, allowed) {
  const result = {};
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new RangeError('Parametro desconhecido ou repetido.');
    }
    result[key] = url.searchParams.get(key);
  }
  return result;
}
export async function handlePublicApi(request, env, { sqlFactory = createReadOnlySql } = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    return response(request, { code: 'read_only', message: 'Esta API permite somente leitura.' }, 405, { allow: 'GET, HEAD' });
  }
  const route = url.pathname.slice(PREFIX.length);
  if (!['publications', 'publication', 'health'].includes(route)) {
    return response(request, { code: 'not_found', message: 'Rota indisponivel.' }, 404);
  }
  try {
    let options;
    if (route === 'publications') {
      const query = parameters(url, ['limit', 'offset']);
      options = { limit: inteiroLimitado(query.limit ?? 30, 1, 100), offset: inteiroLimitado(query.offset ?? 0, 0, 10000) };
    } else if (route === 'publication') {
      options = validarFiltroPublicacao(parameters(url, ['id', 'slug']));
    } else {
      parameters(url, []);
    }
    if (!env?.NEON_DATABASE_URL) {
      return response(request, { code: 'neon_not_configured', message: 'A conexao de leitura ainda nao foi configurada no servidor.' }, 503);
    }
    const sql = await sqlFactory(env);
    if (route === 'publications') {
      const publications = await listarPublicacoesPublicas(sql, options.limit, options.offset);
      return response(request, { source: 'neon', publications, limit: options.limit, offset: options.offset });
    }
    if (route === 'publication') {
      const publication = await obterPublicacaoPublica(sql, options);
      return publication ? response(request, { source: 'neon', publication }) :
        response(request, { code: 'not_found', message: 'Publicacao nao encontrada.' }, 404);
    }
    const rows = await sql`
      SELECT count(*)::integer AS visible_publications
      FROM app.publications
      WHERE lower(status) IN ('publicado', 'published')
        AND published_at IS NOT NULL AND published_at <= now()
    `;
    const count = Number(rows?.[0]?.visible_publications);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid health result');
    return response(request, { source: 'neon', database_checked: true, read_only: true, publications_count: count });
  } catch (error) {
    if (error instanceof RangeError) {
      return response(request, { code: 'invalid_parameter', message: 'Revise os parametros da consulta.' }, 400);
    }
    if (error?.code === 'neon_not_configured') {
      return response(request, { code: 'neon_not_configured', message: 'A conexao de leitura ainda nao foi configurada no servidor.' }, 503);
    }
    // Do not log or serialize raw database errors: they may contain secrets.
    return response(request, { code: 'database_unavailable', message: 'O acervo esta temporariamente indisponivel. Tente novamente.' }, 502);
  }
}
