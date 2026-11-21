import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/stock";
import { createPOAction } from "@/app/actions/purchase-orders";
import ActionForm from "@/components/ActionForm";
import ItemRows from "@/components/ItemRows";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Buat PO - gudangLPS" };

export default async function NewPO() {
  await requireRole("manager");
  const [suppliers, products] = await Promise.all([
    query(`SELECT id, company, name FROM users WHERE role = 'supplier' AND supplier_status = 'approved' ORDER BY company`),
    query(`SELECT id, sku, name, unit, stock FROM products ORDER BY name`),
  ]);
  return (
    <>
      <PageHeader title="Buat Restock Order" subtitle="Nomor PO dibuat otomatis. Status awal: Pending." />
      <ActionForm action={createPOAction} className="card max-w-3xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="supplier_id">Supplier</label>
            <select id="supplier_id" name="supplier_id" required defaultValue="" className="input">
              <option value="" disabled>-- Pilih supplier --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company} ({s.name})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="expected_date">Expected delivery date</label>
            <input id="expected_date" name="expected_date" type="date" min={todayISO()} required className="input" />
          </div>
        </div>
        <div>
          <span className="label">Daftar produk &amp; kuantitas</span>
          <ItemRows products={products} />
        </div>
        <div>
          <label className="label" htmlFor="notes">Catatan</label>
          <textarea id="notes" name="notes" rows={2} className="input" />
        </div>
        <div className="flex gap-2">
          <SubmitButton>Buat PO</SubmitButton>
          <Link href="/purchase-orders" className="btn-ghost">Batal</Link>
        </div>
      </ActionForm>
    </>
  );
}
