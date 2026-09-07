-- CreateTable
CREATE TABLE "PhaseObjectif" (
    "id" TEXT NOT NULL,
    "groupeId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseObjectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhaseObjectif_groupeId_dateDebut_idx" ON "PhaseObjectif"("groupeId", "dateDebut");

-- AddForeignKey
ALTER TABLE "PhaseObjectif" ADD CONSTRAINT "PhaseObjectif_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
