"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { queryOne, withTransaction } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { nextNumber } from "@/lib/stock";
import { guarded, str, int, UserError } from "@/lib/action-utils";

/* Skenario 1: Staff membuat Incoming Transaction (Pending) dari PO berstatus Inspecting */
export async function createIncomingAction(_prev, fd) {
  const result = await guarded(async () => {
    const user = await assertRole("staff");
    const po_id = int(fd, "po_id");
    const receive_date = str(fd, "receive_date");
    const notes = str(fd, "notes") || null;
    if (!Number.isInteger(po_id)) throw new UserError("Pilih Nomor PO.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receive_date)) throw new UserError("Isi tanggal penerimaan.");

    const po = await queryOne(`SELECT id, status FROM purchase_orders WHERE id = $1`, [po_id]);
    if (!po) throw new UserError("PO tidak ditemukan.");
    if (po.status !== "inspecting") throw new UserError("Hanya PO berstatus Inspecting yang dapat diterima.");

    const last = await queryOne(
      `SELECT is_match FROM inspection_reports WHERE po_id = $1 ORDER BY id DESC LIMIT 1`,
      [po_id]
    );
    if (!last) throw new UserError("Buat laporan pemeriksaan fisik terlebih dahulu.");
    if (!last.is_match) throw new UserError("Laporan pemeriksaan menyatakan barang tidak sesuai.");

    const id = await withTransaction(async (c) => {
      const dup = await c.query(
        `SELECT 1 FROM incoming_transactions WHERE po_id = $1 AND status <> 'rejected'`,
        [po_id]
      );
      if (dup.rowCount) {
        throw new UserError("Nomor PO ini sudah dipakai Incoming Transaction lain yang tidak berstatus Rejected.");
      }
      const trx = await nextNumber(c, "IN", "incoming_transactions", "trx_number");
      const { rows } = await c.query(
        `INSERT INTO incoming_transactions (trx_number, po_id, receive_date, notes, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [trx, po_id, receive_date, notes, user.id]
      );
      return rows[0].id;
    });
    revalidatePath("/", "layout");
    return { id };
  });
  if (result.error) return result;
  redirect(`/incoming/${result.id}`);
}

/* Manager Approved: stok bertambah + PO otomatis Received dalam satu transaksi database */
export async function approveIncomingAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("manager");
    const id = int(fd, "id");
    await withTransaction(async (c) => {
      const { rows } = await c.query(
        `SELECT * FROM incoming_transactions WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const trx = rows[0];
      if (!trx) throw new UserError("Transaksi tidak ditemukan.");
      if (trx.status !== "pending") throw new UserError("Hanya transaksi Pending yang dapat disetujui.");

      const po = (await c.query(`SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`, [trx.po_id])).rows[0];
      if (po.status !== "inspecting") throw new UserError("Status PO bukan Inspecting.");

      const items = (await c.query(`SELECT product_id, quantity FROM po_items WHERE po_id = $1`, [po.id])).rows;
      for (const it of items) {
        await c.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [it.quantity, it.product_id]);
      }
      await c.query(
        `UPDATE incoming_transactions SET status = 'approved', reviewed_by = $1 WHERE id = $2`,
        [user.id, id]
      );
      await c.query(`UPDATE purchase_orders SET status = 'received' WHERE id = $1`, [po.id]);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* Manager Rejected (alasan wajib): stok tidak bertambah */
export async function rejectIncomingAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("manager");
    const id = int(fd, "id");
    const reason = str(fd, "reason");
    if (!reason) throw new UserError("Alasan penolakan wajib diisi.");
    const trx = await queryOne(`SELECT status FROM incoming_transactions WHERE id = $1`, [id]);
    if (!trx) throw new UserError("Transaksi tidak ditemukan.");
    if (trx.status !== "pending") throw new UserError("Hanya transaksi Pending yang dapat ditolak.");
    await queryOne(
      `UPDATE incoming_transactions SET status = 'rejected', reason = $1, reviewed_by = $2 WHERE id = $3 RETURNING id`,
      [reason, user.id, id]
    );
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
