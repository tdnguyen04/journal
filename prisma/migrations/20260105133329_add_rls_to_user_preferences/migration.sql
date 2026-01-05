-- Enable RLS
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "user_isolation_policy" ON "user_preferences" FOR ALL USING (
    "userId" = (
        SELECT NULLIF(
                current_setting('request.jwt.claim.sub', true),
                ''
            )::uuid
    )
);

