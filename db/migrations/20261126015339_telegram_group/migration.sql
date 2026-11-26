-- CreateEnum
CREATE TYPE "public"."TelegramCheckinStatus" AS ENUM ('WAITING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TelegramProofKind" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "public"."TelegramParticipant" (
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dmStartedAt" TIMESTAMP(3),
    "lastLossDay" DATE,

    CONSTRAINT "TelegramParticipant_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "public"."TelegramCheckin" (
    "chatId" TEXT NOT NULL,
    "sourceMessageId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."TelegramCheckinStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,
    "proofKind" "public"."TelegramProofKind",
    "proofFileId" TEXT,
    "receiptMessageId" INTEGER,
    "threadId" INTEGER,

    CONSTRAINT "TelegramCheckin_pkey" PRIMARY KEY ("chatId","sourceMessageId")
);

-- CreateIndex
CREATE INDEX "TelegramCheckin_chatId_userId_day_status_idx" ON "public"."TelegramCheckin"("chatId", "userId", "day", "status");

-- CreateIndex
CREATE INDEX "TelegramCheckin_chatId_day_status_idx" ON "public"."TelegramCheckin"("chatId", "day", "status");

-- CreateIndex (SQL-only partial unique index: one non-rejected attempt per participant per day)
CREATE UNIQUE INDEX "TelegramCheckin_one_non_rejected_per_day" ON "public"."TelegramCheckin"("chatId", "userId", "day") WHERE "status" <> 'REJECTED';

-- AddForeignKey
ALTER TABLE "public"."TelegramCheckin" ADD CONSTRAINT "TelegramCheckin_chatId_userId_fkey" FOREIGN KEY ("chatId", "userId") REFERENCES "public"."TelegramParticipant"("chatId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
