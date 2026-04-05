-- meetings table (uses client_id, not company_id)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_type VARCHAR(50) NOT NULL DEFAULT 'board', -- 'board', 'agm', 'egm', 'custom'
  venue_type VARCHAR(50) NOT NULL DEFAULT 'registered_office', -- 'registered_office', 'custom', 'video'
  venue_address TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_client_id ON meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meetings" ON meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meetings" ON meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meetings" ON meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meetings" ON meetings FOR DELETE USING (auth.uid() = user_id);

-- extend documents table for meeting linkage
ALTER TABLE documents ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_subtype VARCHAR(50); -- 'notice', 'agenda', 'minutes'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signatory_director_id UUID REFERENCES directors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_meeting_id ON documents(meeting_id);
