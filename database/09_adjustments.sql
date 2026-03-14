-- 09_adjustments.sql
CREATE TABLE adjustments (
    id BIGSERIAL PRIMARY KEY,
    location_id BIGINT NOT NULL REFERENCES locations(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adjustment_items (
    id BIGSERIAL PRIMARY KEY,
    adjustment_id BIGINT NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity_change NUMERIC NOT NULL
);
