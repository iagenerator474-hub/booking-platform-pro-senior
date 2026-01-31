/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `date` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL,
ALTER COLUMN "stripeSessionId" DROP NOT NULL,
ALTER COLUMN "amountTotal" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_email_date_time_idx" ON "Booking"("email", "date", "time");
