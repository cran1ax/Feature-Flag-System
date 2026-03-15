ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  ADD COLUMN IF NOT EXISTS targeted_users TEXT[] DEFAULT '{}';
