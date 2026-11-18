import { stockStatus } from "@/lib/stock";

export function StockBadge({ stock, min, low }) {
  const s = stockStatus(stock, min, low);
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

const STATUS = {
  // PO
  pending: ["Pending", "bg-yellow-100 text-yellow-800"],
  confirmed: ["Confirmed", "bg-blue-100 text-blue-700"],
  rejected: ["Rejected", "bg-red-100 text-red-700"],
  in_transit: ["In Transit", "bg-indigo-100 text-indigo-700"],
  inspecting: ["Inspecting", "bg-purple-100 text-purple-700"],
  received: ["Received", "bg-green-100 text-green-700"],
  returned: ["Returned", "bg-orange-100 text-orange-700"],
  // Transaksi
  approved: ["Approved", "bg-green-100 text-green-700"],
  shipped: ["Shipped", "bg-emerald-100 text-emerald-700"],
};

export function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || [status, "bg-gray-100 text-gray-700"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
