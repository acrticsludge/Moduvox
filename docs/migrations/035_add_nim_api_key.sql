-- Add nim_api_key column for NVIDIA NIM API key storage
-- Encrypted at rest using AES-256-GCM (same pattern as gemini_api_key)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nim_api_key TEXT;
