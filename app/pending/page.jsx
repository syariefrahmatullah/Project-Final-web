import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import Logo from "@/components/Logo";

export const metadata = { title: "Menunggu Verifikasi - gudangLPS" };

export default async function PendingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "supplier" || user.supplier_status === "approved") redirect("/");
  const rejected = user.supplier_status === "rejected";
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand to-brand-light px-4">
      <div className="card w-full max-w-md text-center">
        <div className="mb-4 flex justify-center"><Logo width={160} height={48} /></div>
        {rejected ? (
          <>
            <h1 className="mb-2">Pendaftaran Ditolak</h1>
            <p className="text-sm text-slate-600">Admin menolak pendaftaran akun Supplier Anda.</p>
            <p className="alert-error mt-3 text-left"><b>Alasan:</b> {user.reject_reason}</p>
          </>
        ) : (
          <>
            <h1 className="mb-2">Menunggu Verifikasi</h1>
            <p className="text-sm text-slate-600">
              Halo {user.name}, pendaftaran Anda sedang ditinjau Admin. Silakan cek kembali nanti.
            </p>
          </>
        )}
        <form action={logoutAction} className="mt-5">
          <button className="btn-ghost w-full">Keluar</button>
        </form>
      </div>
    </main>
  );
}
