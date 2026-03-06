-- Career Portal Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Portals table - stores portal configurations
CREATE TABLE IF NOT EXISTS portals (
  id TEXT PRIMARY KEY,                    -- Crockford Base32 ID (8 chars)
  config JSONB NOT NULL,                  -- Full portal configuration
  corp_token TEXT,                        -- Bullhorn corpToken (indexed for lookup)
  swimlane TEXT,                          -- Bullhorn swimlane
  company_name TEXT,                      -- For display/search
  owner_email TEXT,                       -- Who created this portal
  tier TEXT DEFAULT 'preview'             -- preview, basic, standard, pro
    CHECK (tier IN ('preview', 'basic', 'standard', 'pro')),
  domain TEXT,                            -- Registered domain (for auth validation)
  stripe_customer_id TEXT,                -- Stripe customer (for paid tiers)
  stripe_subscription_id TEXT,            -- Stripe subscription (standard/pro)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                  -- 90-day TTL for previews, null for paid
);

-- Index for domain lookups (auth validation)
CREATE INDEX IF NOT EXISTS idx_portals_domain ON portals(domain);

-- Index for corp_token lookups
CREATE INDEX IF NOT EXISTS idx_portals_corp_token ON portals(corp_token);

-- Applications table - tracks job applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT REFERENCES portals(id),
  job_id INTEGER NOT NULL,
  job_title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  resume_path TEXT,                       -- Supabase Storage path
  applied_via_linkedin BOOLEAN DEFAULT FALSE,
  attribution JSONB,                      -- Full attribution data
  source TEXT,                            -- Quick access: google, linkedin, etc.
  status TEXT DEFAULT 'new'               -- new, submitted, error
    CHECK (status IN ('new', 'submitted', 'error')),
  bullhorn_candidate_id INTEGER,          -- Bullhorn candidate ID after submission
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for portal-level application queries
CREATE INDEX IF NOT EXISTS idx_applications_portal ON applications(portal_id, created_at DESC);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(portal_id, source);

-- Analytics events table (pro tier)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT REFERENCES portals(id),
  event_type TEXT NOT NULL,               -- page_view, job_view, apply_start, apply_complete, share
  job_id INTEGER,
  attribution JSONB,
  device TEXT,
  platform TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_portal_time ON analytics_events(portal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(portal_id, event_type);

-- Email notification config
CREATE TABLE IF NOT EXISTS notification_config (
  portal_id TEXT PRIMARY KEY REFERENCES portals(id),
  notify_emails TEXT[] DEFAULT '{}',      -- Array of email addresses
  notify_on_apply BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
-- For now, service role handles all writes. Anon key can read portal configs.
ALTER TABLE portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_config ENABLE ROW LEVEL SECURITY;

-- Public can read non-expired portal configs (needed for client-side portal loading)
CREATE POLICY "Public can read active portals" ON portals
  FOR SELECT USING (
    tier != 'preview' OR expires_at IS NULL OR expires_at > NOW()
  );

-- Service role can do everything (used by API functions)
CREATE POLICY "Service role full access portals" ON portals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access applications" ON applications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access analytics" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access notifications" ON notification_config
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portals_updated_at
  BEFORE UPDATE ON portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notification_config_updated_at
  BEFORE UPDATE ON notification_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
