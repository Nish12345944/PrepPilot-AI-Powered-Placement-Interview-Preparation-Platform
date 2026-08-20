-- ============================================================
-- PrepPilot Production Patch — apply to existing databases
-- Run: psql -U preppilot -d preppilot_db -f database/patch_production.sql
-- ============================================================

-- XP transactions: prevent duplicate reward abuse
ALTER TABLE xp_transactions
  ADD CONSTRAINT xp_transactions_unique_reward
  UNIQUE (user_id, reason, reference_id);

-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date
  ON xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume
  ON resume_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user
  ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan
  ON plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date
  ON daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_study_materials_user
  ON study_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_company_questions_company
  ON company_questions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_questions_question
  ON company_questions(question_id);

-- Additional badges for richer gamification
INSERT INTO badges (name, description, type, criteria)
SELECT * FROM (VALUES
  ('Task Master', 'Complete 100 study tasks', 'completion', '{"metric":"tasks_completed","threshold":100}'::jsonb),
  ('Scholar', 'Generate 20 study materials', 'completion', '{"metric":"study_materials","threshold":20}'::jsonb),
  ('Interview Pro', 'Complete 25 interviews', 'completion', '{"metric":"interviews_completed","threshold":25}'::jsonb),
  ('Century Club', 'Solve 100 coding problems', 'completion', '{"metric":"problems_solved","threshold":100}'::jsonb)
) AS new_badges(name, description, type, criteria)
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = new_badges.name);