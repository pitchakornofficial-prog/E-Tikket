-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('VALID', 'ALREADY_CHECKED_IN', 'INVALID_ACTION', 'CANCELLED', 'WRONG_EVENT', 'UNPAID', 'INVALID');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- DropIndex
DROP INDEX "orders_view_token_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "view_token",
ADD COLUMN     "checkout_token_hash" TEXT NOT NULL,
ADD COLUMN     "delivery_artifact_key" TEXT,
ADD COLUMN     "delivery_error" TEXT,
ADD COLUMN     "delivery_last_attempt" TIMESTAMP(3),
ADD COLUMN     "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "view_token_hash" TEXT;

-- AlterTable
ALTER TABLE "ticket_scans" ADD COLUMN     "event_id" TEXT NOT NULL,
ADD COLUMN     "result" "ScanResult" NOT NULL,
ALTER COLUMN "ticket_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "qr_artifact_key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_token_hash_key" ON "orders"("checkout_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "orders_view_token_hash_key" ON "orders"("view_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "payments_slip_hash_key" ON "payments"("slip_hash");

-- CreateIndex
CREATE INDEX "ticket_scans_event_id_scanned_at_idx" ON "ticket_scans"("event_id", "scanned_at");

-- AddForeignKey
ALTER TABLE "ticket_scans" ADD CONSTRAINT "ticket_scans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

