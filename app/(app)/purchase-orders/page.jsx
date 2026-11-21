import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/stock";
import PageHeader from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Restock Order - gudangLPS" };

const STATUSES = ["pending", "confirmed", "rejected", "in_transit", "inspecting", "received", "returned"];

export default async function POList({ searchParams }) {
  const user = await requireRole();
  const status = STATUSES.includes(searchParams.status) ? searchParams.status : "";
  const params = [status];
  let where = `($1 = '' OR po.status = $1)`;
  if (user.role === "supplier") {
    params.push(user.id);
    where += ` AND po.supplier_id = $2`;
  }
  const pos = await query(
    `SELECT po.*, u.company AS supplier,
            (SELECT COUNT(*)::int FROM po_items WHERE po_id = po.id) AS items,
            (SELECT COALESCE(SUM(quantity),0)::int FROM po_items WHERE po_id = po.id) AS qty
       FROM purchase_orders po JOIN users u ON u.id = po.supplier_id
      WHERE ${where} ORDER BY po.created_at DESC`,
    params
  );
  const title = user.role === "supplier" ? "Pesanan Saya" : user.role === "staff" ? "Pemeriksaan PO" : "Restock Order (PO)";

  return (
    <>
      <PageHeader title={title}>
        {user.role === "manager" && <Link href="/purchase-orders/new" className="btn-primary">+ Buat PO</Link>}
      </PageHeader>

      <form className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto" aria-label="Filter status">
          <option value="">Semua status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>No. PO</th>{user.role !== "supplier" && <th>Supplier</th>}<th>Tanggal</th><th>Expected</th><th>Item</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {pos.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">Belum ada PO.</td></tr>
            )}
            {pos.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-medium">{p.po_number}</td>
                {user.role !== "supplier" && <td>{p.supplier}</td>}
                <td>{fmtDate(p.order_date)}</td>
                <td>{fmtDate(p.expected_date)}</td>
                <td>{p.items} produk / {p.qty} unit</td>
                <td><StatusBadge status={p.status} /></td>
                <td><Link href={`/purchase-orders/${p.id}`} className="btn-ghost btn-sm">Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
