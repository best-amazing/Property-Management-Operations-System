-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN     "ticket_fields" JSONB;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "fields" JSONB;
