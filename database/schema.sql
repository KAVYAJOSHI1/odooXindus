-- schema.sql
-- Master script to initialize the CoreInventory database schema

\i 01_enums.sql
\i 02_users.sql
\i 03_products.sql
\i 04_warehouses.sql
\i 05_stock.sql
\i 06_receipts.sql
\i 07_deliveries.sql
\i 08_transfers.sql
\i 09_adjustments.sql

-- End of schema execution
