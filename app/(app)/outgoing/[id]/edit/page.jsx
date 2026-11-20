import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateOutgoingAction } from "@/app/actions/outgoing";
import OutgoingForm from "@/components/OutgoingForm";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Edit Barang Keluar - gudangLPS" };

export default async function EditOutgoing({ params }) {
  const user = await requireRole("staff");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const trx = await queryOne(`SELECT * FROM outgoing_transactions WHERE id = $1`, [id]);
  if (!trx) notFound();
  // Hanya pembuat, dan hanya saat Pending
  if (trx.created_by !== user.id || trx.status !== "pending") redirect(`/outgoing/${id}`);
  const [items, products] = await Promise.all([
    query(`SELECT product_id, quantity FROM outgoing_items WHERE outgoing_id = $1 ORDER BY id`, [id]),
    query(`SELECT id, sku, name, unit, stock FROM products WHERE stock > 0 OR id IN (SELECT product_id FROM outgoing_items WHERE outgoing_id = $1) ORDER BY name`, [id]),
  ]);
  return (
    <>
      <PageHeader title={`Edit ${trx.trx_number}`} subtitle="Dapat diedit selama berstatus Pending." />
      <OutgoingForm action={updateOutgoingAction} products={products} trx={trx} items={items} />
    </>
  );
}
