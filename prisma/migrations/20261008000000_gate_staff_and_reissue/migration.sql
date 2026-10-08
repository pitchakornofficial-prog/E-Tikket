-- CreateTable
CREATE TABLE "ticket_checkers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizer_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gate_note" TEXT,
    "token_hash" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ticket_checkers_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_checkers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ticket_number" TEXT COLLATE NOCASE NOT NULL,
    "qr_token_hash" TEXT NOT NULL,
    "qr_artifact_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OUTSIDE',
    "reissue_count" INTEGER NOT NULL DEFAULT 0,
    "reissued_from_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tickets" ("created_at", "event_id", "id", "order_id", "qr_artifact_key", "qr_token_hash", "status", "ticket_number", "updated_at") SELECT "created_at", "event_id", "id", "order_id", "qr_artifact_key", "qr_token_hash", "status", "ticket_number", "updated_at" FROM "tickets";
DROP TABLE "tickets";
ALTER TABLE "new_tickets" RENAME TO "tickets";
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");
CREATE UNIQUE INDEX "tickets_qr_token_hash_key" ON "tickets"("qr_token_hash");
CREATE INDEX "tickets_event_id_status_idx" ON "tickets"("event_id", "status");
CREATE TABLE "new_ticket_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "staff_id" TEXT NOT NULL,
    "checker_id" TEXT,
    "checker_name" TEXT,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "note" TEXT,
    "scanned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_scans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ticket_scans_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_scans_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ticket_scans_checker_id_fkey" FOREIGN KEY ("checker_id") REFERENCES "ticket_checkers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ticket_scans" ("action", "event_id", "id", "note", "result", "scanned_at", "staff_id", "ticket_id") SELECT "action", "event_id", "id", "note", "result", "scanned_at", "staff_id", "ticket_id" FROM "ticket_scans";
DROP TABLE "ticket_scans";
ALTER TABLE "new_ticket_scans" RENAME TO "ticket_scans";
CREATE INDEX "ticket_scans_event_id_scanned_at_idx" ON "ticket_scans"("event_id", "scanned_at");
CREATE INDEX "ticket_scans_ticket_id_scanned_at_idx" ON "ticket_scans"("ticket_id", "scanned_at");
CREATE INDEX "ticket_scans_checker_id_scanned_at_idx" ON "ticket_scans"("checker_id", "scanned_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_checkers_token_hash_key" ON "ticket_checkers"("token_hash");

-- CreateIndex
CREATE INDEX "ticket_checkers_token_hash_idx" ON "ticket_checkers"("token_hash");

-- CreateIndex
CREATE INDEX "ticket_checkers_event_id_organizer_id_idx" ON "ticket_checkers"("event_id", "organizer_id");
