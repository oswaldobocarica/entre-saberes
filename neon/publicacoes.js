// Entre Saberes: camada de leitura publica Neon (homologacao).
// Nao importar no navegador; executar somente no Cloudflare Worker.
// O cliente SQL sera injetado pelo adaptador seguro do servidor.
export function normalizarPublicacao(row) {
  return {
    id: row.id,
    slug: row.slug,
    titulo: row.title,
    resumo: row.summary ?? '',
    autor_nome: row.author_name ?? '',
    status: 'publicado',
    publicado_em: row.published_at,
    tipo: 'artigo',
    destaque: false
  };
}
export async function listarPublicacoesPublicas(sql, limite = 30) {
  const n = Number(limite);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new RangeError('Limite deve estar entre 1 e 100');
  }
  // Identificadores e filtro estaticos; n e parametro, nunca interpolado em SQL.
  const rows = await sql`
    SELECT id, slug, title, summary, author_name, published_at
    FROM app.publications
    WHERE lower(status) IN ('publicado', 'published')
      AND published_at IS NOT NULL
      AND published_at <= now()
    ORDER BY published_at DESC, id
    LIMIT ${n}
  `;
  return rows.map(normalizarPublicacao);
}
