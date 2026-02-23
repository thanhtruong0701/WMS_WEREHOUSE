-- ============================================================
-- WMS Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'staff', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('material', 'fg')),
    location VARCHAR(200),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- MATERIALS (Nguyên Vật Liệu)
-- ============================================================
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    supplier VARCHAR(200),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    warehouse_location VARCHAR(100),
    low_stock_threshold DECIMAL(15,3) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_materials_code ON materials(code);
CREATE INDEX idx_materials_supplier ON materials(supplier);
CREATE INDEX idx_materials_warehouse ON materials(warehouse_id);

-- ============================================================
-- MATERIAL INVENTORY SNAPSHOT (Tồn kho theo kỳ)
-- ============================================================
CREATE TABLE material_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    opening_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_in DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_out DECIMAL(15,3) NOT NULL DEFAULT 0,
    closing_stock DECIMAL(15,3) GENERATED ALWAYS AS (opening_stock + total_in - total_out) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(material_id, period_date)
);

-- ============================================================
-- INVENTORY TRANSACTIONS (Material In/Out)
-- ============================================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('in', 'out')),
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_no VARCHAR(100),
    supplier VARCHAR(200),
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
    created_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_inv_trans_material ON inventory_transactions(material_id);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_trans_status ON inventory_transactions(status);

-- ============================================================
-- FG PRODUCTS (Thành Phẩm)
-- ============================================================
CREATE TABLE fg_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    customer VARCHAR(200),
    order_no VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    low_stock_threshold DECIMAL(15,3) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(code, size, color, order_no)
);

CREATE INDEX idx_fg_code ON fg_products(code);
CREATE INDEX idx_fg_customer ON fg_products(customer);
CREATE INDEX idx_fg_order ON fg_products(order_no);
CREATE INDEX idx_fg_warehouse ON fg_products(warehouse_id);

-- ============================================================
-- FG INVENTORY SNAPSHOT
-- ============================================================
CREATE TABLE fg_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fg_product_id UUID NOT NULL REFERENCES fg_products(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    opening_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    production_in DECIMAL(15,3) NOT NULL DEFAULT 0,
    shipment_out DECIMAL(15,3) NOT NULL DEFAULT 0,
    balance_stock DECIMAL(15,3) GENERATED ALWAYS AS (opening_stock + production_in - shipment_out) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(fg_product_id, period_date)
);

-- ============================================================
-- PRODUCTION TRANSACTIONS (FG Nhập từ sản xuất)
-- ============================================================
CREATE TABLE production_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fg_product_id UUID NOT NULL REFERENCES fg_products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id),
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    production_order_no VARCHAR(100),
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
    created_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_prod_trans_fg ON production_transactions(fg_product_id);
CREATE INDEX idx_prod_trans_date ON production_transactions(transaction_date);
CREATE INDEX idx_prod_trans_status ON production_transactions(status);

-- ============================================================
-- SHIPMENT TRANSACTIONS (FG Xuất cho khách hàng)
-- ============================================================
CREATE TABLE shipment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fg_product_id UUID NOT NULL REFERENCES fg_products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id),
    customer VARCHAR(200),
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shipment_no VARCHAR(100),
    invoice_no VARCHAR(100),
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
    created_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ship_trans_fg ON shipment_transactions(fg_product_id);
CREATE INDEX idx_ship_trans_date ON shipment_transactions(transaction_date);
CREATE INDEX idx_ship_trans_status ON shipment_transactions(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    username VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fg_products_updated_at BEFORE UPDATE ON fg_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inv_trans_updated_at BEFORE UPDATE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prod_trans_updated_at BEFORE UPDATE ON production_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ship_trans_updated_at BEFORE UPDATE ON shipment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_material_inv_updated_at BEFORE UPDATE ON material_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fg_inv_updated_at BEFORE UPDATE ON fg_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
