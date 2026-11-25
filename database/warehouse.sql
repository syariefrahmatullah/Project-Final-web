-- ============================================================
-- Warehouse Management System (gudangLPS) - PostgreSQL
-- Jalankan ulang aman: semua tabel di-drop lalu dibuat ulang.
-- Akun Admin, Warehouse Manager, dan Staff Gudang dibuat dari data awal
-- ini (tidak ada fitur pendaftaran). Hanya Supplier yang daftar via web.
-- Password seluruh akun contoh: password123
-- ============================================================

DROP TABLE IF EXISTS outgoing_items, outgoing_transactions,
  incoming_transactions, inspection_reports, po_items, purchase_orders,
  products, categories, users CASCADE;

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL
                 CHECK (role IN ('admin', 'manager', 'staff', 'supplier')),
  company        VARCHAR(160),
  phone          VARCHAR(40),
  address        VARCHAR(1000),
  
  supplier_status VARCHAR(20)
                 CHECK (supplier_status IN ('pending', 'approved', 'rejected')),
  reject_reason  VARCHAR(1000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  sku          VARCHAR(60) NOT NULL UNIQUE,
  name         VARCHAR(160) NOT NULL,
  category_id  INT NOT NULL REFERENCES categories(id),
  unit         VARCHAR(30) NOT NULL DEFAULT 'pcs',
  price        NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock    INT NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  low_stock    INT NOT NULL DEFAULT 0,
  description  VARCHAR(1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Stok Low harus lebih besar dari Stok Minimum
  CONSTRAINT low_gt_min CHECK (low_stock > min_stock)
);

-- Restock Order (PO)
-- Pending -> Confirmed / Rejected -> In Transit -> Inspecting -> Received / Returned
CREATE TABLE purchase_orders (
  id              SERIAL PRIMARY KEY,
  po_number       VARCHAR(30) NOT NULL UNIQUE,
  supplier_id     INT NOT NULL REFERENCES users(id),
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE NOT NULL,
  notes           VARCHAR(1000),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'rejected',
                                    'in_transit', 'inspecting',
                                    'received', 'returned')),
  reason          VARCHAR(1000),          -- alasan Rejected (Supplier) / Returned (Manager)
  proof_photo     VARCHAR(200),  -- foto bukti kedatangan (diunggah Supplier)
  refund_claim    VARCHAR(1000),          -- klaim refund jika barang ditolak
  refund_claimed_at TIMESTAMPTZ,
  created_by      INT NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE po_items (
  id          SERIAL PRIMARY KEY,
  po_id       INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0)
);

-- Laporan pemeriksaan fisik oleh Staff Gudang (tahap Inspecting)
CREATE TABLE inspection_reports (
  id          SERIAL PRIMARY KEY,
  po_id       INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  staff_id    INT NOT NULL REFERENCES users(id),
  is_match    BOOLEAN NOT NULL,   -- true: jumlah & kondisi sesuai
  notes       VARCHAR(1000) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incoming Transaction: Pending -> Approved / Rejected
CREATE TABLE incoming_transactions (
  id            SERIAL PRIMARY KEY,
  trx_number    VARCHAR(30) NOT NULL UNIQUE,
  po_id         INT NOT NULL REFERENCES purchase_orders(id),
  receive_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reason        VARCHAR(1000),           -- wajib jika Rejected
  notes         VARCHAR(1000),
  created_by    INT NOT NULL REFERENCES users(id),
  reviewed_by   INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Satu Nomor PO hanya boleh dipakai satu Incoming Transaction
-- yang tidak berstatus Rejected.
CREATE UNIQUE INDEX one_active_incoming_per_po
  ON incoming_transactions (po_id) WHERE status <> 'rejected';

-- Outgoing Transaction: Pending -> Approved / Rejected -> Shipped
CREATE TABLE outgoing_transactions (
  id          SERIAL PRIMARY KEY,
  trx_number  VARCHAR(30) NOT NULL UNIQUE,
  ship_date   DATE NOT NULL,
  customer    VARCHAR(160) NOT NULL,
  notes       VARCHAR(1000),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'shipped')),
  reason      VARCHAR(1000),             -- wajib jika Rejected
  created_by  INT NOT NULL REFERENCES users(id),
  reviewed_by INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outgoing_items (
  id          SERIAL PRIMARY KEY,
  outgoing_id INT NOT NULL REFERENCES outgoing_transactions(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- ============================================================
-- DATA AWAL
-- ============================================================
INSERT INTO users (name, email, password_hash, role, company, supplier_status) VALUES
 ('Administrator',    'admin@gudanglps.test',    '$2a$10$685HiV9OJ9auK3q5oQCcjedryQI4rOys2fKzii8GlE70VJaTmk16a', 'admin',    NULL, NULL),
 ('Budi Manager',     'manager@gudanglps.test',  '$2a$10$685HiV9OJ9auK3q5oQCcjedryQI4rOys2fKzii8GlE70VJaTmk16a', 'manager',  NULL, NULL),
 ('Sari Staff',       'staff@gudanglps.test',    '$2a$10$685HiV9OJ9auK3q5oQCcjedryQI4rOys2fKzii8GlE70VJaTmk16a', 'staff',    NULL, NULL),
 ('Andi Supplier',    'supplier@gudanglps.test', '$2a$10$685HiV9OJ9auK3q5oQCcjedryQI4rOys2fKzii8GlE70VJaTmk16a', 'supplier', 'PT Sumber Makmur', 'approved');

INSERT INTO categories (name) VALUES ('Elektronik'), ('Alat Tulis'), ('Perlengkapan Kemasan');

INSERT INTO products (sku, name, category_id, unit, price, stock, min_stock, low_stock, description) VALUES
 ('ELK-001', 'Kabel USB-C 1m',        1, 'pcs',  35000, 120, 20, 50, 'Kabel data dan pengisian daya'),
 ('ELK-002', 'Mouse Wireless',        1, 'pcs',  95000,  18, 15, 40, 'Mouse nirkabel 2.4 GHz'),
 ('ATK-001', 'Pulpen Hitam (box 12)', 2, 'box',  24000,   0, 10, 30, NULL),
 ('PKG-001', 'Kardus 40x30x20',       3, 'pcs',   4500, 300, 50, 100, 'Kardus pengiriman standar');
