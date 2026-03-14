-- 05_stock.sql
CREATE TABLE stock_levels (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    quantity NUMERIC DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, location_id)
);

CREATE TABLE stock_ledger (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    operation_type operation_type_enum NOT NULL,
    quantity NUMERIC NOT NULL,
    reference_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
