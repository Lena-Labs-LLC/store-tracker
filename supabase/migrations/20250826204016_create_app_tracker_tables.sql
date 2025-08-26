-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('playstore', 'appstore')),
    check_interval_hours INTEGER DEFAULT 24,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create apps table
CREATE TABLE IF NOT EXISTS apps (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, app_id)
);

-- Create monitoring_sessions table
CREATE TABLE IF NOT EXISTS monitoring_sessions (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
    apps_found INTEGER DEFAULT 0,
    new_apps_found INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_type ON stores(type);
CREATE INDEX IF NOT EXISTS idx_stores_last_checked ON stores(last_checked);
CREATE INDEX IF NOT EXISTS idx_apps_store_id ON apps(store_id);
CREATE INDEX IF NOT EXISTS idx_apps_discovered_at ON apps(discovered_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_store_id ON monitoring_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_started_at ON monitoring_sessions(started_at);

-- Enable Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since this is a single-user app)
-- In production, you might want more restrictive policies
CREATE POLICY "Allow all operations on stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations on apps" ON apps FOR ALL USING (true);
CREATE POLICY "Allow all operations on monitoring_sessions" ON monitoring_sessions FOR ALL USING (true);

-- Insert some sample data
INSERT INTO stores (name, url, type, check_interval_hours) VALUES
('Sample Play Store Developer', 'https://play.google.com/store/apps/developer?id=Sample+Developer', 'playstore', 24),
('Sample App Store Developer', 'https://apps.apple.com/developer/sample-developer/id123456789', 'appstore', 24)
ON CONFLICT (url) DO NOTHING;