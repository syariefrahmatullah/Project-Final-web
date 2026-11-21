import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";

// Form tambah/edit produk. SKU hanya bisa diisi saat tambah (tidak dapat diubah saat edit).
export default function ProductForm({ action, categories, product }) {
  const edit = !!product;
  return (
    <ActionForm action={action} className="card max-w-2xl space-y-4">
      {edit && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sku">SKU {edit && <span className="text-xs text-slate-400">(tidak dapat diubah)</span>}</label>
          {edit ? (
            <input id="sku" value={product.sku} disabled className="input font-mono" readOnly />
          ) : (
            <input id="sku" name="sku" required className="input font-mono uppercase" placeholder="mis. ELK-003" />
          )}
        </div>
        <div>
          <label className="label" htmlFor="name">Nama produk</label>
          <input id="name" name="name" required defaultValue={product?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="category_id">Kategori</label>
          <select id="category_id" name="category_id" required defaultValue={product?.category_id ?? ""} className="input">
            <option value="" disabled>-- Pilih kategori --</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="unit">Satuan</label>
          <input id="unit" name="unit" defaultValue={product?.unit ?? "pcs"} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price">Harga (Rp)</label>
          <input id="price" name="price" type="number" min={0} step="any" required defaultValue={product?.price ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Stok saat ini</label>
          <input value={product?.stock ?? 0} disabled readOnly className="input" />
          <p className="mt-1 text-xs text-slate-500">Stok hanya berubah lewat transaksi masuk/keluar.</p>
        </div>
        <div>
          <label className="label" htmlFor="min_stock">Stok Minimum</label>
          <input id="min_stock" name="min_stock" type="number" min={0} required defaultValue={product?.min_stock ?? 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="low_stock">Stok Low (harus &gt; Stok Minimum)</label>
          <input id="low_stock" name="low_stock" type="number" min={1} required defaultValue={product?.low_stock ?? 10} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Deskripsi</label>
        <textarea id="description" name="description" rows={3} defaultValue={product?.description ?? ""} className="input" />
      </div>
      <div className="flex gap-2">
        <SubmitButton>{edit ? "Simpan Perubahan" : "Simpan Produk"}</SubmitButton>
        <Link href="/products" className="btn-ghost">Batal</Link>
      </div>
    </ActionForm>
  );
}
