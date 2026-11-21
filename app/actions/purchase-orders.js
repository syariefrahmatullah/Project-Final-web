"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne, withTransaction } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { nextNumber, todayISO } from "@/lib/stock";
import { guarded, str, int, parseItems, saveImage, UserError } from "@/lib/action-utils";

async function loadPO(id) {
  const po = await queryOne(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
  if (!po) throw new UserError("PO tidak ditemukan.");
  return po;
}

function mustBe(po, ...statuses) {
  if (!statuses.includes(po.status)) {
    throw new UserError(`Aksi tidak dapat dilakukan: status PO saat ini "${po.status}".`);
  }
}

/* 1. Warehouse Manager membuat PO (status awal Pending) */
export async function createPOAction(_prev, fd) {
  const result = await guarded(async () => {
    const user = await assertRole("manager");
    const supplier_id = int(fd, "supplier_id");
    const expected_date = str(fd, "expected_date");
    const notes = str(fd, "notes") || null;
    if (!Number.isInteger(supplier_id)) throw new UserError("Pilih Supplier.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expected_date)) throw new UserError("Isi expected delivery date.");
    if (expected_date < todayISO()) throw new UserError("Expected delivery date tidak boleh sebelum hari ini.");
    const items = parseItems(fd);

    const supplier = await queryOne(
      `SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'approved'`,
      [supplier_id]
    );
    if (!supplier) throw new UserError("Supplier tidak valid atau belum disetujui Admin.");

    const id = await withTransaction(async (c) => {
      const po_number = await nextNumber(c, "PO", "purchase_orders", "po_number");
      const { rows } = await c.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, notes, created_by)
         VALUES ($1,$2,CURRENT_DATE,$3,$4,$5) RETURNING id`,
        [po_number, supplier_id, expected_date, notes, user.id]
      );
      for (const it of items) {
        await c.query(
          `INSERT INTO po_items (po_id, product_id, quantity) VALUES ($1,$2,$3)`,
          [rows[0].id, it.product_id, it.quantity]
        );
      }
      return rows[0].id;
    });
    revalidatePath("/", "layout");
    return { id };
  });
  if (result.error) return result;
  redirect(`/purchase-orders/${result.id}`);
}

/* 2. Supplier: Confirmed */
export async function confirmPOAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("supplier");
    const po = await loadPO(int(fd, "id"));
    if (po.supplier_id !== user.id) throw new UserError("PO ini bukan milik Anda.");
    mustBe(po, "pending");
    await query(`UPDATE purchase_orders SET status = 'confirmed' WHERE id = $1`, [po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 2. Supplier: Rejected (alasan wajib) */
export async function rejectPOAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("supplier");
    const po = await loadPO(int(fd, "id"));
    if (po.supplier_id !== user.id) throw new UserError("PO ini bukan milik Anda.");
    mustBe(po, "pending");
    const reason = str(fd, "reason");
    if (!reason) throw new UserError("Alasan penolakan wajib diisi.");
    await query(`UPDATE purchase_orders SET status = 'rejected', reason = $1 WHERE id = $2`, [reason, po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 3. Supplier: barang dikirim -> In Transit (bukan oleh Manager) */
export async function shipPOAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("supplier");
    const po = await loadPO(int(fd, "id"));
    if (po.supplier_id !== user.id) throw new UserError("PO ini bukan milik Anda.");
    mustBe(po, "confirmed");
    await query(`UPDATE purchase_orders SET status = 'in_transit' WHERE id = $1`, [po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 4. Supplier menyerahkan foto bukti kedatangan (saat In Transit / tiba) */
export async function uploadProofAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("supplier");
    const po = await loadPO(int(fd, "id"));
    if (po.supplier_id !== user.id) throw new UserError("PO ini bukan milik Anda.");
    mustBe(po, "in_transit");
    const name = await saveImage(fd.get("photo"));
    await query(`UPDATE purchase_orders SET proof_photo = $1 WHERE id = $2`, [name, po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 4. Manager memulai pemeriksaan -> Inspecting (butuh bukti foto) */
export async function startInspectionAction(_prev, fd) {
  return guarded(async () => {
    await assertRole("manager");
    const po = await loadPO(int(fd, "id"));
    mustBe(po, "in_transit");
    if (!po.proof_photo) {
      throw new UserError("Bukti foto kedatangan dari Supplier belum diunggah.");
    }
    await query(`UPDATE purchase_orders SET status = 'inspecting' WHERE id = $1`, [po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* 4. Staff Gudang membuat laporan pemeriksaan fisik */
export async function submitInspectionAction(_prev, fd) {
  return guarded(async () => {
    const user = await assertRole("staff");
    const po = await loadPO(int(fd, "id"));
    mustBe(po, "inspecting");
    const verdict = str(fd, "verdict");
    const notes = str(fd, "notes");
    if (!["match", "mismatch"].includes(verdict)) throw new UserError("Pilih hasil pemeriksaan.");
    if (!notes) throw new UserError("Catatan pemeriksaan (jumlah & kondisi) wajib diisi.");
    const active = await queryOne(
      `SELECT 1 FROM incoming_transactions WHERE po_id = $1 AND status <> 'rejected'`,
      [po.id]
    );
    if (active) throw new UserError("PO ini sudah memiliki Incoming Transaction aktif.");
    await query(
      `INSERT INTO inspection_reports (po_id, staff_id, is_match, notes) VALUES ($1,$2,$3,$4)`,
      [po.id, user.id, verdict === "match", notes]
    );
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* Skenario 2: Manager menolak penerimaan -> Returned (alasan wajib), stok tetap */
export async function returnPOAction(_prev, fd) {
  return guarded(async () => {
    await assertRole("manager");
    const po = await loadPO(int(fd, "id"));
    mustBe(po, "inspecting");
    const reason = str(fd, "reason");
    if (!reason) throw new UserError("Alasan retur wajib diisi.");
    const last = await queryOne(
      `SELECT is_match FROM inspection_reports WHERE po_id = $1 ORDER BY id DESC LIMIT 1`,
      [po.id]
    );
    if (!last) throw new UserError("Belum ada laporan pemeriksaan dari Staff Gudang.");
    if (last.is_match) throw new UserError("Laporan terakhir menyatakan barang sesuai. Retur tidak dapat dilakukan.");
    const active = await queryOne(
      `SELECT 1 FROM incoming_transactions WHERE po_id = $1 AND status <> 'rejected'`,
      [po.id]
    );
    if (active) throw new UserError("Masih ada Incoming Transaction aktif untuk PO ini.");
    await query(`UPDATE purchase_orders SET status = 'returned', reason = $1 WHERE id = $2`, [reason, po.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/* Tindak lanjut Returned: Manager mengajukan klaim refund ke Supplier */
export async function claimRefundAction(_prev, fd) {
  return guarded(async () => {
    await assertRole("manager");
    const po = await loadPO(int(fd, "id"));
    mustBe(po, "returned");
    const note = str(fd, "note");
    if (!note) throw new UserError("Isi keterangan klaim refund.");
    await query(
      `UPDATE purchase_orders SET refund_claim = $1, refund_claimed_at = now() WHERE id = $2`,
      [note, po.id]
    );
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
