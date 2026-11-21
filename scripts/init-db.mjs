// Menjalankan database/warehouse.sql ke PostgreSQL.
// Pemakaian: npm run db:init   (butuh DATABASE_URL di .env.local)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Baca .env.local secara manual (tanpa dependensi tambahan)
for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.local.");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(root, "database", "warehouse.sql"), "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(sql);
  console.log("Database siap. Akun contoh (password: password123):");
  console.log("  admin@gudanglps.test | manager@gudanglps.test | staff@gudanglps.test | supplier@gudanglps.test");
} catch (err) {
  console.error("Gagal menjalankan warehouse.sql:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
