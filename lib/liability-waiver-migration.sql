-- ── LIABILITY WAIVER MIGRATION ────────────────────────────────────────────────
-- Run this in your Supabase SQL editor
-- Adds user agreement tracking to the subscriptions table

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10),
  ADD COLUMN IF NOT EXISTS first_document_warning_shown BOOLEAN NOT NULL DEFAULT false;

-- Allow users to update their own subscription (needed for marking first_document_warning_shown)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions'
      AND policyname = 'Users can update own subscription'
  ) THEN
    CREATE POLICY "Users can update own subscription" ON subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index for quick lookup (optional, low-cardinality but useful for analytics)
CREATE INDEX IF NOT EXISTS subscriptions_terms_accepted_idx
  ON subscriptions(user_id)
  WHERE terms_accepted_at IS NOT NULL;
