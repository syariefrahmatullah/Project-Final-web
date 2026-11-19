"use client";

import { useState } from "react";

// Baris produk + kuantitas yang bisa ditambah/dihapus.
// Mengirim product_id[] dan quantity[] untuk dibaca parseItems() di server.
export default function ItemRows({ products, initial = [], showStock = false }) {
  const [rows, setRows] = useState(
    initial.length ? initial.map((r, i) => ({ ...r, key: i })) : [{ key: 0, product_id: "", quantity: 1 }]
  );
  const [next, setNext] = useState(initial.length || 1);

  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => {
    setRows((rs) => [...rs, { key: next, product_id: "", quantity: 1 }]);
    setNext((n) => n + 1);
  };
  const remove = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const p = products.find((x) => String(x.id) === String(r.product_id));
        return (
          <div key={r.key} className="flex flex-wrap items-center gap-2">
            <select
              name="product_id"
              value={r.product_id}
              onChange={(e) => update(r.key, { product_id: e.target.value })}
              className="input min-w-[14rem] flex-1"
              aria-label="Produk"
            >
              <option value="">-- Pilih produk --</option>
              {products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.sku} - {x.name}
                  {showStock ? ` (stok ${x.stock})` : ""}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="quantity"
              min={1}
              max={showStock && p ? Math.max(p.stock, 1) : undefined}
              value={r.quantity}
              onChange={(e) => update(r.key, { quantity: e.target.value })}
              className="input w-28"
              aria-label="Kuantitas"
            />
            {p && <span className="w-12 text-xs text-slate-500">{p.unit}</span>}
            <button type="button" onClick={() => remove(r.key)} className="btn-ghost btn-sm" aria-label="Hapus baris">
              Hapus
            </button>
          </div>
        );
      })}
      <button type="button" onClick={add} className="btn-ghost btn-sm">
        + Tambah produk
      </button>
    </div>
  );
}
