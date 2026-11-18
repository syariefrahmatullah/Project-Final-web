import "./globals.css";

export const metadata = {
  title: "gudangLPS - Warehouse Management",
  description: "Sistem Manajemen Gudang gudangLPS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
