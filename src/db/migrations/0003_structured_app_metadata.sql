ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "subjects" text[];
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "grade_bands" text[];
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "audience" text;
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "interaction_type" text;
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "learning_process" text[];
