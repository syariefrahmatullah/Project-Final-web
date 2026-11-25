import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Error yang pesannya aman ditampilkan ke pengguna.
export class UserError extends Error {}

const LONG_FIELDS = ["notes", "description", "address", "reason", "note"];
const MAX_LEN = { sku: 60, name: 120, unit: 30, phone: 40, email: 160, company: 160, customer: 160 };

export function str(fd, key) {
  const v = String(fd.get(key) ?? "").trim();
  const max = LONG_FIELDS.includes(key) ? 1000 : MAX_LEN[key] ?? 255;
  if (v.length > max) {
    throw new UserError(`Isian "${key}" terlalu panjang (maksimal ${max} karakter).`);
  }
  return v;
}

export function int(fd, key) {
  const raw = fd.get(key);
  if (raw === null || String(raw).trim() === "") return NaN;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
}

// Baca baris item dari form: product_id[] dan quantity[] (baris kosong diabaikan)
export function parseItems(fd) {
  const ids = fd.getAll("product_id");
  const qtys = fd.getAll("quantity");
  const items = [];
  ids.forEach((pid, i) => {
    if (pid === "" || pid == null) return;
    const product_id = Number(pid);
    const quantity = Number(qtys[i]);
    if (!Number.isInteger(product_id)) throw new UserError("Produk tidak valid.");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new UserError("Kuantitas harus berupa bilangan bulat lebih dari 0.");
    }
    items.push({ product_id, quantity });
  });
  if (items.length === 0) throw new UserError("Tambahkan minimal satu produk.");
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.product_id)) throw new UserError("Produk yang sama tidak boleh dipilih dua kali.");
    seen.add(it.product_id);
  }
  return items;
}

const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export async function saveImage(file) {
  if (!file || typeof file === "string" || file.size === 0) {
    throw new UserError("Pilih file foto terlebih dahulu.");
  }
  const ext = ALLOWED[file.type];
  if (!ext) throw new UserError("Format foto harus JPG, PNG, atau WEBP.");
  if (file.size > 5 * 1024 * 1024) throw new UserError("Ukuran foto maksimal 5 MB.");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

// Bungkus action: UserError -> {error}, error lain disamarkan.
export async function guarded(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    // Biarkan redirect() milik Next.js lolos
    if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
    // Pesan dari assertRole (sesi/hak akses)
    if (e?.message && /hak akses|Sesi berakhir|belum disetujui/.test(e.message)) return { error: e.message };
    console.error(e);
    return { error: "Terjadi kesalahan pada server. Coba lagi." };
  }
}
