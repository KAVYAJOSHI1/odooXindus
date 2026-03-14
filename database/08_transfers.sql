-- 08_transfers.sql
CREATE TABLE internal_transfers (
    id BIGSERIAL PRIMARY KEY,
    from_location_id BIGINT REFERENCES locations(id),
    to_location_id BIGINT REFERENCES locations(id),
    status document_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transfer_items (
    id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES internal_transfers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC NOT NULL
);
