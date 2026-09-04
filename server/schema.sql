-- ============================================================
-- Mike Oppong Agyei Enterprise — Inventory Management System
-- MySQL schema (Product IDs are manually entered by the Warehouse
-- Manager, matching the printed codes on imported packaging)
-- ============================================================

CREATE DATABASE IF NOT EXISTS moae_inventory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE moae_inventory;

CREATE TABLE warehouses (
  warehouse_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  location      VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE stores (
  store_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  location      VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role          ENUM('administrator', 'warehouse_manager', 'store_manager') NOT NULL,
  warehouse_id  INT UNSIGNED NULL,
  store_id      INT UNSIGNED NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_store     FOREIGN KEY (store_id)     REFERENCES stores(store_id)         ON DELETE RESTRICT,
  CONSTRAINT chk_users_single_location CHECK (
    (role = 'warehouse_manager' AND warehouse_id IS NOT NULL AND store_id IS NULL) OR
    (role = 'store_manager'     AND store_id IS NOT NULL     AND warehouse_id IS NULL) OR
    (role = 'administrator'     AND warehouse_id IS NULL      AND store_id IS NULL)
  )
) ENGINE=InnoDB;

CREATE INDEX idx_users_role ON users(role);

-- ------------------------------------------------------------
-- products — product_id is now supplied by the Warehouse Manager,
-- matching the code printed on the imported packaging (e.g. "YD77B"),
-- not database-generated.
-- ------------------------------------------------------------
CREATE TABLE products (
  product_id     VARCHAR(50) PRIMARY KEY,
  product_name   VARCHAR(150) NOT NULL,
  size           VARCHAR(20),
  color          VARCHAR(50),
  unit_price     DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  reorder_level  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_products_name ON products(product_name);

CREATE TABLE inventory (
  inventory_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    VARCHAR(50) NOT NULL,
  warehouse_id  INT UNSIGNED NULL,
  store_id      INT UNSIGNED NULL,
  quantity      INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product   FOREIGN KEY (product_id)   REFERENCES products(product_id)     ON DELETE CASCADE,
  CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_store     FOREIGN KEY (store_id)     REFERENCES stores(store_id)         ON DELETE CASCADE,
  CONSTRAINT chk_inventory_single_location CHECK (
    (warehouse_id IS NOT NULL AND store_id IS NULL) OR
    (warehouse_id IS NULL AND store_id IS NOT NULL)
  ),
  UNIQUE KEY uq_inventory_product_warehouse (product_id, warehouse_id),
  UNIQUE KEY uq_inventory_product_store (product_id, store_id)
) ENGINE=InnoDB;

CREATE INDEX idx_inventory_product ON inventory(product_id);

CREATE TABLE shipments (
  shipment_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     VARCHAR(50) NOT NULL,
  warehouse_id   INT UNSIGNED NOT NULL,
  quantity       INT UNSIGNED NOT NULL CHECK (quantity > 0),
  date_received  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_product   FOREIGN KEY (product_id)   REFERENCES products(product_id)     ON DELETE RESTRICT,
  CONSTRAINT fk_shipments_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_shipments_date ON shipments(date_received);
CREATE INDEX idx_shipments_product_warehouse ON shipments(product_id, warehouse_id);

CREATE TABLE stock_requests (
  request_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id      INT UNSIGNED NOT NULL,
  product_id    VARCHAR(50) NOT NULL,
  quantity      INT UNSIGNED NOT NULL CHECK (quantity > 0),
  status        ENUM('pending', 'approved', 'rejected', 'fulfilled') NOT NULL DEFAULT 'pending',
  request_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_store   FOREIGN KEY (store_id)   REFERENCES stores(store_id)     ON DELETE CASCADE,
  CONSTRAINT fk_requests_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_requests_status ON stock_requests(status);
CREATE INDEX idx_requests_store ON stock_requests(store_id);

CREATE TABLE stock_transfers (
  transfer_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id            INT UNSIGNED NOT NULL,
  warehouse_id          INT UNSIGNED NOT NULL,
  store_id              INT UNSIGNED NOT NULL,
  approved_by           INT UNSIGNED NOT NULL,
  quantity_transferred  INT UNSIGNED NOT NULL CHECK (quantity_transferred > 0),
  status                ENUM('dispatched', 'received') NOT NULL DEFAULT 'dispatched',
  transfer_date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_date         DATETIME NULL,
  CONSTRAINT fk_transfers_request   FOREIGN KEY (request_id)   REFERENCES stock_requests(request_id) ON DELETE CASCADE,
  CONSTRAINT fk_transfers_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)   ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_store     FOREIGN KEY (store_id)     REFERENCES stores(store_id)           ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_approver  FOREIGN KEY (approved_by)  REFERENCES users(user_id)             ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_transfers_status ON stock_transfers(status);
CREATE INDEX idx_transfers_request ON stock_transfers(request_id);

CREATE TABLE sales (
  sale_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id     INT UNSIGNED NOT NULL,
  product_id   VARCHAR(50) NOT NULL,
  quantity     INT UNSIGNED NOT NULL CHECK (quantity > 0),
  total_price  DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  sale_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_store   FOREIGN KEY (store_id)   REFERENCES stores(store_id)     ON DELETE RESTRICT,
  CONSTRAINT fk_sales_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_store_product ON sales(store_id, product_id);

INSERT INTO warehouses (name, location) VALUES
  ('Main Warehouse', 'Kantamanto, Accra');

INSERT INTO stores (name, location) VALUES
  ('Store 1', 'Kantamanto, Accra'),
  ('Store 2', 'Kantamanto, Accra');