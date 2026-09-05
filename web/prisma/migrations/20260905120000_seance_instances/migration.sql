-- DropIndex
DROP INDEX "Presence_contextKey_nomPersonne_key";

-- AlterTable
ALTER TABLE "Presence" DROP COLUMN "contextKey",
ADD COLUMN     "seanceInstanceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SeanceInstance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "creneauId" TEXT,
    "creneauStageId" TEXT,
    "groupeNom" TEXT NOT NULL,
    "coachId" TEXT,
    "variant" TEXT,
    "intensite" TEXT,
    "nage" TEXT,
    "volumeNage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeanceInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeanceInstance_creneauId_date_key" ON "SeanceInstance"("creneauId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SeanceInstance_creneauStageId_date_key" ON "SeanceInstance"("creneauStageId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_seanceInstanceId_nomPersonne_key" ON "Presence"("seanceInstanceId", "nomPersonne");

-- AddForeignKey
ALTER TABLE "SeanceInstance" ADD CONSTRAINT "SeanceInstance_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "Creneau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceInstance" ADD CONSTRAINT "SeanceInstance_creneauStageId_fkey" FOREIGN KEY ("creneauStageId") REFERENCES "CreneauStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceInstance" ADD CONSTRAINT "SeanceInstance_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_seanceInstanceId_fkey" FOREIGN KEY ("seanceInstanceId") REFERENCES "SeanceInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

