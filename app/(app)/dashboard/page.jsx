import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { rupiah, fmtDateTime, stockStatus } from "@/lib/stock";
import PageHeader from "@/components/PageHeader";
import { StatusBadge, StockBadge } from "@/components/Badges";

export const metadata = { title: "Dashboard - gudangLPS" };

function Stat({ label, value, hint, tone = "" }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const user = await requireRole();
  if (user.role === "supplier") return <SupplierDashboard user={user} />;

  const [totals, products, pend, activity] = await Promise.all([
    queryOne(`SELECT COUNT(*)::int AS n, COALESCE(SUM(price * stock), 0) AS value FROM products`),
    query(`SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.name`),
    queryOne(`SELECT
        (SELECT COUNT(*)::int FROM incoming_transactions WHERE status = 'pending') AS incoming,
        (SELECT COUNT(*)::int FROM outgoing_transactions WHERE status = 'pending') AS outgoing,
        (SELECT COUNT(*)::int FROM outgoing_transactions WHERE status = 'approved') AS to_ship,
        (SELECT COUNT(*)::int FROM purchase_orders WHERE status IN ('pending','confirmed','in_transit','inspecting')) AS active_po,
        (SELECT COUNT(*)::int FROM users WHERE role = 'supplier' AND supplier_status = 'pending') AS suppliers`),
    query(`SELECT kind, href, ref, status, created_at FROM (
        SELECT 'Restock Order' AS kind, '/purchase-orders/' || id AS href, po_number AS ref, status, created_at FROM purchase_orders
        UNION ALL
        SELECT 'Barang Masuk', '/incoming/' || id, trx_number, status, created_at FROM incoming_transactions
        UNION ALL
        SELECT 'Barang Keluar', '/outgoing/' || id, trx_number, status, created_at FROM outgoing_transactions
      ) a ORDER BY created_at DESC LIMIT 8`),
  ]);

  const critical = products
    .map((p) => ({ ...p, st: stockStatus(p.stock, p.min_stock, p.low_stock) }))
    .filter((p) => p.st.key !== "normal")
    .sort((a, b) => a.stock - b.stock);
  const severeCount = critical.filter((p) => p.st.key === "severe" || p.st.key === "out").length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Selamat datang, ${user.name} (${ROLE_LABEL[user.role]})`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Produk" value={totals.n} />
        <Stat label="Total Nilai Inventori" value={rupiah(totals.value)} hint="Harga x stok seluruh produk" />
        <Stat label="Stok Kritis" value={severeCount} tone={severeCount ? "text-red-600" : ""} hint="Severe + Out of Stock" />
        <Stat label="PO Aktif" value={pend.active_po} hint="Belum Received/Returned/Rejected" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {user.role === "admin" && (
          <Stat label="Supplier Menunggu" value={pend.suppliers} hint="Perlu verifikasi Admin" />
        )}
        {(user.role === "manager" || user.role === "admin") && (
          <>
            <Stat label="Barang Masuk Pending" value={pend.incoming} hint="Menunggu persetujuan Manager" />
            <Stat label="Barang Keluar Pending" value={pend.outgoing} hint="Menunggu persetujuan Manager" />
          </>
        )}
        {user.role === "staff" && <Stat label="Siap Dikirim" value={pend.to_ship} hint="Outgoing berstatus Approved" />}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3">Peringatan Stok</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Produk</th><th>Stok</th><th>Min / Low</th><th>Status</th></tr></thead>
              <tbody>
                {critical.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-slate-500">Semua stok dalam kondisi normal.</td></tr>
                )}
                {critical.map((p) => (
                  <tr key={p.id}>
                    <td><span className="font-medium">{p.name}</span><br /><span className="text-xs text-slate-500">{p.sku}</span></td>
                    <td>{p.stock} {p.unit}</td>
                    <td>{p.min_stock} / {p.low_stock}</td>
                    <td><StockBadge stock={p.stock} min={p.min_stock} low={p.low_stock} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3">Aktivitas Terbaru</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Jenis</th><th>Nomor</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {activity.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-slate-500">Belum ada aktivitas.</td></tr>
                )}
                {activity.map((a) => (
                  <tr key={a.href}>
                    <td>{a.kind}</td>
                    <td><Link href={a.href} className="font-medium text-brand underline">{a.ref}</Link></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDateTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

async function SupplierDashboard({ user }) {
  const rows = await query(
    `SELECT status, COUNT(*)::int AS n FROM purchase_orders WHERE supplier_id = $1 GROUP BY status`,
    [user.id]
  );
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  return (
    <>
      <PageHeader title="Dashboard Supplier" subtitle={`${user.company || user.name}`}>
        <Link href="/purchase-orders" className="btn-primary">Lihat Pesanan</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Perlu Konfirmasi" value={by.pending || 0} tone={by.pending ? "text-yellow-600" : ""} hint="PO berstatus Pending" />
        <Stat label="Siap Dikirim" value={by.confirmed || 0} hint="PO Confirmed" />
        <Stat label="In Transit" value={by.in_transit || 0} />
        <Stat label="Diperiksa Gudang" value={by.inspecting || 0} />
      </div>
    </>
  );
}
