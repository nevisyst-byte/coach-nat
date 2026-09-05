-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COACH');

-- CreateEnum
CREATE TYPE "Pole" AS ENUM ('FORMATION', 'COMPETITION', 'SAUVETAGE', 'LOISIR');

-- CreateEnum
CREATE TYPE "Nage" AS ENUM ('PAPILLON', 'DOS', 'BRASSE', 'CRAWL');

-- CreateEnum
CREATE TYPE "EtatEncadrement" AS ENUM ('ASSURE', 'REMPLACE', 'A_COUVRIR');

-- CreateEnum
CREATE TYPE "TypeCreneau" AS ENUM ('EAU', 'PHYSIQUE', 'VIDEO', 'RECUP');

-- CreateEnum
CREATE TYPE "StatutStage" AS ENUM ('CONFIRME', 'OUVERT', 'EN_PREPARATION');

-- CreateEnum
CREATE TYPE "EtatPresence" AS ENUM ('PRESENT', 'RETARD', 'ABSENT', 'EXCUSE');

-- CreateEnum
CREATE TYPE "StatutAbsence" AS ENUM ('VALIDEE', 'A_TRAITER', 'BLESSURE');

-- CreateEnum
CREATE TYPE "StatutConge" AS ENUM ('VALIDE', 'EN_ATTENTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COACH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'Accès total',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorieEffectif" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "pole" "Pole" NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "CategorieEffectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Groupe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "pole" "Pole" NOT NULL,
    "categorie" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "objectif" TEXT,
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nageur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "initiales" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "categorie" TEXT NOT NULL,
    "specialite" TEXT NOT NULL,
    "groupeId" TEXT,
    "pointsFFN" INTEGER NOT NULL DEFAULT 0,
    "rangDept" INTEGER,
    "rangReg" INTEGER,
    "rangNat" INTEGER,
    "presenceRate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nageur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "nageurId" TEXT NOT NULL,
    "epreuve" TEXT NOT NULL,
    "temps" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "niveau" TEXT NOT NULL,
    "deltaSaison" TEXT NOT NULL,
    "rangNat" TEXT NOT NULL,
    "saison" TEXT NOT NULL DEFAULT '2025-2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotationTechnique" (
    "id" TEXT NOT NULL,
    "nageurId" TEXT NOT NULL,
    "nage" "Nage" NOT NULL,
    "critere" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "observation" TEXT,
    "coachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotationTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creneau" (
    "id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "groupeId" TEXT NOT NULL,
    "coachId" TEXT,
    "bassin" TEXT NOT NULL,
    "etat" "EtatEncadrement" NOT NULL DEFAULT 'ASSURE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creneau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "periodeLabel" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "groupesLabel" TEXT NOT NULL,
    "coachsLabel" TEXT NOT NULL,
    "statut" "StatutStage" NOT NULL DEFAULT 'EN_PREPARATION',
    "color" TEXT NOT NULL DEFAULT '#8C6BFF',
    "inscrits" INTEGER NOT NULL DEFAULT 0,
    "places" INTEGER NOT NULL DEFAULT 20,
    "budgetLabel" TEXT,
    "regleLabel" TEXT NOT NULL DEFAULT '0%',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageJour" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "dateLabel" TEXT NOT NULL,

    CONSTRAINT "StageJour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreneauStage" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "type" "TypeCreneau" NOT NULL DEFAULT 'EAU',
    "groupe" TEXT NOT NULL,
    "coachId" TEXT,
    "bassin" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreneauStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "nomPersonne" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "etat" "EtatPresence" NOT NULL DEFAULT 'PRESENT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "nageurId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'A_TRAITER',

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conge" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "periodeLabel" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "statut" "StatutConge" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "Conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeancePlan" (
    "id" TEXT NOT NULL,
    "groupeNom" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "intensite" TEXT NOT NULL,
    "nage" TEXT NOT NULL,
    "volumeCible" INTEGER NOT NULL,
    "blocs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleThematique" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "nage" TEXT NOT NULL,
    "objectif" TEXT NOT NULL,
    "groupeNom" TEXT NOT NULL,
    "dureeSemaines" INTEGER NOT NULL,
    "seances" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleThematique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_contextKey_nomPersonne_key" ON "Presence"("contextKey", "nomPersonne");

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Groupe" ADD CONSTRAINT "Groupe_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nageur" ADD CONSTRAINT "Nageur_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_nageurId_fkey" FOREIGN KEY ("nageurId") REFERENCES "Nageur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotationTechnique" ADD CONSTRAINT "NotationTechnique_nageurId_fkey" FOREIGN KEY ("nageurId") REFERENCES "Nageur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotationTechnique" ADD CONSTRAINT "NotationTechnique_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageJour" ADD CONSTRAINT "StageJour_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreneauStage" ADD CONSTRAINT "CreneauStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreneauStage" ADD CONSTRAINT "CreneauStage_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_nageurId_fkey" FOREIGN KEY ("nageurId") REFERENCES "Nageur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conge" ADD CONSTRAINT "Conge_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
