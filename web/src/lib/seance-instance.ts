import { prisma } from "@/lib/prisma";

export async function resolveSeanceInstance(slot: string, dateStr: string) {
  const [kind, id] = slot.split(":");
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (kind === "reg") {
    const creneau = await prisma.creneau.findUnique({ where: { id }, include: { groupe: true } });
    if (!creneau) return null;
    return prisma.seanceInstance.upsert({
      where: { creneauId_date: { creneauId: id, date } },
      update: {},
      create: { creneauId: id, date, groupeNom: creneau.groupe.nom, coachId: creneau.coachId },
    });
  }

  if (kind === "stage") {
    const creneau = await prisma.creneauStage.findUnique({ where: { id } });
    if (!creneau) return null;
    return prisma.seanceInstance.upsert({
      where: { creneauStageId_date: { creneauStageId: id, date } },
      update: {},
      create: {
        creneauStageId: id,
        date,
        groupeNom: creneau.groupe,
        coachId: creneau.coachId,
        volumeNage: creneau.volume || null,
      },
    });
  }

  return null;
}
