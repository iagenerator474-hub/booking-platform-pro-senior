/*
  Warnings:

  - A unique constraint covering the columns `[stripeSessionId]` on the table `PaymentEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PaymentEvent_stripeSessionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_stripeSessionId_key" ON "PaymentEvent"("stripeSessionId");
