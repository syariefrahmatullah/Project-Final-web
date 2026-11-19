import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveCategoryAction, deleteCategoryAction } from "@/app/actions/master";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Kategori - gudangLPS" };

export default async function CategoriesPage() {
  await requireRole("admin", "manager");
  const categories = await query(
    `SELECT c.id, c.name, COUNT(p.id)::int AS products
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.name`
  );
  return (
    <>
      <PageHeader title="Kategori" subtitle="Nama kategori harus unik. Kategori yang masih berisi produk tidak dapat dihapus." />

      <ActionForm action={saveCategoryAction} className="card mb-6 max-w-xl">
        <label className="label" htmlFor="new-name">Tambah kategori</label>
        <div className="flex gap-2">
          <input id="new-name" name="name" required className="input" placeholder="Nama kategori baru" />
          <SubmitButton>Tambah</SubmitButton>
        </div>
      </ActionForm>

      <div className="table-wrap max-w-3xl">
        <table className="table">
          <thead><tr><th>Nama</th><th>Jumlah Produk</th><th>Aksi</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <ActionForm action={saveCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <div className="flex gap-2">
                      <input name="name" defaultValue={c.name} required className="input" aria-label={`Nama kategori ${c.name}`} />
                      <button className="btn-ghost btn-sm">Simpan</button>
                    </div>
                  </ActionForm>
                </td>
                <td>{c.products}</td>
                <td>
                  <ActionForm action={deleteCategoryAction} confirmText={`Hapus kategori "${c.name}"?`}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="btn-danger btn-sm">Hapus</button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
