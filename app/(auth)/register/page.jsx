import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { registerSupplierAction } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Daftar Supplier - gudangLPS" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/");
  return (
    <>
      <h1 className="mb-1">Daftar Supplier</h1>
      <p className="mb-5 text-sm text-slate-500">
        Pendaftaran akan diverifikasi Admin sebelum akun dapat dipakai.
      </p>
      <ActionForm action={registerSupplierAction} className="space-y-3">
        {[
          ["name", "Nama penanggung jawab", "text"],
          ["company", "Nama perusahaan", "text"],
          ["email", "Email", "email"],
          ["phone", "No. telepon", "tel"],
        ].map(([n, l, t]) => (
          <div key={n}>
            <label className="label" htmlFor={n}>{l}</label>
                        <input
              id={n}
              name={n}
              type={t}
              required
              className="input"
              {...(n === "phone"
                ? { inputMode: "numeric", pattern: "[0-9]{8,15}", title: "Hanya angka, 8 sampai 15 digit" }
                : {})}
            />
          </div>
        ))}
        <div>
          <label className="label" htmlFor="address">Alamat</label>
          <textarea id="address" name="address" required rows={2} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (min. 6 karakter)</label>
          <input id="password" name="password" type="password" required minLength={6} className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Daftar</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-brand underline">Masuk</Link>
      </p>
    </>
  );
}
