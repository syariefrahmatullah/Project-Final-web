import Link from "next/link";

export const metadata = { title: "Akses Ditolak - gudangLPS" };

export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h1 className="mb-2">403 - Akses Ditolak</h1>
        <p className="mb-4 text-sm text-slate-600">Peran akun Anda tidak memiliki hak untuk membuka halaman ini.</p>
        <Link href="/dashboard" className="btn-primary">Kembali ke Dashboard</Link>
      </div>
    </main>
  );
}
