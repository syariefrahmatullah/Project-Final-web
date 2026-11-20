import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/stock";
import PageHeader from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Barang Masuk - gudangLPS" };

export default async function IncomingList() {
  const user = await requireRole("admin", "manager", "staff");
  const rows = await query(
    `SELECT t.*, po.po_number, u.company AS supplier, c.name AS creator
       FROM incoming_transactions t
       JOIN purchase_orders po ON po.id = t.po_id
       JOIN users u ON u.id = po.supplier_id
       JOIN users c ON c.id = t.created_by
      ORDER BY t.created_at DESC`
  );
  return (
    <>
      <PageHeader title="Barang Masuk (Incoming)" subtitle="Penerimaan barang berdasarkan PO. Stok bertambah saat Approved.">
        {user.role === "staff" && <Link href="/incoming/new" className="btn-primary">+ Incoming Baru</Link>}
      </PageHeader>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>No. Transaksi</th><th>No. PO</th><th>Supplier</th><th>Tgl Terima</th><th>Dibuat oleh</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Belum ada transaksi masuk.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs font-medium">{t.trx_number}</td>
                <td className="font-mono text-xs">{t.po_number}</td>
                <td>{t.supplier}</td>
                <td>{fmtDate(t.receive_date)}</td>
                <td>{t.creator}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><Link href={`/incoming/${t.id}`} className="btn-ghost btn-sm">Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
