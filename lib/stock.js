// Status stok otomatis (badge warna) sesuai ketentuan:
//  Out of Stock (abu-abu): stok = 0
//  Severe (merah)        : 0 < stok <= stok minimum
//  Low (kuning)          : stok minimum < stok <= stok low
//  Normal (hijau)        : stok > stok low
export function stockStatus(stock, minStock, lowStock) {
  if (stock <= 0) return { key: "out", label: "Out of Stock", cls: "bg-gray-200 text-gray-700" };
  if (stock <= minStock) return { key: "severe", label: "Severe", cls: "bg-red-100 text-red-700" };
  if (stock <= lowStock) return { key: "low", label: "Low", cls: "bg-yellow-100 text-yellow-800" };
  return { key: "normal", label: "Normal", cls: "bg-green-100 text-green-700" };
}

export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const fmtDate = (d) => {
  if (!d) return "-";
  const s = typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("id-ID", {
        timeZone: "Asia/Makassar",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";

export const todayISO = () => new Date().toISOString().slice(0, 10);

// Nomor otomatis, mis. PO-20261123-0007
export async function nextNumber(client, prefix, table, column) {
  const day = todayISO().replaceAll("-", "");
  const like = `${prefix}-${day}-%`;
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(SUBSTRING(${column} FROM '[0-9]+$')::int), 0) AS n
       FROM ${table} WHERE ${column} LIKE $1`,
    [like]
  );
  return `${prefix}-${day}-${String(rows[0].n + 1).padStart(4, "0")}`;
}
