-- docs/migrations/007_add_preview_audio_path.sql
-- Cache the test-generated preview audio so we never regenerate it

ALTER TABLE voices ADD COLUMN preview_audio_path TEXT;
