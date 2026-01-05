-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "preferences" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

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
