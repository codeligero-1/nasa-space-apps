/**
 * Database schema — define tables here
 * Run with: npm run db:init
 *
 * NOTE: This schema is for a JUDGING PLATFORM (users, teams, projects, criteria, scores, comments).
 * It does NOT integrate the astronaut-earth-baseline-1.db / VITAL domain dataset.
 * That integration is on HOLD pending explicit product approval.
 * Do not invent integration — document or implement only after explicit product decision.
 *
 * VITAL Astronaut tables added for NFC-based authentication and health records.
 */

export const schema = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table (for auth, teams, judges, admins)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team', 'judge', 'admin', 'public')),
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  project_id TEXT,                        -- Reference to projects table
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team members (many-to-many)
CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id)
);

-- Projects/submissions
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- UUID
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  github_url TEXT,
  demo_url TEXT,
  video_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'reviewing', 'scored', 'winner')) DEFAULT 'draft',
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Judging criteria
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  weight REAL NOT NULL DEFAULT 1.0,       -- Scoring weight
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Scores (judge -> project -> criterion)
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  judge_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, judge_id, criterion_id)
);

-- Comments/feedback
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,   -- 1 = public, 0 = private (judge only)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Astronauts table (VITAL - NFC-based authentication)
CREATE TABLE IF NOT EXISTS astronauts (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,
  role TEXT NOT NULL,                     -- e.g., 'Commander', 'Pilot', 'Mission Specialist'
  mission TEXT NOT NULL,                  -- e.g., 'Artemis III', 'ISS Expedition 72'
  nfc_card_id TEXT UNIQUE NOT NULL,       -- NFC card serial number
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Health records table (VITAL - linked to astronauts)
CREATE TABLE IF NOT EXISTS health_records (
  id TEXT PRIMARY KEY,                    -- UUID
  astronaut_id TEXT NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blood', 'vitals', 'radiation')),
  data TEXT NOT NULL,                     -- JSON blob with measurement data
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_astronauts_nfc ON astronauts(nfc_card_id);
CREATE INDEX IF NOT EXISTS idx_health_records_astronaut ON health_records(astronaut_id);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON health_records(type);
`;

export type User = {
  id: string
  email: string
  name: string
  role: 'team' | 'judge' | 'admin' | 'public'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Team = {
  id: string
  name: string
  description: string | null
  project_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  team_id: string
  title: string
  description: string | null
  github_url: string | null
  demo_url: string | null
  video_url: string | null
  status: 'draft' | 'submitted' | 'reviewing' | 'scored' | 'winner'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type Criterion = {
  id: string
  name: string
  description: string | null
  weight: number
  max_score: number
  created_at: string
}

export type Score = {
  id: string
  project_id: string
  judge_id: string
  criterion_id: string
  score: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  project_id: string
  user_id: string
  content: string
  is_public: number
  created_at: string
  updated_at: string
}

// VITAL Astronaut types
export type Astronaut = {
  id: string
  name: string
  role: string
  mission: string
  nfc_card_id: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type HealthRecord = {
  id: string
  astronaut_id: string
  type: 'blood' | 'vitals' | 'radiation'
  data: string // JSON string
  recorded_at: string
}