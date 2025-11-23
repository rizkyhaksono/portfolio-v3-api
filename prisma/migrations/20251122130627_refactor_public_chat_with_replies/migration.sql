/*
  Warnings:

  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublicChatPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "PublicChatPost" DROP CONSTRAINT "PublicChatPost_user_id_fkey";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "PublicChatPost";

-- CreateTable
CREATE TABLE "PublicChatMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reply_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "PublicChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicChatMessage_user_id_created_at_idx" ON "PublicChatMessage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "PublicChatMessage_created_at_idx" ON "PublicChatMessage"("created_at");

-- CreateIndex
CREATE INDEX "PublicChatMessage_reply_to_id_idx" ON "PublicChatMessage"("reply_to_id");

-- AddForeignKey
ALTER TABLE "PublicChatMessage" ADD CONSTRAINT "PublicChatMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChatMessage" ADD CONSTRAINT "PublicChatMessage_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "PublicChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
