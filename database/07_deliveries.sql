-- 07_deliveries.sql
CREATE TABLE deliveries (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    status document_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC NOT NULL
);
