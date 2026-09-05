-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "titre" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1E7BFF',

    CONSTRAINT "Echeance_pkey" PRIMARY KEY ("id")
);
