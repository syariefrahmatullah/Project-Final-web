"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { guarded, str, int, UserError } from "@/lib/action-utils";

const MASTER_ROLES = ["admin", "manager"];

/* ---------------- Kategori ---------------- */

export async function saveCategoryAction(_prev, fd) {
  return guarded(async () => {
    await assertRole(...MASTER_ROLES);
    const id = int(fd, "id");
    const name = str(fd, "name");
    if (!name) throw new UserError("Nama kategori wajib diisi.");
    const dup = await queryOne(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id IS DISTINCT FROM $2`,
      [name, Number.isInteger(id) ? id : null]
    );
    if (dup) throw new UserError("Nama kategori sudah ada (harus unik).");
    if (Number.isInteger(id)) {
      await query(`UPDATE categories SET name = $1 WHERE id = $2`, [name, id]);
    } else {
      await query(`INSERT INTO categories (name) VALUES ($1)`, [name]);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Kategori tersimpan." };
  });
}

export async function deleteCategoryAction(_prev, fd) {
  return guarded(async () => {
    await assertRole(...MASTER_ROLES);
    const id = int(fd, "id");
    const used = await queryOne(`SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1`, [id]);
    if (used.n > 0) {
      throw new UserError(`Kategori tidak bisa dihapus karena masih memiliki ${used.n} produk.`);
    }
    await query(`DELETE FROM categories WHERE id = $1`, [id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* ---------------- Produk ---------------- */

function readProduct(fd) {
  const p = {
    name: str(fd, "name"),
    category_id: int(fd, "category_id"),
    unit: str(fd, "unit") || "pcs",
    price: Number(fd.get("price")),
    min_stock: int(fd, "min_stock"),
    low_stock: int(fd, "low_stock"),
    description: str(fd, "description") || null,
  };
  if (!p.name) throw new UserError("Nama produk wajib diisi.");
  if (!Number.isInteger(p.category_id)) throw new UserError("Pilih kategori.");
  if (!(p.price >= 0)) throw new UserError("Harga tidak valid.");
  if (!Number.isInteger(p.min_stock) || p.min_stock < 0) throw new UserError("Stok minimum tidak valid.");
  if (!Number.isInteger(p.low_stock) || p.low_stock < 0) throw new UserError("Stok Low tidak valid.");
  if (p.low_stock <= p.min_stock) throw new UserError("Stok Low harus lebih besar dari Stok Minimum.");
  return p;
}

export async function createProductAction(_prev, fd) {
  const result = await guarded(async () => {
    await assertRole(...MASTER_ROLES);
    const sku = str(fd, "sku").toUpperCase();
    if (!sku) throw new UserError("SKU wajib diisi.");
    const p = readProduct(fd);
    const dup = await queryOne(`SELECT 1 FROM products WHERE sku = $1`, [sku]);
    if (dup) throw new UserError("SKU sudah dipakai produk lain (harus unik).");
    // Stok awal selalu 0; stok hanya berubah lewat Incoming/Outgoing.
    await query(
      `INSERT INTO products (sku, name, category_id, unit, price, stock, min_stock, low_stock, description)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8)`,
      [sku, p.name, p.category_id, p.unit, p.price, p.min_stock, p.low_stock, p.description]
    );
    revalidatePath("/", "layout");
    return { ok: true };
  });
  if (result.error) return result;
  redirect("/products");
}

// SKU tidak ikut di-update: kolom lain boleh diubah, SKU tidak.
export async function updateProductAction(_prev, fd) {
  const result = await guarded(async () => {
    await assertRole(...MASTER_ROLES);
    const id = int(fd, "id");
    const p = readProduct(fd);
    const rows = await query(
      `UPDATE products SET name=$1, category_id=$2, unit=$3, price=$4,
              min_stock=$5, low_stock=$6, description=$7 WHERE id=$8 RETURNING id`,
      [p.name, p.category_id, p.unit, p.price, p.min_stock, p.low_stock, p.description, id]
    );
    if (!rows.length) throw new UserError("Produk tidak ditemukan.");
    revalidatePath("/", "layout");
    return { ok: true };
  });
  if (result.error) return result;
  redirect("/products");
}

export async function deleteProductAction(_prev, fd) {
  return guarded(async () => {
    await assertRole(...MASTER_ROLES);
    const id = int(fd, "id");
    const p = await queryOne(`SELECT id, name, stock FROM products WHERE id = $1`, [id]);
    if (!p) throw new UserError("Produk tidak ditemukan.");
    // Peringatan: produk yang masih punya stok harus dikonfirmasi dulu.
    if (p.stock > 0 && fd.get("confirm_stock") !== "yes") {
      throw new UserError(`Peringatan: "${p.name}" masih memiliki stok ${p.stock}. Konfirmasi penghapusan terlebih dahulu.`);
    }
    try {
      await query(`DELETE FROM products WHERE id = $1`, [id]);
    } catch (e) {
      if (e.code === "23503") {
        throw new UserError("Produk sudah dipakai pada PO/transaksi sehingga tidak dapat dihapus.");
      }
      throw e;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* ---------------- Verifikasi Supplier (Admin) ---------------- */

export async function verifySupplierAction(_prev, fd) {
  return guarded(async () => {
    await assertRole("admin");
    const id = int(fd, "id");
    const decision = str(fd, "decision");
    const reason = str(fd, "reason");
    if (!["approved", "rejected"].includes(decision)) throw new UserError("Keputusan tidak valid.");
    if (decision === "rejected" && !reason) throw new UserError("Alasan penolakan wajib diisi.");
    const rows = await query(
      `UPDATE users SET supplier_status = $1, reject_reason = $2
        WHERE id = $3 AND role = 'supplier' RETURNING id`,
      [decision, decision === "rejected" ? reason : null, id]
    );
    if (!rows.length) throw new UserError("Supplier tidak ditemukan.");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
