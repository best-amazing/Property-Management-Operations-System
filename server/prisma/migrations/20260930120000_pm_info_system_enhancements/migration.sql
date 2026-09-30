-- DropForeignKey
ALTER TABLE "PropertyContact" DROP CONSTRAINT "PropertyContact_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "PropertyContact" DROP CONSTRAINT "PropertyContact_property_id_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementReceipt" DROP CONSTRAINT "AnnouncementReceipt_announcement_id_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementReceipt" DROP CONSTRAINT "AnnouncementReceipt_user_id_fkey";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "address" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "PolicyCategory" ADD COLUMN     "audience_staff_types" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "description" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "dispatched_at" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent',
ADD COLUMN     "target_ids" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_by" TEXT;

-- Backfill: announcements created before scheduling support were dispatched immediately
UPDATE "Announcement" SET "dispatched_at" = "created_at";
UPDATE "Announcement" SET "target_ids" = jsonb_build_array("target_id") WHERE "target_id" IS NOT NULL;

-- AlterTable
ALTER TABLE "AnnouncementReceipt" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'sent';

-- CreateTable
CREATE TABLE "PropertyStaff" (
    "user_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,

    CONSTRAINT "PropertyStaff_pkey" PRIMARY KEY ("user_id","property_id")
);

-- CreateIndex
CREATE INDEX "Contact_city_state_idx" ON "Contact"("city", "state");

-- CreateIndex
CREATE INDEX "Contact_zip_idx" ON "Contact"("zip");

-- CreateIndex
CREATE INDEX "Announcement_status_publish_at_idx" ON "Announcement"("status", "publish_at");

-- AddForeignKey
ALTER TABLE "PropertyContact" ADD CONSTRAINT "PropertyContact_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContact" ADD CONSTRAINT "PropertyContact_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyStaff" ADD CONSTRAINT "PropertyStaff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyStaff" ADD CONSTRAINT "PropertyStaff_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReceipt" ADD CONSTRAINT "AnnouncementReceipt_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReceipt" ADD CONSTRAINT "AnnouncementReceipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

