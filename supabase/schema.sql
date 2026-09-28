-- ================================================================
-- FLORALYN — Supabase Database Schema
-- ================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- APPOINTMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone           TEXT        NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
  instagram       TEXT        CHECK (char_length(instagram) <= 60),
  email           TEXT        CHECK (char_length(email) <= 200),
  preferred_date  DATE        NOT NULL,
  preferred_time  TEXT        NOT NULL CHECK (char_length(preferred_time) <= 20),
  service         TEXT        NOT NULL CHECK (service IN (
                    'Simple Manicure',
                    'Gel Nails',
                    'Custom Design',
                    'Bridal / Special Occasion'
                  )),
  message         TEXT        CHECK (char_length(message) <= 1000),
  status          TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED'
                  )),
  notes           TEXT,       -- Private admin notes, never shown to customer
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security: only authenticated admin can access appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on appointments"
  ON appointments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================================
-- SERVICES
-- ================================================================
CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT    NOT NULL CHECK (char_length(name) <= 100),
  description TEXT    CHECK (char_length(description) <= 500),
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public visitors can read enabled services (for the booking form dropdown)
CREATE POLICY "Public read enabled services"
  ON services FOR SELECT
  USING (enabled = true);

-- Admin can manage all services
CREATE POLICY "Admin full access on services"
  ON services FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================================
-- GALLERY
-- ================================================================
CREATE TABLE IF NOT EXISTS gallery (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path  TEXT    NOT NULL,                    -- Path in Supabase Storage bucket
  public_url    TEXT    NOT NULL,                    -- Full public URL
  alt_text      TEXT    NOT NULL DEFAULT 'Nail art by Floralyn' CHECK (char_length(alt_text) <= 200),
  title         TEXT    CHECK (char_length(title) <= 100),
  visible       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  file_size     INTEGER,                             -- Bytes
  width         INTEGER,
  height        INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Public visitors can see visible gallery items
CREATE POLICY "Public read visible gallery"
  ON gallery FOR SELECT
  USING (visible = true);

-- Admin can manage all gallery items
CREATE POLICY "Admin full access on gallery"
  ON gallery FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================================
-- SETTINGS
-- ================================================================
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT    PRIMARY KEY,
  value       JSONB   NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Only admin can read or write settings
CREATE POLICY "Admin only on settings"
  ON settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================================
-- AUDIT LOG
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      TEXT        NOT NULL CHECK (char_length(action) <= 100),
  entity_type TEXT        CHECK (char_length(entity_type) <= 50),
  entity_id   TEXT        CHECK (char_length(entity_id) <= 100),
  details     JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin can read audit log; admin actions insert log entries server-side
CREATE POLICY "Admin only on audit_log"
  ON audit_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ================================================================
-- TRIGGERS — auto-update updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_gallery_updated_at
  BEFORE UPDATE ON gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SEED DATA — Default services
-- ================================================================
INSERT INTO services (name, description, enabled, sort_order) VALUES
  ('Simple Manicure',          'Clean and classic nail care with your choice of polish',           true, 1),
  ('Gel Nails',                'Long-lasting gel polish with a flawless, chip-resistant finish',   true, 2),
  ('Custom Design',            'Bespoke nail art tailored to your vision and inspiration',          true, 3),
  ('Bridal / Special Occasion','Stunning, memorable designs for your most important moments',       true, 4)
ON CONFLICT DO NOTHING;

-- ================================================================
-- SEED DATA — Default settings
-- ================================================================
INSERT INTO settings (key, value) VALUES
  ('business', '{
    "name":       "Floralyn",
    "tagline":    "Soft. Romantic. Pastel nails.",
    "email":      "floralyyn7@gmail.com",
    "instagram":  "https://www.instagram.com/floralyn_nails_07",
    "whatsapp":   "",
    "timezone":   "Asia/Kolkata"
  }'),
  ('booking', '{
    "advance_days_min":       1,
    "advance_days_max":       90,
    "business_hours_start":   "10:00",
    "business_hours_end":     "19:00",
    "closed_days":            [0],
    "booking_notice_hours":   12
  }')
ON CONFLICT DO NOTHING;

-- ================================================================
-- SUPABASE STORAGE — Gallery bucket
-- ================================================================
-- Run this separately in Supabase Dashboard → Storage → New Bucket:
--   Bucket name: gallery
--   Public: true
--   File size limit: 10 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/avif
--
-- Then add these Storage policies:
-- 1. Public read (SELECT): (bucket_id = 'gallery')
-- 2. Admin upload (INSERT): auth.role() = 'authenticated' AND bucket_id = 'gallery'
-- 3. Admin delete (DELETE): auth.role() = 'authenticated' AND bucket_id = 'gallery'
