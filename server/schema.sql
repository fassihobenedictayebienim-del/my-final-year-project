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
-- products — now purely product-level (model/style). Size and
-- colour no longer live here; unit_price is shared across all
-- variants of the product.
-- ------------------------------------------------------------
CREATE TABLE products (
  product_id     VARCHAR(50) PRIMARY KEY,
  product_name   VARCHAR(150) NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_products_name ON products(product_name);

-- ------------------------------------------------------------
-- product_variants — the actual sellable unit: product + colour + size.
-- ------------------------------------------------------------
CREATE TABLE product_variants (
  variant_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    VARCHAR(50) NOT NULL,
  color         VARCHAR(50) NOT NULL,
  size          VARCHAR(20) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  UNIQUE KEY uq_variant_combo (product_id, color, size)
) ENGINE=InnoDB;

CREATE INDEX idx_variant_product ON product_variants(product_id);

-- ------------------------------------------------------------
-- product_location_settings — reorder level is per (product, location),
-- not global. Same nullable warehouse_id/store_id split used elsewhere.
-- ------------------------------------------------------------
CREATE TABLE product_location_settings (
  setting_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    VARCHAR(50) NOT NULL,
  warehouse_id  INT UNSIGNED NULL,
  store_id      INT UNSIGNED NULL,
  reorder_level INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_pls_product   FOREIGN KEY (product_id)   REFERENCES products(product_id)     ON DELETE CASCADE,
  CONSTRAINT fk_pls_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  CONSTRAINT fk_pls_store     FOREIGN KEY (store_id)     REFERENCES stores(store_id)         ON DELETE CASCADE,
  CONSTRAINT chk_pls_single_location CHECK (
    (warehouse_id IS NOT NULL AND store_id IS NULL) OR
    (warehouse_id IS NULL AND store_id IS NOT NULL)
  ),
  UNIQUE KEY uq_pls_product_warehouse (product_id, warehouse_id),
  UNIQUE KEY uq_pls_product_store (product_id, store_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- inventory — now keyed by variant, not product.
-- ------------------------------------------------------------
CREATE TABLE inventory (
  inventory_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id    INT UNSIGNED NOT NULL,
  warehouse_id  INT UNSIGNED NULL,
  store_id      INT UNSIGNED NULL,
  quantity      INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_variant   FOREIGN KEY (variant_id)   REFERENCES product_variants(variant_id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)     ON DELETE CASCADE,
  CONSTRAINT fk_inventory_store     FOREIGN KEY (store_id)     REFERENCES stores(store_id)             ON DELETE CASCADE,
  CONSTRAINT chk_inventory_single_location CHECK (
    (warehouse_id IS NOT NULL AND store_id IS NULL) OR
    (warehouse_id IS NULL AND store_id IS NOT NULL)
  ),
  UNIQUE KEY uq_inventory_variant_warehouse (variant_id, warehouse_id),
  UNIQUE KEY uq_inventory_variant_store (variant_id, store_id)
) ENGINE=InnoDB;

CREATE INDEX idx_inventory_variant ON inventory(variant_id);

CREATE TABLE shipments (
  shipment_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id     INT UNSIGNED NOT NULL,
  warehouse_id   INT UNSIGNED NOT NULL,
  quantity       INT UNSIGNED NOT NULL CHECK (quantity > 0),
  date_received  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_variant   FOREIGN KEY (variant_id)   REFERENCES product_variants(variant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_shipments_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)     ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_shipments_date ON shipments(date_received);

CREATE TABLE stock_requests (
  request_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id      INT UNSIGNED NOT NULL,
  variant_id    INT UNSIGNED NOT NULL,
  quantity      INT UNSIGNED NOT NULL CHECK (quantity > 0),
  status        ENUM('pending', 'approved', 'rejected', 'fulfilled') NOT NULL DEFAULT 'pending',
  request_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_store   FOREIGN KEY (store_id)   REFERENCES stores(store_id)             ON DELETE CASCADE,
  CONSTRAINT fk_requests_variant FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_requests_status ON stock_requests(status);

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

CREATE TABLE sales (
  sale_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id     INT UNSIGNED NOT NULL,
  variant_id   INT UNSIGNED NOT NULL,
  quantity     INT UNSIGNED NOT NULL CHECK (quantity > 0),
  total_price  DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  sale_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_store   FOREIGN KEY (store_id)   REFERENCES stores(store_id)             ON DELETE RESTRICT,
  CONSTRAINT fk_sales_variant FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_sales_date ON sales(sale_date);

CREATE TABLE activity_logs (
  log_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(100) NULL,
  user_role VARCHAR(30) NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activitylog_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_activitylog_created ON activity_logs(created_at);

INSERT INTO warehouses (name, location) VALUES ('Main Warehouse', 'Kantamanto, Accra');
INSERT INTO stores (name, location) VALUES
  ('Store 1', 'Kantamanto, Accra'),
  ('Store 2', 'Kantamanto, Accra');