import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/stock";
import { createIncomingAction } from "@/app/actions/incoming";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Incoming Baru - gudangLPS" };

export default async function NewIncoming({ searchParams }) {
  await requireRole("staff");
  // PO layak: Inspecting, laporan terakhir "sesuai", belum punya Incoming non-Rejected
  const eligible = await query(
    `SELECT po.id, po.po_number, u.company AS supplier
       FROM purchase_orders po JOIN users u ON u.id = po.supplier_id
      WHERE po.status = 'inspecting'
        AND NOT EXISTS (SELECT 1 FROM incoming_transactions t WHERE t.po_id = po.id AND t.status <> 'rejected')
        AND COALESCE((SELECT is_match FROM inspection_reports r WHERE r.po_id = po.id ORDER BY r.id DESC LIMIT 1), false)
      ORDER BY po.created_at DESC`
  );
  const poId = Number(searchParams.po);
  const selected = Number.isInteger(poId) ? eligible.find((p) => p.id === poId) : null;
  const items = selected
    ? await query(
        `SELECT i.quantity, p.sku, p.name, p.unit FROM po_items i JOIN products p ON p.id = i.product_id
          WHERE i.po_id = $1 ORDER BY i.id`, [selected.id])
    : [];

  return (
    <>
      <PageHeader title="Incoming Transaction Baru" subtitle="Nomor transaksi otomatis. Produk dan kuantitas terisi dari PO." />

      <form className="card mb-6 max-w-2xl">
        <label className="label" htmlFor="po">Nomor PO</label>
        <div className="flex gap-2">
          <select id="po" name="po" defaultValue={selected?.id ?? ""} className="input" required>
            <option value="" disabled>-- Pilih PO yang sudah lolos pemeriksaan --</option>
            {eligible.map((p) => <option key={p.id} value={p.id}>{p.po_number} - {p.supplier}</option>)}
          </select>
          <button className="btn-ghost">Pilih</button>
        </div>
        {eligible.length === 0 && (
          <p className="alert-info mt-3">
            Belum ada PO yang siap diterima. PO harus berstatus Inspecting dengan laporan pemeriksaan &quot;sesuai&quot;.
          </p>
        )}
      </form>

      {selected && (
        <ActionForm action={createIncomingAction} className="card max-w-2xl space-y-4">
          <input type="hidden" name="po_id" value={selected.id} />
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>SKU</th><th>Produk</th><th>Kuantitas (dari PO)</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.sku}><td className="font-mono text-xs">{it.sku}</td><td>{it.name}</td><td>{it.quantity} {it.unit}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <label className="label" htmlFor="receive_date">Tanggal penerimaan</label>
            <input id="receive_date" name="receive_date" type="date" defaultValue={todayISO()} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="notes">Catatan</label>
            <textarea id="notes" name="notes" rows={2} className="input" />
          </div>
          <div className="flex gap-2">
            <SubmitButton>Ajukan (Pending)</SubmitButton>
            <Link href="/incoming" className="btn-ghost">Batal</Link>
          </div>
        </ActionForm>
      )}
    </>
  );
}
