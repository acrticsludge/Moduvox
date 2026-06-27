-- Add control_instruction column to voices table
ALTER TABLE voices ADD COLUMN IF NOT EXISTS control_instruction TEXT;

-- Seed default control instructions for existing preset voices
UPDATE voices 
SET control_instruction = 
  CASE preset_id
    WHEN 'calm-female' THEN 'A calm, warm female voice with a steady and reassuring tone. Ideal for policy and compliance training content.'
    WHEN 'energetic-male' THEN 'An upbeat, energetic male voice. Good for onboarding, introductions, and motivational content.'
    WHEN 'soft-narrator' THEN 'A gentle, measured voice with a soft delivery. Fits detailed explanations and tutorial-style content.'
    WHEN 'professional-tone' THEN 'A clear, authoritative voice with a professional business tone. Suits formal business content.'
    WHEN 'warm-friendly' THEN 'An approachable, conversational voice that makes complex topics feel simple and accessible.'
    ELSE NULL
  END
WHERE type = 'preset' AND control_instruction IS NULL;
