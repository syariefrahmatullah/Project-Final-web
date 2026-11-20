import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/stock";
import {
  approveOutgoingAction, rejectOutgoingAction, shipOutgoingAction, deleteOutgoingAction,
} from "@/app/actions/outgoing";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Detail Barang Keluar - gudangLPS" };

export default async function OutgoingDetail({ params }) {
  const user = await requireRole("admin", "manager", "staff");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const t = await queryOne(
    `SELECT t.*, c.name AS creator, r.name AS reviewer
       FROM outgoing_transactions t JOIN users c ON c.id = t.created_by
       LEFT JOIN users r ON r.id = t.reviewed_by WHERE t.id = $1`, [id]);
  if (!t) notFound();
  const items = await query(
    `SELECT i.quantity, p.sku, p.name, p.unit, p.stock FROM outgoing_items i
       JOIN products p ON p.id = i.product_id WHERE i.outgoing_id = $1 ORDER BY i.id`, [id]);
  const mine = user.role === "staff" && t.created_by === user.id;

  return (
    <>
      <PageHeader title={`Outgoing ${t.trx_number}`}>
        <Link href="/outgoing" className="btn-ghost">Kembali</Link>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={t.status} /></dd></div>
              <div><dt className="text-slate-500">Customer / tujuan</dt><dd className="font-medium">{t.customer}</dd></div>
              <div><dt className="text-slate-500">Tanggal pengiriman</dt><dd>{fmtDate(t.ship_date)}</dd></div>
              <div><dt className="text-slate-500">Dibuat oleh</dt><dd>{t.creator}</dd></div>
              <div><dt className="text-slate-500">Diputuskan oleh</dt><dd>{t.reviewer || "-"}</dd></div>
              <div><dt className="text-slate-500">Catatan</dt><dd>{t.notes || "-"}</dd></div>
            </dl>
            {t.reason && <p className="alert-error mt-4"><b>Alasan penolakan:</b> {t.reason}</p>}
          </section>
          <section>
            <h2 className="mb-3">Produk</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>SKU</th><th>Produk</th><th>Kuantitas</th><th>Stok saat ini</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.sku}><td className="font-mono text-xs">{it.sku}</td><td>{it.name}</td><td>-{it.quantity} {it.unit}</td><td>{it.stock}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <h2>Aksi</h2>

          {user.role === "manager" && t.status === "pending" && (
            <div className="card space-y-3">
              <ActionForm action={approveOutgoingAction}>
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton className="btn-primary w-full">Setujui (Approved)</SubmitButton>
              </ActionForm>
              <ActionForm action={rejectOutgoingAction} className="space-y-2" confirmText="Tolak transaksi ini?">
                <input type="hidden" name="id" value={t.id} />
                <textarea name="reason" required rows={2} placeholder="Alasan penolakan (wajib)" className="input" aria-label="Alasan penolakan" />
                <SubmitButton className="btn-danger w-full">Tolak (Rejected)</SubmitButton>
              </ActionForm>
            </div>
          )}

          {user.role === "staff" && t.status === "approved" && (
            <div className="card space-y-2">
              <p className="text-sm text-slate-600">
                Ambil barang dari rak dan lakukan packing. Setelah dikirim/diserahkan, tekan tombol di bawah. Stok akan berkurang.
              </p>
              <ActionForm action={shipOutgoingAction} confirmText="Kirim barang? Stok akan langsung berkurang.">
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton className="btn-accent w-full">Kirim Barang (Shipped)</SubmitButton>
              </ActionForm>
            </div>
          )}

          {mine && t.status === "pending" && (
            <div className="card space-y-2">
              <Link href={`/outgoing/${t.id}/edit`} className="btn-ghost w-full">Edit Transaksi</Link>
              <ActionForm action={deleteOutgoingAction} confirmText="Hapus transaksi ini?">
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton className="btn-danger w-full">Hapus Transaksi</SubmitButton>
              </ActionForm>
            </div>
          )}

          {t.status === "pending" && user.role !== "manager" && !mine && (
            <p className="card text-sm text-slate-500">Menunggu keputusan Warehouse Manager.</p>
          )}
          {t.status === "pending" && mine && <p className="text-xs text-slate-500">Menunggu persetujuan Manager.</p>}
          {t.status === "approved" && user.role !== "staff" && <p className="card text-sm text-slate-500">Disetujui, menunggu Staff Gudang melakukan packing & pengiriman.</p>}
          {["rejected", "shipped"].includes(t.status) && <p className="card text-sm text-slate-500">Transaksi selesai.</p>}
        </aside>
      </div>
    </>
  );
}
