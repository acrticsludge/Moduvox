-- Add gender column to voices table for controlling voice characteristics in TTS

ALTER TABLE voices ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'neutral'));

-- Update existing preset voices with their known genders
UPDATE voices SET gender = 'female' WHERE preset_id = 'calm-female';
UPDATE voices SET gender = 'male' WHERE preset_id = 'energetic-male';
UPDATE voices SET gender = 'neutral' WHERE preset_id = 'soft-narrator';
UPDATE voices SET gender = 'neutral' WHERE preset_id = 'professional-tone';
UPDATE voices SET gender = 'neutral' WHERE preset_id = 'warm-friendly';
