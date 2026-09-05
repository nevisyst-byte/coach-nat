import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PlanningClient } from "@/components/portal/PlanningClient";
import { fmtDayLabel, weekDates, weekRangeLabel } from "@/lib/week";
import { getSession } from "@/lib/auth";

export default async function MonPlanningPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const weekOffset = Number(week ?? 0) || 0;
  const session = await getSession();

  if (!session?.coachId) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Cette vue est réservée aux comptes coach.
        </div>
      </Card>
    );
  }

  const [creneaux, groupes, coachs] = await Promise.all([
    prisma.creneau.findMany({ where: { coachId: session.coachId }, include: { groupe: true, coach: { include: { user: true } } } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <Card>
      <PlanningClient
        creneaux={creneaux}
        dayLabels={weekDates(weekOffset).map(fmtDayLabel)}
        weekLabel={weekRangeLabel(weekOffset)}
        weekOffset={weekOffset}
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
        coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
        canEdit
        defaultCoachId={session.coachId}
      />
    </Card>
  );
}
