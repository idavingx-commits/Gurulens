-- Add the missing primary-school grades (1-5) so teachers can select Grade 2-5.
INSERT INTO "Grade" ("id", "slug", "name", "order") VALUES
  ('grade-1-primary', 'grade-1', 'Grade 1', 1),
  ('grade-2-primary', 'grade-2', 'Grade 2', 2),
  ('grade-3-primary', 'grade-3', 'Grade 3', 3),
  ('grade-4-primary', 'grade-4', 'Grade 4', 4),
  ('grade-5-primary', 'grade-5', 'Grade 5', 5)
ON CONFLICT ("slug") DO NOTHING;

-- Class thumbnails: Media id used as the class cover image.
ALTER TABLE "Class" ADD COLUMN "coverKey" TEXT;
