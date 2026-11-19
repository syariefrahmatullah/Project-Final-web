import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateProductAction } from "@/app/actions/master";
import PageHeader from "@/components/PageHeader";
import ProductForm from "@/components/ProductForm";

export const metadata = { title: "Edit Produk - gudangLPS" };

export default async function EditProduct({ params }) {
  await requireRole("admin", "manager");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [product, categories] = await Promise.all([
    queryOne(`SELECT * FROM products WHERE id = $1`, [id]),
    query(`SELECT id, name FROM categories ORDER BY name`),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Edit Produk: ${product.name}`} />
      <ProductForm action={updateProductAction} categories={categories} product={product} />
    </>
  );
}
