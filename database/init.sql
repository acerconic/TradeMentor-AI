-- =============================================
-- TradeMentor-AI Database Schema
-- =============================================

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_language AS ENUM ('RU', 'UZ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'LOGIN', 'LOGOUT', 'OPEN_LESSON', 'COMPLETE_LESSON',
    'UPLOAD_IMAGE', 'AI_REQUEST', 'EXAM_RESULT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── USERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login         VARCHAR(50)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'student',
  name          VARCHAR(100) NOT NULL,
  language      user_language        DEFAULT 'RU',
  interests     TEXT,                              -- JSON string
  onboarding_passed BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── COURSES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  language    user_language NOT NULL DEFAULT 'RU',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── MODULES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── LESSONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,  -- Markdown / HTML
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── USER PROGRESS ─────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- ── ASSESSMENT RESULTS (Onboarding test) ─────
CREATE TABLE IF NOT EXISTS assessment_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers     TEXT        NOT NULL,  -- JSON
  score       NUMERIC(5,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── EXAMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID        REFERENCES courses(id) ON DELETE SET NULL,
  score       NUMERIC(5,2),
  total_score NUMERIC(5,2),
  answers     TEXT        NOT NULL,  -- JSON
  feedback    TEXT,                  -- AI feedback
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI REQUESTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS ai_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL DEFAULT 'chat',  -- 'chat' | 'vision'
  message     TEXT        NOT NULL,
  response    TEXT        NOT NULL,
  provider    VARCHAR(50),
  metadata    TEXT,                  -- JSON (vision analysis result)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOGS ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  details     TEXT,                  -- JSON
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user   ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_course     ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module     ON lessons(module_id);
