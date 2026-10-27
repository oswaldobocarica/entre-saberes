// This module must never be served as a browser asset.
function invalidConfiguration() {
  const error = new Error('Conexao Neon nao configurada no servidor.');
  error.code = 'neon_not_configured';
  return error;
}
export async function createReadOnlySql(env, driverFactory) {
  const connectionString = env?.NEON_DATABASE_URL;
  let url;
  try { url = new URL(connectionString); } catch { throw invalidConfiguration(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname.endsWith('.neon.tech') || !url.username || !url.password ||
      url.pathname !== '/neondb' || url.hash ||
      (env.NEON_EXPECTED_HOST && url.hostname !== env.NEON_EXPECTED_HOST)) {
    throw invalidConfiguration();
  }
  const factory = driverFactory ?? (await import('@neondatabase/serverless')).neon;
  const driver = factory(connectionString);
  // New signal per query: a reused client must not inherit an expired timeout.
  return async (strings, ...params) => {
    const [rows] = await driver.transaction([driver(strings, ...params)], {
      readOnly: true,
      fetchOptions: { signal: AbortSignal.timeout(10000), redirect: 'error' }
    });
    return rows;
  };
}
