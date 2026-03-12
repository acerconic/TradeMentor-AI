-- =============================================
-- TradeMentor-AI v2 Migration
-- PDF Ingestion Pipeline Tables
-- =============================================

-- Add category/level to courses if not present
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Beginner';

-- Add position/summary/pdf_path to lessons if not present
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;

-- Add position to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;

-- ── UPLOADED MATERIALS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_materials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name    VARCHAR(500) NOT NULL,
  stored_path      TEXT NOT NULL,
  extracted_text   TEXT,
  detected_category VARCHAR(100),
  ai_metadata      TEXT,         -- JSON: {course_title, module_title, lesson_title, summary}
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id        UUID REFERENCES lessons(id) ON DELETE SET NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | processed | failed
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_materials_status ON uploaded_materials(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_category ON uploaded_materials(detected_category);

-- Expand audit_action enum to include new actions
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PDF_IMPORT';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COURSE_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LESSON_CREATE';
