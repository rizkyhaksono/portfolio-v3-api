/*
  Warnings:

  - You are about to drop the column `bannerUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmin` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'GUEST');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bannerUrl",
DROP COLUMN "isAdmin",
ADD COLUMN     "avatar_minio_key" TEXT,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "banner_minio_key" TEXT,
ADD COLUMN     "banner_url" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicChatPost" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "PublicChatPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicChatPost_user_id_created_at_idx" ON "PublicChatPost"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "PublicChatPost_created_at_idx" ON "PublicChatPost"("created_at");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChatPost" ADD CONSTRAINT "PublicChatPost_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
