-- 06_receipts.sql
CREATE TABLE receipts (
    id BIGSERIAL PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    status document_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE receipt_items (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC NOT NULL
);
