-- docs/migrations/006_add_preset_id.sql
-- Add preset_id column for preset voices (references the preset identifier)

ALTER TABLE voices ADD COLUMN preset_id TEXT;
