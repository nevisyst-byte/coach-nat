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

  const columns = "1.4fr 130px 130px 90px 170px 1.3fr";
  const headerLabel: React.CSSProperties = { color: "#61789B", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" };

  return (
    <Card>
      <SectionTitle>Groupes</SectionTitle>
      <div className="text-[13px] mb-3.5" style={{ color: "var(--ink-secondary)" }}>
        Vue en lecture seule — seul un administrateur peut créer un groupe, changer son coach ou gérer son
        effectif.
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 820 }}>
            <div className="grid gap-3 px-3.5 py-2.5" style={{ gridTemplateColumns: columns, background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
              {["Groupe", "Pôle", "Catégorie", "Effectif", "Coach responsable", "Objectif en cours"].map((label) => (
                <div key={label} style={headerLabel}>
                  {label}
                </div>
              ))}
            </div>
            {groupes.map((g) => {
              const count = nageurs.filter((n) => n.groupeId === g.id).length;
              return (
                <div
                  key={g.id}
                  className="grid gap-3 items-center px-3.5 py-3"
                  style={{ gridTemplateColumns: columns, borderLeft: `4px solid ${g.color}`, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
                >
                  <div className="text-sm font-semibold truncate">{g.nom}</div>
                  <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                    {POLE_LABELS[g.pole] ?? g.pole}
                  </div>
                  <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                    {g.categorie}
                  </div>
                  <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                    {count} nageur{count > 1 ? "s" : ""}
                  </div>
                  <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                    {g.coach?.user.name ?? "— aucun —"}
                  </div>
                  <div className="text-sm truncate" style={{ color: "var(--ink-secondary)" }}>
                    {g.objectif ?? "—"}
                  </div>
                </div>
              );
            })}
            {groupes.length === 0 && (
              <div className="text-[13px] text-center py-8" style={{ color: "var(--ink-secondary)" }}>
                Aucun groupe pour l&apos;instant.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
