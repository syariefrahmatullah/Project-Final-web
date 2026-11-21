import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/stock";
import {
  confirmPOAction, rejectPOAction, shipPOAction, uploadProofAction,
  startInspectionAction, submitInspectionAction, returnPOAction, claimRefundAction,
} from "@/app/actions/purchase-orders";
import ActionForm from "@/components/ActionForm";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";
import { StatusBadge } from "@/components/Badges";

export const metadata = { title: "Detail PO - gudangLPS" };

const FLOW = ["pending", "confirmed", "in_transit", "inspecting", "received"];

export default async function PODetail({ params }) {
  const user = await requireRole();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const po = await queryOne(
    `SELECT po.*, u.company AS supplier, u.name AS supplier_name, m.name AS creator
       FROM purchase_orders po
       JOIN users u ON u.id = po.supplier_id
       JOIN users m ON m.id = po.created_by
      WHERE po.id = $1`,
    [id]
  );
  if (!po) notFound();
  if (user.role === "supplier" && po.supplier_id !== user.id) notFound();

  const [items, reports, incoming] = await Promise.all([
    query(
      `SELECT i.quantity, p.sku, p.name, p.unit FROM po_items i JOIN products p ON p.id = i.product_id
        WHERE i.po_id = $1 ORDER BY i.id`, [id]),
    query(
      `SELECT r.*, u.name AS staff FROM inspection_reports r JOIN users u ON u.id = r.staff_id
        WHERE r.po_id = $1 ORDER BY r.id DESC`, [id]),
    query(`SELECT id, trx_number, status FROM incoming_transactions WHERE po_id = $1 ORDER BY id DESC`, [id]),
  ]);
  const lastReport = reports[0];
  const activeIncoming = incoming.find((t) => t.status !== "rejected");
  const s = po.status;

  return (
    <>
      <PageHeader title={`PO ${po.po_number}`} subtitle={`Dibuat oleh ${po.creator}`}>
        <Link href="/purchase-orders" className="btn-ghost">Kembali</Link>
      </PageHeader>

      {/* Alur status */}
      <div className="card mb-6 flex flex-wrap items-center gap-2 text-sm">
        {FLOW.map((f, i) => {
          const reached = FLOW.indexOf(s) >= i || (s === "returned" && i <= 3);
          return (
            <span key={f} className="flex items-center gap-2">
              <span className={`badge ${reached ? "bg-brand text-white" : "bg-slate-100 text-slate-400"}`}>{f.replace("_", " ")}</span>
              {i < FLOW.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          );
        })}
        {(s === "rejected" || s === "returned") && <StatusBadge status={s} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="mb-3">Informasi</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Supplier</dt><dd className="font-medium">{po.supplier} ({po.supplier_name})</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={s} /></dd></div>
              <div><dt className="text-slate-500">Tanggal PO</dt><dd>{fmtDate(po.order_date)}</dd></div>
              <div><dt className="text-slate-500">Expected delivery</dt><dd>{fmtDate(po.expected_date)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Catatan</dt><dd>{po.notes || "-"}</dd></div>
            </dl>
            {po.reason && (
              <p className="alert-error mt-4">
                <b>{s === "rejected" ? "Ditolak Supplier" : "Retur (Returned)"}:</b> {po.reason}
              </p>
            )}
            {po.refund_claim && (
              <p className="alert-info mt-3">
                <b>Klaim refund diajukan</b> ({fmtDateTime(po.refund_claimed_at)}): {po.refund_claim}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3">Daftar Produk</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>SKU</th><th>Produk</th><th>Kuantitas</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.sku}><td className="font-mono text-xs">{it.sku}</td><td>{it.name}</td><td>{it.quantity} {it.unit}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {po.proof_photo && (
            <section className="card">
              <h2 className="mb-3">Bukti Foto Kedatangan</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/uploads/${po.proof_photo}`} alt="Bukti kedatangan barang" className="max-h-80 rounded-lg border" />
            </section>
          )}

          {reports.length > 0 && (
            <section>
              <h2 className="mb-3">Laporan Pemeriksaan</h2>
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="card text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`badge ${r.is_match ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.is_match ? "Sesuai" : "Tidak sesuai / rusak"}
                      </span>
                      <span className="text-xs text-slate-500">{r.staff} · {fmtDateTime(r.created_at)}</span>
                    </div>
                    <p>{r.notes}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Panel aksi per peran & status */}
        <aside className="space-y-4">
          <h2>Aksi</h2>

          {user.role === "admin" && <p className="card text-sm text-slate-500">Admin memantau PO ini (hanya lihat).</p>}

          {user.role === "supplier" && s === "pending" && (
            <div className="card space-y-3">
              <p className="text-sm text-slate-600">Konfirmasi pesanan ini atau tolak dengan alasan.</p>
              <ActionForm action={confirmPOAction}>
                <input type="hidden" name="id" value={po.id} />
                <SubmitButton className="btn-primary w-full">Konfirmasi (Confirmed)</SubmitButton>
              </ActionForm>
              <ActionForm action={rejectPOAction} className="space-y-2" confirmText="Tolak PO ini?">
                <input type="hidden" name="id" value={po.id} />
                <textarea name="reason" required rows={2} placeholder="Alasan penolakan (wajib)" className="input" aria-label="Alasan penolakan" />
                <SubmitButton className="btn-danger w-full">Tolak (Rejected)</SubmitButton>
              </ActionForm>
            </div>
          )}

          {user.role === "supplier" && s === "confirmed" && (
            <div className="card">
              <p className="mb-3 text-sm text-slate-600">Klik saat barang mulai dikirim ke gudang.</p>
              <ActionForm action={shipPOAction}>
                <input type="hidden" name="id" value={po.id} />
                <SubmitButton className="btn-accent w-full">Kirim Barang (In Transit)</SubmitButton>
              </ActionForm>
            </div>
          )}

          {user.role === "supplier" && s === "in_transit" && (
            <div className="card">
              <p className="mb-3 text-sm text-slate-600">
                Unggah foto dokumentasi kedatangan barang agar Manager dapat memulai pemeriksaan.
              </p>
              <ActionForm action={uploadProofAction} className="space-y-2">
                <input type="hidden" name="id" value={po.id} />
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="input" aria-label="Foto bukti kedatangan" />
                <SubmitButton className="btn-primary w-full">{po.proof_photo ? "Ganti Foto" : "Unggah Foto"}</SubmitButton>
              </ActionForm>
            </div>
          )}

          {user.role === "manager" && s === "in_transit" && (
            <div className="card">
              <p className="mb-3 text-sm text-slate-600">
                {po.proof_photo
                  ? "Bukti foto sudah diterima. Instruksikan Staff Gudang memeriksa fisik barang."
                  : "Menunggu Supplier mengunggah bukti foto kedatangan."}
              </p>
              <ActionForm action={startInspectionAction}>
                <input type="hidden" name="id" value={po.id} />
                <SubmitButton className="btn-primary w-full">Mulai Pemeriksaan (Inspecting)</SubmitButton>
              </ActionForm>
            </div>
          )}

          {user.role === "staff" && s === "inspecting" && !activeIncoming && (
            <div className="card space-y-3">
              <p className="text-sm text-slate-600">Periksa jumlah dan kondisi barang, lalu buat laporan.</p>
              <ActionForm action={submitInspectionAction} className="space-y-2">
                <input type="hidden" name="id" value={po.id} />
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="verdict" value="match" required /> Barang sesuai</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="verdict" value="mismatch" /> Tidak sesuai / rusak</label>
                <textarea name="notes" required rows={3} placeholder="Catatan pemeriksaan (jumlah & kondisi)" className="input" aria-label="Catatan pemeriksaan" />
                <SubmitButton className="btn-primary w-full">Simpan Laporan</SubmitButton>
              </ActionForm>
              {lastReport?.is_match && (
                <Link href={`/incoming/new?po=${po.id}`} className="btn-accent w-full">Buat Incoming Transaction</Link>
              )}
            </div>
          )}

          {user.role === "manager" && s === "inspecting" && (
            <div className="card space-y-3">
              {activeIncoming ? (
                <p className="text-sm text-slate-600">
                  Incoming Transaction{" "}
                  <Link className="font-medium text-brand underline" href={`/incoming/${activeIncoming.id}`}>{activeIncoming.trx_number}</Link>{" "}
                  menunggu keputusan Anda.
                </p>
              ) : !lastReport ? (
                <p className="text-sm text-slate-600">Menunggu laporan pemeriksaan dari Staff Gudang.</p>
              ) : lastReport.is_match ? (
                <p className="text-sm text-slate-600">Laporan menyatakan barang sesuai. Menunggu Staff membuat Incoming Transaction.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-600">Laporan menyatakan barang tidak sesuai. Tolak penerimaan (Returned).</p>
                  <ActionForm action={returnPOAction} className="space-y-2" confirmText="Retur PO ini? Stok tidak akan bertambah.">
                    <input type="hidden" name="id" value={po.id} />
                    <textarea name="reason" required rows={2} placeholder="Alasan retur (wajib)" className="input" aria-label="Alasan retur" />
                    <SubmitButton className="btn-danger w-full">Tolak Penerimaan (Returned)</SubmitButton>
                  </ActionForm>
                </>
              )}
            </div>
          )}

          {user.role === "manager" && s === "returned" && (
            <div className="card space-y-3">
              {po.refund_claim ? (
                <p className="text-sm text-slate-600">Klaim refund sudah diajukan kepada Supplier.</p>
              ) : (
                <ActionForm action={claimRefundAction} className="space-y-2">
                  <input type="hidden" name="id" value={po.id} />
                  <textarea name="note" required rows={2} placeholder="Keterangan klaim refund ke Supplier" className="input" aria-label="Keterangan klaim refund" />
                  <SubmitButton className="btn-primary w-full">Ajukan Klaim Refund</SubmitButton>
                </ActionForm>
              )}
              <Link href="/purchase-orders/new" className="btn-ghost w-full">Buat PO Baru</Link>
            </div>
          )}

          {user.role === "manager" && s === "rejected" && (
            <div className="card">
              <p className="mb-3 text-sm text-slate-600">PO ditolak Supplier. Anda dapat membuat PO baru bila stok masih dibutuhkan.</p>
              <Link href="/purchase-orders/new" className="btn-ghost w-full">Buat PO Baru</Link>
            </div>
          )}

          {incoming.length > 0 && (
            <div className="card text-sm">
              <p className="mb-2 font-semibold">Incoming Transaction</p>
              <ul className="space-y-1">
                {incoming.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <Link href={`/incoming/${t.id}`} className="text-brand underline">{t.trx_number}</Link>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
