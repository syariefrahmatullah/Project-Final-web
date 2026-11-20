import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/stock";
import PageHeader from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Barang Keluar - gudangLPS" };

export default async function OutgoingList() {
  const user = await requireRole("admin", "manager", "staff");
  const rows = await query(
    `SELECT t.*, c.name AS creator,
            (SELECT COALESCE(SUM(quantity),0)::int FROM outgoing_items WHERE outgoing_id = t.id) AS qty
       FROM outgoing_transactions t JOIN users c ON c.id = t.created_by
      ORDER BY t.created_at DESC`
  );
  return (
    <>
      <PageHeader title="Barang Keluar (Outgoing)" subtitle="Stok berkurang saat transaksi berstatus Shipped.">
        {user.role === "staff" && <Link href="/outgoing/new" className="btn-primary">+ Barang Keluar Baru</Link>}
      </PageHeader>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>No. Transaksi</th><th>Customer / Tujuan</th><th>Tgl Kirim</th><th>Total Unit</th><th>Dibuat oleh</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Belum ada transaksi keluar.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs font-medium">{t.trx_number}</td>
                <td>{t.customer}</td>
                <td>{fmtDate(t.ship_date)}</td>
                <td>{t.qty}</td>
                <td>{t.creator}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><Link href={`/outgoing/${t.id}`} className="btn-ghost btn-sm">Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
