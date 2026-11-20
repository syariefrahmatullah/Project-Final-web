import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createOutgoingAction } from "@/app/actions/outgoing";
import OutgoingForm from "@/components/OutgoingForm";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Barang Keluar Baru - gudangLPS" };

export default async function NewOutgoing() {
  await requireRole("staff");
  const products = await query(`SELECT id, sku, name, unit, stock FROM products WHERE stock > 0 ORDER BY name`);
  return (
    <>
      <PageHeader title="Pengajuan Barang Keluar" subtitle="Nomor transaksi otomatis. Hanya produk yang memiliki stok yang tampil." />
      <OutgoingForm action={createOutgoingAction} products={products} />
    </>
  );
}
