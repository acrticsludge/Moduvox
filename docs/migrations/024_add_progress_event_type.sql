-- Add 'progress' as a valid event_type for periodic progress tracking
ALTER TABLE viewer_events DROP CONSTRAINT IF EXISTS viewer_events_event_type_check;
ALTER TABLE viewer_events ADD CONSTRAINT viewer_events_event_type_check
  CHECK (event_type IN ('opened', 'slide_viewed', 'completed', 'closed', 'progress'));
