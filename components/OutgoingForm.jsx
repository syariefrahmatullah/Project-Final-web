import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import ItemRows from "@/components/ItemRows";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/stock";

// Form pengajuan/edit Outgoing Transaction (Staff Gudang)
export default function OutgoingForm({ action, products, trx, items = [] }) {
  return (
    <ActionForm action={action} className="card max-w-3xl space-y-4">
      {trx && <input type="hidden" name="id" value={trx.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ship_date">Tanggal pengiriman</label>
          <input id="ship_date" name="ship_date" type="date" required defaultValue={trx?.ship_date ?? todayISO()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="customer">Nama customer / tujuan</label>
          <input id="customer" name="customer" required defaultValue={trx?.customer ?? ""} className="input" />
        </div>
      </div>
      <div>
        <span className="label">Daftar produk &amp; kuantitas</span>
        <ItemRows
          products={products}
          showStock
          initial={items.map((i) => ({ product_id: String(i.product_id), quantity: i.quantity }))}
        />
        <p className="mt-2 text-xs text-slate-500">Kuantitas tidak boleh melebihi stok tersedia saat ini.</p>
      </div>
      <div>
        <label className="label" htmlFor="notes">Catatan</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={trx?.notes ?? ""} className="input" />
      </div>
      <div className="flex gap-2">
        <SubmitButton>{trx ? "Simpan Perubahan" : "Ajukan (Pending)"}</SubmitButton>
        <Link href={trx ? `/outgoing/${trx.id}` : "/outgoing"} className="btn-ghost">Batal</Link>
      </div>
    </ActionForm>
  );
}
