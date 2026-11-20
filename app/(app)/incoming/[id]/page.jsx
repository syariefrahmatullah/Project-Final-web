import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/stock";
import { approveIncomingAction, rejectIncomingAction } from "@/app/actions/incoming";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Detail Barang Masuk - gudangLPS" };

export default async function IncomingDetail({ params }) {
  const user = await requireRole("admin", "manager", "staff");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const t = await queryOne(
    `SELECT t.*, po.po_number, po.status AS po_status, u.company AS supplier, c.name AS creator, r.name AS reviewer
       FROM incoming_transactions t
       JOIN purchase_orders po ON po.id = t.po_id
       JOIN users u ON u.id = po.supplier_id
       JOIN users c ON c.id = t.created_by
       LEFT JOIN users r ON r.id = t.reviewed_by
      WHERE t.id = $1`, [id]);
  if (!t) notFound();
  const items = await query(
    `SELECT i.quantity, p.sku, p.name, p.unit, p.stock FROM po_items i JOIN products p ON p.id = i.product_id
      WHERE i.po_id = $1 ORDER BY i.id`, [t.po_id]);

  return (
    <>
      <PageHeader title={`Incoming ${t.trx_number}`}>
        <Link href="/incoming" className="btn-ghost">Kembali</Link>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={t.status} /></dd></div>
              <div><dt className="text-slate-500">No. PO</dt><dd><Link className="font-medium text-brand underline" href={`/purchase-orders/${t.po_id}`}>{t.po_number}</Link> <StatusBadge status={t.po_status} /></dd></div>
              <div><dt className="text-slate-500">Supplier</dt><dd>{t.supplier}</dd></div>
              <div><dt className="text-slate-500">Tanggal penerimaan</dt><dd>{fmtDate(t.receive_date)}</dd></div>
              <div><dt className="text-slate-500">Dibuat oleh</dt><dd>{t.creator}</dd></div>
              <div><dt className="text-slate-500">Diputuskan oleh</dt><dd>{t.reviewer || "-"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Catatan</dt><dd>{t.notes || "-"}</dd></div>
            </dl>
            {t.reason && <p className="alert-error mt-4"><b>Alasan penolakan:</b> {t.reason}</p>}
          </section>
          <section>
            <h2 className="mb-3">Produk Diterima</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>SKU</th><th>Produk</th><th>Kuantitas</th><th>Stok saat ini</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.sku}><td className="font-mono text-xs">{it.sku}</td><td>{it.name}</td><td>+{it.quantity} {it.unit}</td><td>{it.stock}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <h2>Aksi</h2>
          {user.role === "manager" && t.status === "pending" ? (
            <div className="card space-y-3">
              <p className="text-sm text-slate-600">Menyetujui akan menambah stok dan mengubah PO menjadi Received.</p>
              <ActionForm action={approveIncomingAction} confirmText="Setujui transaksi ini? Stok akan bertambah.">
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton className="btn-primary w-full">Setujui (Approved)</SubmitButton>
              </ActionForm>
              <ActionForm action={rejectIncomingAction} className="space-y-2" confirmText="Tolak transaksi ini?">
                <input type="hidden" name="id" value={t.id} />
                <textarea name="reason" required rows={2} placeholder="Alasan penolakan (wajib)" className="input" aria-label="Alasan penolakan" />
                <SubmitButton className="btn-danger w-full">Tolak (Rejected)</SubmitButton>
              </ActionForm>
            </div>
          ) : (
            <p className="card text-sm text-slate-500">
              {t.status === "pending" ? "Menunggu keputusan Warehouse Manager." : "Transaksi sudah diputuskan."}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
