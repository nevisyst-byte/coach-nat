import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PlanningClient } from "@/components/portal/PlanningClient";
import { fmtDayLabel, toDateInputValue, weekDates, weekRangeLabel } from "@/lib/week";
import { getSession } from "@/lib/auth";
import { semaineEnVacances, type ZoneScolaire } from "@/lib/vacances-scolaires";
import { objectifActuel } from "@/lib/objectifs";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string; vue?: string }> }) {
  const { week, vue } = await searchParams;
  const weekOffset = Number(week ?? 0) || 0;
  const session = await getSession();
  const mine = vue === "moi";

  if (mine && !session?.coachId) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Cette vue est réservée aux comptes coach.
        </div>
      </Card>
    );
  }

  const dates = weekDates(weekOffset);
  const weekStart = dates[0];
  const weekEnd = dates[6];

  const [creneaux, groupes, coachs, nageurs, settings, stagesSemaine, echeancesSemaine] = await Promise.all([
    prisma.creneau.findMany({
      where: mine ? { coachId: session!.coachId! } : undefined,
      include: {
        groupe: { include: { plansEntrainement: { select: { theme: true, dateDebut: true, dateFin: true }, orderBy: { createdAt: "desc" } } } },
        coach: { include: { user: true } },
        effectifNageurs: { select: { nageurId: true } },
      },
    }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    prisma.stage.findMany({
      where: { dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      include: { jours: true, creneaux: { include: { coach: { include: { user: true } } } } },
    }),
    prisma.echeance.findMany({ where: { date: { gte: weekStart, lte: weekEnd } }, orderBy: { date: "asc" } }),
  ]);

  // Périodes remarquables (compétitions, réunions...) saisies sur le
  // Calendrier saison — affichées ici aussi, sur le jour concerné, plutôt
  // que de forcer le coach à ouvrir un autre écran pour les voir.
  const echeancesByDay: Record<number, { titre: string; detail: string; color: string }[]> = {};
  for (const e of echeancesSemaine) {
    const dayIndex = dates.findIndex((d) => sameDay(d, e.date));
    if (dayIndex === -1) continue;
    (echeancesByDay[dayIndex] ??= []).push({ titre: e.titre, detail: e.detail, color: e.color });
  }

  const zone = (settings?.zoneScolaire ?? "B") as ZoneScolaire;
  const periodeVacances = semaineEnVacances(dates, zone);

  const stagesByDay: Record<number, { stageId: string; stageNom: string; color: string; creneaux: { id: string; debut: string; fin: string; groupe: string; coachNom: string | null; bassin: string; theme: string }[] }[]> = {};
  for (const stage of stagesSemaine) {
    for (const j of stage.jours) {
      if (!j.date) continue;
      const dayIndex = dates.findIndex((d) => sameDay(d, j.date!));
      if (dayIndex === -1) continue;
      const creneauxJour = stage.creneaux
        .filter((c) => c.jour === j.jour)
        .map((c) => ({ id: c.id, debut: c.debut, fin: c.fin, groupe: c.groupe, coachNom: c.coach?.user.name ?? null, bassin: c.bassin, theme: c.theme }));
      if (creneauxJour.length === 0) continue;
      (stagesByDay[dayIndex] ??= []).push({ stageId: stage.id, stageNom: stage.nom, color: stage.color, creneaux: creneauxJour });
    }
  }

  // L'objectif affiché doit correspondre au plan actif ce jour-là (celui de
  // la semaine consultée), pas à "aujourd'hui" — sinon toute la semaine
  // affiche le plan en cours au moment de la visite plutôt que celui
  // réellement actif sur chaque occurrence du créneau.
  const creneauxAvecObjectif = creneaux.map((c) => ({
    ...c,
    groupe: { ...c.groupe, objectif: objectifActuel(c.groupe.plansEntrainement, c.groupe.objectif, dates[c.jour]) },
  }));

  return (
    <Card>
      <PlanningClient
        creneaux={creneauxAvecObjectif}
        dayLabels={dates.map(fmtDayLabel)}
        dayDates={dates.map(toDateInputValue)}
        weekLabel={weekRangeLabel(weekOffset)}
        weekOffset={weekOffset}
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
        coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
        nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, groupeId: n.groupeId }))}
        canEdit={mine ? true : session?.role === "ADMIN" || session?.role === "COACH"}
        showVueToggle
        defaultCoachId={mine ? session!.coachId! : ""}
        periodeVacances={periodeVacances ? { nom: periodeVacances.nom, zone } : null}
        stagesByDay={stagesByDay}
        echeancesByDay={echeancesByDay}
      />
    </Card>
  );
}
