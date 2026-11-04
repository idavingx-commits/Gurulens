-- Creates the platform admin account (or promotes an existing account with this email).
INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "name", "ageEligible", "emailVerified", "updatedAt")
VALUES (gen_random_uuid()::text, 'admin@gurulens.lk', '$2b$12$rwbC8vxzKXKIi.AWsrbqNuUK.mYRUPiNYbGgb7EOjhbAxvUpJwyRu', 'admin', 'active', 'GuruLens Admin', true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = 'admin',
  "status" = 'active',
  "updatedAt" = CURRENT_TIMESTAMP;
