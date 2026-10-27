// Browser-only public API client. No database credentials belong in this module.
export function createPublicClient(base = '/api/public', {
  origin = globalThis.location?.origin,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000
} = {}) {
  const endpoint = new URL(base, origin);
  if (endpoint.origin !== origin || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash || endpoint.pathname.replace(/\/$/, '') !== '/api/public') {
    throw new RangeError('Endereco de leitura publica invalido.');
  }
  endpoint.pathname = '/api/public/';
  if (typeof fetchImpl !== 'function' || !Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('Cliente de leitura indisponivel.');
  }
  async function read(route, query, missingIsNull = false) {
    const url = new URL(route, endpoint);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await fetchImpl(url.href, {
        method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store',
        headers: { accept: 'application/json' }, signal: controller.signal
      });
      if (missingIsNull && result.status === 404) return null;
      if (!result.ok) throw new Error(`O acervo nao respondeu corretamente (HTTP ${result.status}).`);
      const data = await result.json();
      if (!data || typeof data !== 'object') throw new Error('Resposta de leitura invalida.');
      return data;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('O tempo de consulta ao acervo foi excedido. Tente novamente.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    async list(limit = 100) {
      if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
        throw new RangeError('Limite deve estar entre 1 e 500.');
      }
      const rows = [];
      while (rows.length < limit) {
        const size = Math.min(100, limit - rows.length);
        const data = await read('publications', { limit: size, offset: rows.length });
        const page = data.publications;
        if (!Array.isArray(page) || page.length > size ||
            page.some(item => !item || typeof item.id !== 'string' || item.status !== 'publicado')) {
          throw new Error('Formato do acervo invalido.');
        }
        rows.push(...page);
        if (page.length < size) break;
      }
      return rows;
    },
    async get({ id, slug } = {}) {
      if ((id !== undefined) === (slug !== undefined)) throw new RangeError('Informe apenas id ou slug.');
      const key = id !== undefined ? 'id' : 'slug';
      const value = id ?? slug;
      if (typeof value !== 'string' || !value || value.length > 200) throw new RangeError('Identificador invalido.');
      const data = await read('publication', { [key]: value }, true);
      if (data === null) return null;
      if (!data.publication || typeof data.publication.id !== 'string' || data.publication.status !== 'publicado') {
        throw new Error('Formato da publicacao invalido.');
      }
      return data.publication;
    }
  };
}
