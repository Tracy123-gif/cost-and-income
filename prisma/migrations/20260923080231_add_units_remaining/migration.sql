/*
  Warnings:

  - Added the required column `unitsRemaining` to the `ProductionBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductionBatch" ADD COLUMN     "unitsRemaining" DECIMAL(18,4) NOT NULL;
