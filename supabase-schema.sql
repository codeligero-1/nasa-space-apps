
-- Enable foreign keys


-- Users table (for auth, teams, judges, admins)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team', 'judge', 'admin', 'public')),
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID,                        -- Reference to projects table
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

-- Team members (many-to-many)
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  joined_at TEXT NOT NULL DEFAULT (now()),
  PRIMARY KEY (team_id, user_id)
);

-- Projects/submissions
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  github_url TEXT,
  demo_url TEXT,
  video_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'reviewing', 'scored', 'winner')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

-- Judging criteria
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,       -- Scoring weight
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (now())
);

-- Scores (judge -> project -> criterion)
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score NUMERIC(4,2) NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now()),
  UNIQUE (project_id, judge_id, criterion_id)
);

-- Comments/feedback
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,   -- 1 = public, 0 = private (judge only)
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
