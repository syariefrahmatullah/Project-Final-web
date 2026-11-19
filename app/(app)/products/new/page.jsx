import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createProductAction } from "@/app/actions/master";
import PageHeader from "@/components/PageHeader";
import ProductForm from "@/components/ProductForm";

export const metadata = { title: "Tambah Produk - gudangLPS" };

export default async function NewProduct() {
  await requireRole("admin", "manager");
  const categories = await query(`SELECT id, name FROM categories ORDER BY name`);
  return (
    <>
      <PageHeader title="Tambah Produk" />
      <ProductForm action={createProductAction} categories={categories} />
    </>
  );
}
