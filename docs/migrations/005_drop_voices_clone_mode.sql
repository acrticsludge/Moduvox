-- docs/migrations/005_drop_voices_clone_mode.sql
-- clone_mode moves to presentation-level config (added during generation flow)

ALTER TABLE voices DROP COLUMN clone_mode;
