-- Add emotional context fields to logs
ALTER TABLE "logs" ADD COLUMN "mood" TEXT;
ALTER TABLE "logs" ADD COLUMN "energy" TEXT;

-- Add auto-chain threshold to user preferences
ALTER TABLE "user_preferences" ADD COLUMN "autoChainMinutes" INTEGER NOT NULL DEFAULT 15;
