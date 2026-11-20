import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { verifySupplierAction } from "@/app/actions/master";
import { fmtDateTime } from "@/lib/stock";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Verifikasi Supplier - gudangLPS" };

export default async function SuppliersPage() {
  await requireRole("admin");
  const suppliers = await query(
    `SELECT * FROM users WHERE role = 'supplier'
      ORDER BY (supplier_status = 'pending') DESC, created_at DESC`
  );
  return (
    <>
      <PageHeader title="Verifikasi Supplier" subtitle="Setujui atau tolak pendaftaran akun Supplier baru." />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Supplier</th><th>Kontak</th><th>Terdaftar</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">Belum ada Supplier terdaftar.</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="font-medium">{s.company}</span><br />
                  <span className="text-xs text-slate-500">{s.name}</span>
                </td>
                <td className="text-xs">{s.email}<br />{s.phone}<br />{s.address}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(s.created_at)}</td>
                <td>
                  <StatusBadge status={s.supplier_status} />
                  {s.reject_reason && <p className="mt-1 max-w-[14rem] text-xs text-red-600">Alasan: {s.reject_reason}</p>}
                </td>
                <td>
                  {s.supplier_status === "pending" ? (
                    <div className="space-y-2">
                      <ActionForm action={verifySupplierAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <button className="btn-primary btn-sm">Approve</button>
                      </ActionForm>
                      <ActionForm action={verifySupplierAction} className="flex gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <input name="reason" placeholder="Alasan penolakan" required className="input" aria-label="Alasan penolakan" />
                        <button className="btn-danger btn-sm">Reject</button>
                      </ActionForm>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
