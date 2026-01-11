-- NO-OP MIGRATION
-- This migration originally added EntityGstin, but it was timestamped before the migration that creates "Entity".
-- The real EntityGstin migration lives in:
--   20260110201000_entity_gstin/migration.sql
--
-- Keeping this file as a no-op preserves migration history and fixes shadow DB application order.


