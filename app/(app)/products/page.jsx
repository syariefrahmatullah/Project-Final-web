import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rupiah, stockStatus } from "@/lib/stock";
import { deleteProductAction } from "@/app/actions/master";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import { StockBadge } from "@/components/Badges";

export const metadata = { title: "Produk - gudangLPS" };

export default async function ProductsPage({ searchParams }) {
  const user = await requireRole("admin", "manager", "staff");
  const canEdit = user.role === "admin" || user.role === "manager";
  const q = (searchParams.q || "").trim();
  const cat = searchParams.category || "";
  const status = searchParams.status || "";

  const [categories, all] = await Promise.all([
    query(`SELECT id, name FROM categories ORDER BY name`),
    query(
      `SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id = p.category_id
        WHERE ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%')
          AND ($2 = '' OR p.category_id = $2::int)
        ORDER BY p.name`,
      [q, cat]
    ),
  ]);
  const products = all.filter(
    (p) => !status || stockStatus(p.stock, p.min_stock, p.low_stock).key === status
  );

  return (
    <>
      <PageHeader title="Produk" subtitle={canEdit ? "Master data produk (CRUD)." : "Daftar produk (hanya lihat)."}>
        {canEdit && <Link href="/products/new" className="btn-primary">+ Tambah Produk</Link>}
      </PageHeader>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Cari nama / SKU" className="input max-w-xs" />
        <select name="category" defaultValue={cat} className="input w-auto" aria-label="Kategori">
          <option value="">Semua kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status} className="input w-auto" aria-label="Status stok">
          <option value="">Semua status stok</option>
          <option value="out">Out of Stock</option>
          <option value="severe">Severe</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
        </select>
        <button className="btn-ghost">Filter</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Min / Low</th><th>Status</th>
              {canEdit && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-500">Tidak ada produk.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.sku}</td>
                <td className="font-medium">{p.name}</td>
                <td>{p.category}</td>
                <td>{rupiah(p.price)}</td>
                <td>{p.stock} {p.unit}</td>
                <td>{p.min_stock} / {p.low_stock}</td>
                <td><StockBadge stock={p.stock} min={p.min_stock} low={p.low_stock} /></td>
                {canEdit && (
                  <td>
                    <div className="flex items-start gap-2">
                      <Link href={`/products/${p.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                      <ActionForm
                        action={deleteProductAction}
                        confirmText={
                          p.stock > 0
                            ? `PERINGATAN: "${p.name}" masih memiliki stok ${p.stock} ${p.unit}. Tetap hapus produk ini?`
                            : `Hapus produk "${p.name}"?`
                        }
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="confirm_stock" value="yes" />
                        <button className="btn-danger btn-sm">Hapus</button>
                      </ActionForm>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
