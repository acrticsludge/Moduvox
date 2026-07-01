-- docs/migrations/023_add_previous_status.sql
-- Track the status before archival so restore can return to the original state

ALTER TABLE presentations ADD COLUMN previous_status TEXT CHECK (previous_status IN ('draft', 'ready'));

-- Set previous_status for existing archived presentations to 'draft' (safe default)
UPDATE presentations SET previous_status = 'draft' WHERE status = 'archived' AND previous_status IS NULL;
