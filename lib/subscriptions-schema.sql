-- ── SUBSCRIPTIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  -- free | founding | starter | growth | firm
  status text NOT NULL DEFAULT 'active',
  -- active | cancelled | past_due
  monthly_doc_limit integer NOT NULL DEFAULT 3,
  docs_used_this_month integer NOT NULL DEFAULT 0,
  billing_cycle_start date,
  referred_by uuid REFERENCES auth.users(id),
  free_months_earned integer NOT NULL DEFAULT 0,
  free_months_used integer NOT NULL DEFAULT 0,
  is_advisor boolean NOT NULL DEFAULT false,
  advisor_tier text,
  -- community | strategic
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── REFERRALS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  -- pending | signed_up | converted | rewarded
  referee_email text,
  signed_up_at timestamptz,
  converted_at timestamptz,
  -- when referee completes second paid month
  rewarded_at timestamptz,
  -- when referrer gets free month credited
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Index for fast referral code lookup
CREATE UNIQUE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);

-- ── ADVISORS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  tier text NOT NULL DEFAULT 'community',
  -- community | strategic
  status text NOT NULL DEFAULT 'active',
  referral_credits_earned integer NOT NULL DEFAULT 0,
  -- in paise
  referral_credits_balance integer NOT NULL DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view own record" ON advisors
  FOR SELECT USING (auth.uid() = user_id);

-- ── DEFAULT SUBSCRIPTION ON SIGNUP ────────────────────────────────────
-- Run this function via Supabase trigger to auto-create subscription
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, monthly_doc_limit, billing_cycle_start)
  VALUES (NEW.id, 'free', 3, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- ── HELPER: generate unique referral code ─────────────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code(user_id uuid)
RETURNS text AS $$
DECLARE
  code text;
  exists_check integer;
BEGIN
  LOOP
    -- 8 character alphanumeric code
    code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT COUNT(*) INTO exists_check FROM referrals WHERE referral_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
