const { sql } = require('@vercel/postgres');

let _tableReady = false;
async function ensureTable() {
  if (_tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_data (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  _tableReady = true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // If database is not configured yet, return empty gracefully
  if (!process.env.POSTGRES_URL) return res.json({});

  try {
    await ensureTable();

    const { key } = req.query;
    if (key) {
      const { rows } = await sql`SELECT value FROM site_data WHERE key = ${key}`;
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ value: rows[0].value });
    }

    const { rows } = await sql`SELECT key, value FROM site_data ORDER BY updated_at DESC`;
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    return res.json(result);
  } catch (err) {
    console.error('[read]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
