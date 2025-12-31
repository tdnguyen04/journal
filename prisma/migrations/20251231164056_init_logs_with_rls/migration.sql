-- 1. Create the Table
CREATE TABLE "logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
-- 2. Enable RLS
ALTER TABLE "logs" ENABLE ROW LEVEL SECURITY;
-- 3. Create Policy
CREATE POLICY "user_isolation_policy" ON "logs" FOR ALL USING (
    "userId" = (
        -- SINGLE QUOTES for the string value!
        SELECT NULLIF(
                current_setting('request.jwt.claim.sub', true),
                ''
            )::uuid
    )
);