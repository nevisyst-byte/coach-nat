/*
  Warnings:

  - Added the required column `updatedAt` to the `SeancePlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SeancePlan" ADD COLUMN     "nom" TEXT NOT NULL DEFAULT 'Modèle sans nom',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
