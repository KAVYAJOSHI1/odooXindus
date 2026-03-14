-- 01_enums.sql
-- Drop types if they exist (useful during development/resets)
DROP TYPE IF EXISTS operation_type_enum CASCADE;
DROP TYPE IF EXISTS document_status_enum CASCADE;

CREATE TYPE operation_type_enum AS ENUM (
    'RECEIPT',
    'DELIVERY',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'ADJUSTMENT'
);

CREATE TYPE document_status_enum AS ENUM (
    'DRAFT',
    'READY',
    'DONE',
    'CANCELLED'
);
