import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Masuk - gudangLPS" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <>
      <h1 className="mb-1">Masuk</h1>
      <p className="mb-5 text-sm text-slate-500">Gunakan akun yang diberikan untuk mengakses sistem gudang.</p>
      <ActionForm action={loginAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Masuk</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm text-slate-500">
        Supplier baru?{" "}
        <Link href="/register" className="font-medium text-brand underline">Daftar di sini</Link>
      </p>
    </>
  );
}
