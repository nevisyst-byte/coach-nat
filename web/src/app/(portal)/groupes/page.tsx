import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { GroupesAdmin } from "@/components/admin/GroupesAdmin";
import { getSession } from "@/lib/auth";
import { POLE_LABELS, POLE_COLORS, POLE_ORDER } from "@/lib/theme";
import { couleurObjectif } from "@/lib/objectifs";

export default async function GroupesPage() {
  const session = await getSession();
  const [groupes, coachs, nageurs] = await Promise.all([
    prisma.groupe.findMany({ include: { coach: { include: { user: true } } }, orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const canManage = session?.role === "ADMIN" || session?.role === "COACH";
  if (canManage) {
    return (
      <Card>
        <GroupesAdmin
          groupes={groupes.map((g) => ({ id: g.id, nom: g.nom, pole: g.pole, categorie: g.categorie, color: g.color, objectif: g.objectif, coachId: g.coachId }))}
          coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
          nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, groupeId: n.groupeId }))}
        />
      </Card>
    );
  }

  const columns = "1.4fr 130px 90px 170px 1.3fr";
  const headerLabel: React.CSSProperties = { color: "var(--ink-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" };

  const groupesParPole = POLE_ORDER.map((pole) => ({
    pole,
    nom: POLE_LABELS[pole] ?? pole,
    color: POLE_COLORS[pole] ?? "#61789B",
    groupes: groupes.filter((g) => g.pole === pole),
  })).filter((section) => section.groupes.length > 0);

  return (
    <Card>
      <div className="text-[13px] mb-3.5" style={{ color: "var(--ink-secondary)" }}>
        Vue en lecture seule — seul un administrateur peut créer un groupe, changer son coach ou gérer son
        effectif.
      </div>
      <div className="flex flex-col gap-4">
        {groupesParPole.map((section) => (
          <div key={section.pole} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: `3px solid ${section.color}` }}>
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
              <span className="font-display text-[15px] tracking-[0.05em] uppercase">{section.nom}</span>
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {section.groupes.length} groupe{section.groupes.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 760 }}>
                <div className="grid gap-3 px-3.5 py-2" style={{ gridTemplateColumns: columns, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                  {["Groupe", "Catégorie", "Effectif", "Coach responsable", "Objectif en cours"].map((label) => (
                    <div key={label} style={headerLabel}>
                      {label}
                    </div>
                  ))}
                </div>
                {section.groupes.map((g) => {
                  const count = nageurs.filter((n) => n.groupeId === g.id).length;
                  return (
                    <div
                      key={g.id}
                      className="grid gap-3 items-center px-3.5 py-3"
                      style={{ gridTemplateColumns: columns, borderLeft: `4px solid ${g.color}`, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
                    >
                      <div className="text-sm font-semibold truncate">{g.nom}</div>
                      <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                        {g.categorie}
                      </div>
                      <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        {count} nageur{count > 1 ? "s" : ""}
                      </div>
                      <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                        {g.coach?.user.name ?? "— aucun —"}
                      </div>
                      <div className="text-sm font-semibold truncate" style={{ color: g.objectif ? couleurObjectif(g.objectif) : "var(--ink-secondary)" }}>
                        {g.objectif ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {groupes.length === 0 && (
          <div className="text-[13px] text-center py-8 rounded-2xl" style={{ color: "var(--ink-secondary)", border: "1px solid var(--border)" }}>
            Aucun groupe pour l&apos;instant.
          </div>
        )}
      </div>
    </Card>
  );
}
