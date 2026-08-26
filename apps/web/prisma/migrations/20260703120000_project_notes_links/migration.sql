-- Freeform notes and a JSON list of {id,label,url} links per project.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "links" TEXT NOT NULL DEFAULT '[]';
