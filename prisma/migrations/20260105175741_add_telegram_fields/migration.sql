/*
  Warnings:

  - A unique constraint covering the columns `[telegramChatId]` on the table `user_preferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectToken]` on the table `user_preferences` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "connectToken" TEXT,
ADD COLUMN     "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_telegramChatId_key" ON "user_preferences"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_connectToken_key" ON "user_preferences"("connectToken");
