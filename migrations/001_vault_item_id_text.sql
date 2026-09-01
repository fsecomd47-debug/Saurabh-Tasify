-- Migration: Change vault item_id columns from UUID to TEXT
-- Vault catalog uses string IDs like "pet-cerberus", not UUIDs

-- 1. Drop FK constraints first (they reference vault_items.id which is UUID)
ALTER TABLE vault_ownership DROP CONSTRAINT IF EXISTS vault_ownership_item_id_fk;
ALTER TABLE vault_transactions DROP CONSTRAINT IF EXISTS vault_transactions_item_id_fk;
ALTER TABLE vault_wishlist DROP CONSTRAINT IF EXISTS vault_wishlist_item_id_fk;
ALTER TABLE vault_goals DROP CONSTRAINT IF EXISTS vault_goals_item_id_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_active_pet_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_active_vehicle_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_profile_frame_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_profile_title_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_profile_badge_fk;
ALTER TABLE vault_equipment DROP CONSTRAINT IF EXISTS vault_equipment_theme_fk;

-- 2. Change column types from uuid to text
ALTER TABLE vault_ownership ALTER COLUMN item_id TYPE text;
ALTER TABLE vault_transactions ALTER COLUMN item_id TYPE text;
ALTER TABLE vault_wishlist ALTER COLUMN item_id TYPE text;
ALTER TABLE vault_goals ALTER COLUMN item_id TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN active_pet TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN active_vehicle TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN profile_frame TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN profile_title TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN profile_badge TYPE text;
ALTER TABLE vault_equipment ALTER COLUMN theme TYPE text;
