-- CreateTable
CREATE TABLE "PlanEntrainement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "heureDebut" TEXT,
    "sections" JSONB NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanEntrainement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjustementPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "groupeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sectionId" TEXT NOT NULL,
    "pourcentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AjustementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlanEntrainementGroupes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlanEntrainementGroupes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AjustementPlan_planId_groupeId_date_sectionId_key" ON "AjustementPlan"("planId", "groupeId", "date", "sectionId");

-- CreateIndex
CREATE INDEX "_PlanEntrainementGroupes_B_index" ON "_PlanEntrainementGroupes"("B");

-- AddForeignKey
ALTER TABLE "AjustementPlan" ADD CONSTRAINT "AjustementPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanEntrainement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjustementPlan" ADD CONSTRAINT "AjustementPlan_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanEntrainementGroupes" ADD CONSTRAINT "_PlanEntrainementGroupes_A_fkey" FOREIGN KEY ("A") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanEntrainementGroupes" ADD CONSTRAINT "_PlanEntrainementGroupes_B_fkey" FOREIGN KEY ("B") REFERENCES "PlanEntrainement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
