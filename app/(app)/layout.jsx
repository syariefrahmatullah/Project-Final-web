import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import Logo from "@/components/Logo";
import NavLinks from "@/components/NavLinks";

const NAV = {
  admin: [
    ["/dashboard", "Dashboard"],
    ["/suppliers", "Verifikasi Supplier"],
    ["/products", "Produk"],
    ["/categories", "Kategori"],
    ["/purchase-orders", "Restock Order (PO)"],
    ["/incoming", "Barang Masuk"],
    ["/outgoing", "Barang Keluar"],
  ],
  manager: [
    ["/dashboard", "Dashboard"],
    ["/products", "Produk"],
    ["/categories", "Kategori"],
    ["/purchase-orders", "Restock Order (PO)"],
    ["/incoming", "Barang Masuk"],
    ["/outgoing", "Barang Keluar"],
  ],
  staff: [
    ["/dashboard", "Dashboard"],
    ["/products", "Produk"],
    ["/purchase-orders", "Pemeriksaan PO"],
    ["/incoming", "Barang Masuk"],
    ["/outgoing", "Barang Keluar"],
  ],
  supplier: [
    ["/dashboard", "Dashboard"],
    ["/purchase-orders", "Pesanan Saya"],
  ],
};

export default async function AppLayout({ children }) {
  const user = await requireRole();
  const links = NAV[user.role].map(([href, label]) => ({ href, label }));
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-brand p-4 md:min-h-screen md:w-64">
        <div className="mb-5 rounded-lg bg-white px-3 py-2">
          <Logo width={170} height={50} />
        </div>
        <NavLinks links={links} />
        <div className="mt-6 border-t border-white/15 pt-4 text-sm text-slate-200 md:mt-auto">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="mb-3 text-xs text-slate-300">{ROLE_LABEL[user.role]}</p>
          <form action={logoutAction}>
            <button className="btn-ghost btn-sm w-full">Keluar</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
