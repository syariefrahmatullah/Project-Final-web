# gudangLPS - Warehouse Management System

Next.js 14 (App Router) + PostgreSQL + Tailwind CSS.

## Menjalankan

1. Buat database kosong, mis. `createdb warehouse`
2. `cp .env.example .env.local` lalu isi `DATABASE_URL` dan `SESSION_SECRET`
3. `npm install`
4. `npm run db:init`  (menjalankan `database/warehouse.sql`: tabel + data awal)
5. `npm run dev`  lalu buka http://localhost:3000

## Akun contoh (password: `password123`)

| Peran             | Email                    |
|-------------------|--------------------------|
| Admin             | admin@gudanglps.test     |
| Warehouse Manager | manager@gudanglps.test   |
| Staff Gudang      | staff@gudanglps.test     |
| Supplier          | supplier@gudanglps.test  |

Admin, Manager, dan Staff dibuat dari data awal `.sql` (tanpa fitur daftar).
Supplier mendaftar sendiri di `/register` dan harus disetujui Admin.

## Logo

Ganti file `public/LogoGudangLPS.png` dengan logo Anda (nama file tetap).
Logo tampil di sidebar, halaman login/daftar, dan halaman verifikasi.

## Struktur singkat

- `database/warehouse.sql`  skema + seed
- `app/actions/`            server actions (seluruh aturan bisnis)
- `app/(auth)`, `app/(app)` halaman login/daftar dan halaman per peran
- `lib/`                    db, sesi/hak akses, perhitungan status stok
- `uploads/`                foto bukti kedatangan PO (tidak ikut git)

## Ringkasan aturan sesuai ketentuan

- PO: Pending -> Confirmed/Rejected -> In Transit (oleh Supplier) -> Inspecting -> Received/Returned
- Barang masuk: stok bertambah hanya saat Incoming Approved (PO otomatis Received)
- Barang keluar: Pending -> Approved/Rejected -> Shipped; stok berkurang hanya saat Shipped
- Satu PO hanya boleh punya satu Incoming yang tidak Rejected (dijaga juga lewat unique index DB)
- SKU dan nama kategori unik; SKU tidak bisa diedit; Stok Low harus > Stok Minimum
- Setiap Rejected/Returned wajib disertai alasan
