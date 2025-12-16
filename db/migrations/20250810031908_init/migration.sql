-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "discord_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."CheckinStreak" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_date" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "CheckinStreak_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."Checkin" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(15) NOT NULL UNIQUE,
    "user_id" INTEGER NOT NULL,
    "checkin_streak_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "reviewed_by" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."Attachment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL DEFAULT 0,
    "module_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discord_id_key" ON "public"."User"("discord_id");
CREATE INDEX "CheckinStreak_user_id_first_date_key" ON "public"."CheckinStreak"("user_id", "first_date" DESC);
CREATE INDEX "Checkin_user_id_created_at_key" ON "public"."Checkin"("user_id", "created_at" DESC);
CREATE INDEX "Attachment_module_id_module_type_created_at_key" ON "public"."Attachment"("module_id", "module_type", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."CheckinStreak" ADD CONSTRAINT "CheckinStreak_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."Checkin" ADD CONSTRAINT "Checkin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."Checkin" ADD CONSTRAINT "Checkin_checkin_streak_id_fkey" FOREIGN KEY ("checkin_streak_id") REFERENCES "public"."CheckinStreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;