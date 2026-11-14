
-- Enable foreign keys


-- Users table (for auth, teams, judges, admins)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team', 'judge', 'admin', 'public')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID,                        -- Reference to projects table
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members (many-to-many)
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Judging criteria
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,       -- Scoring weight
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scores (judge -> project -> criterion)
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score NUMERIC(4,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, judge_id, criterion_id)
);

-- Comments/feedback
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    -- UUID
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,   -- 1 = public, 0 = private (judge only)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Astronaut ownership is assigned only by an administrator. Do not add a
-- client insert/update policy to astronaut_profiles.
CREATE TABLE IF NOT EXISTS public.astronaut_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  astronaut_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  mission_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.astronaut_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS astronaut_profiles_read_own ON public.astronaut_profiles;
CREATE POLICY astronaut_profiles_read_own
  ON public.astronaut_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cbc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('current', 'baseline')),
  sample_id TEXT,
  date_time TIMESTAMPTZ,
  date_precision TEXT CHECK (date_precision IS NULL OR date_precision IN ('date', 'datetime')),
  mission_day NUMERIC CHECK (mission_day IS NULL OR mission_day >= 0),
  readings JSONB NOT NULL CHECK (jsonb_typeof(readings) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbc_records_user_date
  ON public.cbc_records(user_id, date_time DESC);

ALTER TABLE public.cbc_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cbc_records_read_own ON public.cbc_records;
CREATE POLICY cbc_records_read_own
  ON public.cbc_records
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.astronaut_profiles
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cbc_records_insert_own ON public.cbc_records;
CREATE POLICY cbc_records_insert_own
  ON public.cbc_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.astronaut_profiles
      WHERE user_id = auth.uid()
    )
  );

GRANT SELECT ON public.astronaut_profiles TO authenticated;
GRANT SELECT, INSERT ON public.cbc_records TO authenticated;
REVOKE ALL ON public.astronaut_profiles FROM PUBLIC, anon;
REVOKE ALL ON public.cbc_records FROM PUBLIC, anon;

-- Disable access to the former shared demo table if it was created by an older schema.
DO $$
BEGIN
  IF to_regclass('public.demo_cbc_records') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS demo_cbc_records_read_anonymous ON public.demo_cbc_records';
    EXECUTE 'DROP POLICY IF EXISTS demo_cbc_records_insert_anonymous ON public.demo_cbc_records';
    EXECUTE 'REVOKE ALL ON TABLE public.demo_cbc_records FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- After creating an Auth user, link it from the SQL editor (repeat per astronaut):
-- INSERT INTO public.astronaut_profiles (user_id, astronaut_id, display_name, mission_code)
-- VALUES ('<auth.users.id>', 'AST-001', 'Alex Vance', 'ARTEMIS-V');
