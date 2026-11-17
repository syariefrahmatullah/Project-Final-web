import pg from "pg";

// pg mengembalikan NUMERIC sebagai string; ubah ke angka.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// DATE (1082) dibiarkan sebagai string "YYYY-MM-DD" agar bebas masalah zona waktu.
pg.types.setTypeParser(1082, (v) => v);

const globalForPg = globalThis;

export const pool =
  globalForPg.__pgPool ||
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.__pgPool = pool;

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] || null;
}

// Jalankan beberapa query dalam satu transaksi database.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
