import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { GroupesAdmin } from "@/components/admin/GroupesAdmin";
import { getSession } from "@/lib/auth";
import { POLE_LABELS } from "@/lib/theme";

export default async function GroupesPage() {
  const session = await getSession();
  const [groupes, coachs, nageurs] = await Promise.all([
    prisma.groupe.findMany({ include: { coach: { include: { user: true } } }, orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
  ]);

  if (session?.role === "ADMIN") {
    return (
      <Card>
        <SectionTitle>Groupes</SectionTitle>
        <GroupesAdmin
          groupes={groupes.map((g) => ({ id: g.id, nom: g.nom, pole: g.pole, categorie: g.categorie, color: g.color, objectif: g.objectif, coachId: g.coachId }))}
          coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
          nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, groupeId: n.groupeId }))}
        />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Groupes</SectionTitle>
      <div className="text-[13px] mb-3.5" style={{ color: "var(--ink-secondary)" }}>
        Vue en lecture seule — seul un administrateur peut créer un groupe, changer son coach ou gérer son
        effectif.
      </div>
      <div className="flex flex-col gap-2.5">
        {groupes.map((g) => {
          const count = nageurs.filter((n) => n.groupeId === g.id).length;
          return (
            <div key={g.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${g.color}` }}>
              <div style={{ minWidth: 160 }}>
                <div className="text-sm font-semibold">{g.nom}</div>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {POLE_LABELS[g.pole] ?? g.pole} · {g.categorie} · {count} nageur{count > 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-sm" style={{ color: "var(--ink-body)" }}>
                {g.coach?.user.name ?? "— sans coach —"}
              </div>
              {g.objectif && (
                <div className="flex-1 text-sm" style={{ minWidth: 160, color: "var(--ink-secondary)" }}>
                  {g.objectif}
                </div>
              )}
            </div>
          );
        })}
        {groupes.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucun groupe pour l&apos;instant.
          </div>
        )}
      </div>
    </Card>
  );
}
