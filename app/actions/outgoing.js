"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne, withTransaction } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { nextNumber } from "@/lib/stock";
import { guarded, str, int, parseItems, UserError } from "@/lib/action-utils";

// Validasi: kuantitas tidak boleh melebihi stok tersedia saat ini.
async function assertStock(client, items) {
  for (const it of items) {
    const { rows } = await client.query(`SELECT name, stock FROM products WHERE id = $1`, [it.product_id]);
    if (!rows[0]) throw new UserError("Produk tidak ditemukan.");
    if (it.quantity > rows[0].stock) {
      throw new UserError(
        `Kuantitas "${rows[0].name}" (${it.quantity}) melebihi stok tersedia (${rows[0].stock}).`
      );
    }
  }
}

function readHeader(fd) {
  const ship_date = str(fd, "ship_date");
  const customer = str(fd, "customer");
  const notes = str(fd, "notes") || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ship_date)) throw new UserError("Isi tanggal pengiriman.");
  if (!customer) throw new UserError("Nama customer/tujuan wajib diisi.");
  return { ship_date, customer, notes };
}

/* 1. Staff mengajukan barang keluar (Pending). Stok belum berubah. */
export async function createOutgoingAction(_prev, fd) {
  const result = await guarded(async () => {
    const user = await assertRole("staff");
    const h = readHeader(fd);
    const items = parseItems(fd);
    const id = await withTransaction(async (c) => {
      await assertStock(c, items);
      const trx = await nextNumber(c, "OUT", "outgoing_transactions", "trx_number");
      const { rows } = await c.query(
        `INSERT INTO outgoing_transactions (trx_number, ship_date, customer, notes, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [trx, h.ship_date, h.customer, h.notes, user.id]
      );
      for (const it of items) {
        await c.query(
          `INSERT INTO outgoing_items (outgoing_id, product_id, quantity) VALUES ($1,$2,$3)`,
          [rows[0].id, it.product_id, it.quantity]
        );
      }
      return rows[0].id;
    });
    revalidatePath("/", "layout");
    return { id };
  });
  if (result.error) return result;
  redirect(`/outgoing/${result.id}`);
}

/* Selama Pending, Staff pembuatnya masih bisa mengedit */
export async function updateOutgoingAction(_prev, fd) {
  const result = await guarded(async () => {
    const user = await assertRole("staff");
    const id = int(fd, "id");
    const h = readHeader(fd);
    const items = parseItems(fd);
    await withTransaction(async (c) => {
      const { rows } = await c.query(`SELECT * FROM outgoing_transactions WHERE id = $1 FOR UPDATE`, [id]);
      const trx = rows[0];
      if (!trx) throw new UserError("Transaksi tidak ditemukan.");
      if (trx.created_by !== user.id) throw new UserError("Hanya pembuat transaksi yang dapat mengedit.");
      if (trx.status !== "pending") throw new UserError("Transaksi hanya bisa diedit saat berstatus Pending.");
      await assertStock(c, items);
      await c.query(
        `UPDATE outgoing_transactions SET ship_date=$1, customer=$2, notes=$3 WHERE id=$4`,
        [h.ship_date, h.customer, h.notes, id]
      );
      await c.query(`DELETE FROM outgoing_items WHERE outgoing_id = $1`, [id]);
      for (const it of items) {
        await c.query(
          `INSERT INTO outgoing_items (outgoing_id, product_id, quantity) VALUES ($1,$2,$3)`,
          [id, it.product_id, it.quantity]
        );
      }
    });
    revalidatePath("/", "layout");
    return { id };
  });
  if (result.error) return result;
  redirect(`/outgoing/${result.id}`);
}

export async function deleteOutgoingAction(_prev, fd) {
  const result = await guarded(async () => {
    const user = await assertRole("staff");
    const id = int(fd, "id");
    const trx = await queryOne(`SELECT created_by, status FROM outgoing_transactions WHERE id = $1`, [id]);
    if (!trx) throw new UserError("Transaksi tidak ditemukan.");
    if (trx.created_by !== user.id) throw new UserError("Hanya pembuat transaksi yang dapat menghapus.");
    if (trx.status !== "pending") throw new UserError("Transaksi hanya bisa dihapus saat berstatus Pending.");
    await query(`DELETE FROM outgoing_transactions WHERE id = $1`, [id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
  if (result.error) return result;
  redirect("/outgoing");
}

/* 2. Manager: Approved - stok divalidasi ulang di dalam transaksi */
export async function approveOutgoingAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("manager");
    const id = int(fd, "id");
    // Fix Bug #4: Gunakan withTransaction + FOR UPDATE untuk cegah race condition.
    // Dua Manager tidak bisa approve outgoing produk yang sama secara bersamaan.
    await withTransaction(async (c) => {
      const { rows } = await c.query(
        `SELECT * FROM outgoing_transactions WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const trx = rows[0];
      if (!trx) throw new UserError("Transaksi tidak ditemukan.");
      if (trx.status !== "pending") throw new UserError("Hanya transaksi Pending yang dapat disetujui.");
      // Validasi stok ulang di dalam transaksi (stok bisa berubah sejak pengajuan)
      const items = (await c.query(
        `SELECT product_id, quantity FROM outgoing_items WHERE outgoing_id = $1`,
        [id]
      )).rows;
      for (const it of items) {
        const p = (await c.query(
          `SELECT name, stock FROM products WHERE id = $1 FOR UPDATE`,
          [it.product_id]
        )).rows[0];
        if (!p) throw new UserError("Produk tidak ditemukan.");
        if (it.quantity > p.stock) {
          throw new UserError(
            `Stok "${p.name}" tidak mencukupi (tersedia ${p.stock}, dibutuhkan ${it.quantity}). Transaksi tidak dapat disetujui.`
          );
        }
      }
      await c.query(
        `UPDATE outgoing_transactions SET status='approved', reviewed_by=$1 WHERE id=$2`,
        [user.id, id]
      );
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 2. Manager: Rejected (alasan wajib). Selesai, stok tetap. */
export async function rejectOutgoingAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("manager");
    const id = int(fd, "id");
    const reason = str(fd, "reason");
    if (!reason) throw new UserError("Alasan penolakan wajib diisi.");
    const trx = await queryOne(`SELECT status FROM outgoing_transactions WHERE id = $1`, [id]);
    if (!trx) throw new UserError("Transaksi tidak ditemukan.");
    if (trx.status !== "pending") throw new UserError("Hanya transaksi Pending yang dapat ditolak.");
    await query(
      `UPDATE outgoing_transactions SET status='rejected', reason=$1, reviewed_by=$2 WHERE id=$3`,
      [reason, user.id, id]
    );
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 3. Staff packing lalu tekan Kirim Barang: stok berkurang & transaksi selesai */
export async function shipOutgoingAction(_prev, fd) {
  return guarded(async () => {
    await assertRole("staff");
    const id = int(fd, "id");
    await withTransaction(async (c) => {
      const { rows } = await c.query(`SELECT * FROM outgoing_transactions WHERE id = $1 FOR UPDATE`, [id]);
      const trx = rows[0];
      if (!trx) throw new UserError("Transaksi tidak ditemukan.");
      if (trx.status !== "approved") throw new UserError("Hanya transaksi Approved yang dapat dikirim.");
      const items = (await c.query(`SELECT product_id, quantity FROM outgoing_items WHERE outgoing_id = $1`, [id])).rows;
      for (const it of items) {
        const p = (await c.query(`SELECT name, stock FROM products WHERE id = $1 FOR UPDATE`, [it.product_id])).rows[0];
        if (it.quantity > p.stock) {
          throw new UserError(`Stok "${p.name}" tidak cukup (tersedia ${p.stock}, dibutuhkan ${it.quantity}).`);
        }
        await c.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [it.quantity, it.product_id]);
      }
      await c.query(`UPDATE outgoing_transactions SET status = 'shipped' WHERE id = $1`, [id]);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
