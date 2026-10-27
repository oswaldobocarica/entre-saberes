// Server-only public projection. Never return raw rows or recovery records.
export function normalizarPublicacao(row) {
  return {
    id: row.id, slug: row.slug, titulo: row.title,
    resumo: row.summary ?? '', autor_nome: row.author_name ?? '',
    status: 'publicado', publicado_em: row.published_at,
    // Editorial type was not preserved in app.publications. Do not invent one.
    tipo: 'publicacao', destaque: false
  };
}
export function inteiroLimitado(value, min, max) {
  if (!['string', 'number'].includes(typeof value) ||
      (typeof value === 'string' && !/^\d+$/.test(value))) {
    throw new RangeError('Parametro numerico invalido.');
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new RangeError('Parametro numerico fora do limite.');
  }
  return n;
}
export function validarFiltroPublicacao({ id, slug } = {}) {
  if ((id !== undefined) === (slug !== undefined)) {
    throw new RangeError('Informe apenas id ou slug.');
  }
  if (id !== undefined && (typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new RangeError('Identificador invalido.');
  }
  if (slug !== undefined && (typeof slug !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(slug))) {
    throw new RangeError('Slug invalido.');
  }
  return { id, slug };
}
export async function listarPublicacoesPublicas(sql, limite = 30, offset = 0) {
  const n = inteiroLimitado(limite, 1, 100);
  const inicio = inteiroLimitado(offset, 0, 10000);
  const rows = await sql`
    SELECT id, slug, title, summary, author_name, published_at
    FROM app.publications
    WHERE lower(status) IN ('publicado', 'published')
      AND published_at IS NOT NULL
      AND published_at <= now()
    ORDER BY published_at DESC, id
    LIMIT ${n} OFFSET ${inicio}
  `;
  return rows.map(normalizarPublicacao);
}
export async function obterPublicacaoPublica(sql, filtro) {
  const { id, slug } = validarFiltroPublicacao(filtro);
  const rows = id !== undefined ? await sql`
    SELECT id, slug, title, summary, body, author_name, published_at
    FROM app.publications
    WHERE id = ${id}::uuid
      AND lower(status) IN ('publicado', 'published')
      AND published_at IS NOT NULL
      AND published_at <= now()
    LIMIT 1
  ` : await sql`
    SELECT id, slug, title, summary, body, author_name, published_at
    FROM app.publications
    WHERE slug = ${slug}
      AND lower(status) IN ('publicado', 'published')
      AND published_at IS NOT NULL
      AND published_at <= now()
    LIMIT 1
  `;
  return rows.length ? { ...normalizarPublicacao(rows[0]), conteudo: rows[0].body ?? '' } : null;
}
