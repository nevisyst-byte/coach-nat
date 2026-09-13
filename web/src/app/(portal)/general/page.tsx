import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, ProgressBar, SectionTitle } from "@/components/ui/Card";
import { Camembert } from "@/components/ui/Camembert";
import { hoursBetween, JOURS } from "@/lib/format";
import { toDateInputValue } from "@/lib/week";
import { normalizeCombos, type ValeurPourcentage } from "@/lib/seance-generator";
import { getActiveSaison } from "@/lib/saison";

const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];
const MOIS_ABBR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

type InstanceRow = { variant: ValeurPourcentage[]; intensite: ValeurPourcentage[]; nage: ValeurPourcentage[]; volumeNage: number | null };

function fmtDateCourte(d: Date) {
  return `${d.getDate()} ${MOIS_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

// Chaque valeur cochée porte déjà son propre % (saisi par le coach à la
// création du plan) — pas de partage à parts égales à faire ici.
function aggregerParPoids<T extends { variant: ValeurPourcentage[]; intensite: ValeurPourcentage[]; nage: ValeurPourcentage[] }>(
  raw: T[],
  field: "variant" | "intensite" | "nage",
  poids: (r: T) => number | null
) {
  const sums = new Map<string, number>();
  for (const r of raw) {
    const p = poids(r);
    if (!p) continue;
    for (const v of r[field]) sums.set(v.valeur, (sums.get(v.valeur) ?? 0) + (p * (v.pourcentage || 0)) / 100);
  }
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
}

// Nombre d'occurrences hebdomadaires d'un créneau (jour de la semaine, 0 =
// lundi) entre deux dates incluses.
function occurrencesDuJour(jour: number, debut: Date, fin: Date): number {
  if (fin < debut) return 0;
  let count = 0;
  const d = new Date(debut);
  d.setHours(0, 0, 0, 0);
  const borne = new Date(fin);
  borne.setHours(0, 0, 0, 0);
  while (d <= borne) {
    if ((d.getDay() + 6) % 7 === jour) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// Prochaine date (aujourd'hui compris) tombant sur ce jour de la semaine —
// pour lier une carte "séance" à sa vraie occurrence datée plutôt qu'au
// planning générique.
function prochaineOccurrence(jour: number, ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  while ((d.getDay() + 6) % 7 !== jour) d.setDate(d.getDate() + 1);
  return d;
}

export default async function GeneralPage({ searchParams }: { searchParams: Promise<{ coachId?: string }> }) {
  const { coachId: coachIdParam } = await searchParams;
  const session = await getSession();

  return (
    <div className="flex flex-col gap-5">
      <CoachDashboard sessionCoachId={session?.coachId ?? null} isAdmin={session?.role === "ADMIN"} coachIdParam={coachIdParam} />
    </div>
  );
}

async function CoachDashboard({
  sessionCoachId,
  isAdmin,
  coachIdParam,
}: {
  sessionCoachId: string | null;
  isAdmin: boolean;
  coachIdParam: string | undefined;
}) {
  // Un admin n'a pas de fiche coach propre (pas de "mon" tableau de bord),
  // mais doit pouvoir consulter celui de n'importe quel coach plutôt que de
  // se voir cette vue interdite — un coach, lui, ne voit que la sienne.
  let coachId = sessionCoachId;
  let tousLesCoachs: { id: string; nom: string }[] = [];
  if (isAdmin) {
    const coachs = await prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } });
    tousLesCoachs = coachs.map((c) => ({ id: c.id, nom: c.user.name }));
    coachId = (coachIdParam && tousLesCoachs.some((c) => c.id === coachIdParam) ? coachIdParam : tousLesCoachs[0]?.id) ?? null;
  }

  if (!coachId) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          {isAdmin ? "Aucun coach à afficher pour le moment." : "Cette vue est réservée aux comptes coach."}
        </div>
      </Card>
    );
  }

  const [creneaux, groupes, conges] = await Promise.all([
    prisma.creneau.findMany({ where: { coachId }, include: { groupe: { include: { nageurs: true } } } }),
    prisma.groupe.findMany({ where: { coachId }, include: { nageurs: true } }),
    prisma.conge.findMany({ where: { coachId } }),
  ]);

  const heures = creneaux.reduce((a, c) => a + hoursBetween(c.debut, c.fin), 0);
  const groupesIds = new Set(groupes.map((g) => g.id));

  // Deux lectures complémentaires de la répartition nage/intensité/variant,
  // sur la même liste de plans de la saison en cours, juste découpées
  // différemment dans le temps :
  // - "réalisé" : le volume programmé du début de saison à aujourd'hui —
  //   sert à repérer un déséquilibre (ex. peu de dos travaillé) et
  //   rééquilibrer les prochains plans. Pas un vrai suivi d'exécution (rien
  //   ne trace un volume nagé réel), mais le meilleur proxy disponible : ce
  //   qui a été planifié.
  // - "cible" : le volume prévu du début de saison jusqu'à la fin du
  //   dernier plan enregistré — la répartition visée sur la saison entière,
  //   y compris les semaines à venir.
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const saison = await getActiveSaison();
  const debutSaison = saison?.dateDebut ?? aujourdhui;

  const plansSaison = groupesIds.size
    ? await prisma.planEntrainement.findMany({
        where: { groupes: { some: { id: { in: Array.from(groupesIds) } } }, dateFin: { gte: debutSaison } },
        include: { groupes: { select: { id: true } } },
      })
    : [];
  const dernierPlanFin = plansSaison.length > 0 ? new Date(Math.max(...plansSaison.map((p) => p.dateFin.getTime()))) : null;

  const volumeRealise: InstanceRow[] = [];
  const volumeCible: InstanceRow[] = [];
  for (const c of creneaux) {
    for (const plan of plansSaison) {
      if (!plan.groupes.some((g) => g.id === c.groupeId)) continue;
      if (!plan.volumeNage) continue;
      const combos = normalizeCombos(plan.combos);
      const debutPlan = plan.dateDebut > debutSaison ? plan.dateDebut : debutSaison;
      const finRealise = plan.dateFin < aujourdhui ? plan.dateFin : aujourdhui;
      const nRealise = occurrencesDuJour(c.jour, debutPlan, finRealise);
      const nCible = occurrencesDuJour(c.jour, debutPlan, plan.dateFin);

      const rows: InstanceRow[] =
        combos && combos.length > 0
          ? combos.map((combo) => ({ variant: combo.variant, intensite: combo.intensite, nage: combo.nage, volumeNage: Math.round((plan.volumeNage! * combo.pourcentage) / 100) }))
          : plan.variant && plan.intensite && plan.nage
            ? [{ variant: [{ valeur: plan.variant, pourcentage: 100 }], intensite: [{ valeur: plan.intensite, pourcentage: 100 }], nage: [{ valeur: plan.nage, pourcentage: 100 }], volumeNage: plan.volumeNage }]
            : [];
      for (const row of rows) {
        for (let i = 0; i < nRealise; i++) volumeRealise.push(row);
        for (let i = 0; i < nCible; i++) volumeCible.push(row);
      }
    }
  }

  const statsCoach = [
    { icon: "▦", value: String(creneaux.length), label: "Créneaux / semaine" },
    { icon: "⚑", value: String(groupesIds.size), label: "Groupes encadrés" },
    { icon: "✈", value: String(conges.length), label: "Congés déclarés" },
    { icon: "◷", value: `${heures} h`, label: "Heures hebdo" },
  ];

  const camembertsRealise = [
    { titre: "Par nage", items: aggregerParPoids(volumeRealise, "nage", (r) => r.volumeNage) },
    { titre: "Par intensité", items: aggregerParPoids(volumeRealise, "intensite", (r) => r.volumeNage) },
    { titre: "Par variant", items: aggregerParPoids(volumeRealise, "variant", (r) => r.volumeNage) },
  ].filter((c) => c.items.length > 0);
  const camembertsCible = [
    { titre: "Par nage", items: aggregerParPoids(volumeCible, "nage", (r) => r.volumeNage) },
    { titre: "Par intensité", items: aggregerParPoids(volumeCible, "intensite", (r) => r.volumeNage) },
    { titre: "Par variant", items: aggregerParPoids(volumeCible, "variant", (r) => r.volumeNage) },
  ].filter((c) => c.items.length > 0);

  return (
    <>
      {isAdmin && tousLesCoachs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Vue de :
          </span>
          {tousLesCoachs.map((c) => (
            <Link
              key={c.id}
              href={`/general?coachId=${c.id}`}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
              style={{
                background: c.id === coachId ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${c.id === coachId ? "transparent" : "var(--border)"}`,
                color: c.id === coachId ? "#fff" : "var(--ink-body)",
              }}
            >
              {c.nom}
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {statsCoach.map((s) => (
          <Card key={s.label} padding={18}>
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[15px]"
              style={{ background: "rgba(232,68,43,0.14)", border: "1px solid rgba(232,68,43,0.3)" }}
            >
              {s.icon}
            </div>
            <div className="font-display text-[40px] leading-none mt-3.5">{s.value}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {s.label}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-baseline justify-between mb-4 gap-2.5 flex-wrap">
          <h2 className="font-display text-[19px] tracking-[0.06em]">Mes groupes</h2>
          <Link
            href="/absences"
            className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold"
            style={{ border: "1px solid rgba(36,200,255,0.4)", background: "rgba(36,200,255,0.1)", color: "#7FDCFF" }}
          >
            Gérer les absences
          </Link>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {groupes.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun groupe ne t&apos;est encore assigné.
            </div>
          )}
          {groupes.map((g) => {
            const presenceMoy = g.nageurs.length
              ? Math.round(g.nageurs.reduce((a, n) => a + n.presenceRate, 0) / g.nageurs.length)
              : 0;
            return (
              <div key={g.id} className="rounded-xl p-4" style={{ border: "1px solid var(--border)", borderLeft: `4px solid ${g.color}`, background: "rgba(255,255,255,0.03)" }}>
                <div className="flex justify-between items-start gap-2.5">
                  <div>
                    <div className="font-display text-xl">{g.nom}</div>
                    <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                      {g.categorie}
                    </div>
                  </div>
                  <div className="font-display text-2xl">{g.nageurs.length}</div>
                </div>
                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex justify-between text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                    <span>Présence moyenne</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{presenceMoy}%</span>
                  </div>
                  <ProgressBar value={presenceMoy} color={g.color} height={7} />
                  <div className="flex justify-between text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                    <span>Objectif en cours</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{g.objectif ?? "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))" }}>
        <Card padding={22}>
          <div className="mb-5">
            <h2 className="font-display text-[19px] tracking-[0.06em]">Réalisé</h2>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              Volume programmé du {fmtDateCourte(debutSaison)} à aujourd&apos;hui — pour repérer un déséquilibre
            </div>
          </div>
          {camembertsRealise.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucune séance planifiée depuis le début de la saison. Utilise{" "}
              <Link href="/entrainement" style={{ color: "#7FDCFF" }}>
                Entraînement
              </Link>{" "}
              pour planifier un plan sur un groupe et commencer à alimenter cette vue.
            </div>
          ) : (
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              {camembertsRealise.map((ch) => (
                <Camembert key={ch.titre} titre={ch.titre} items={ch.items} />
              ))}
            </div>
          )}
        </Card>

        <Card padding={22}>
          <div className="mb-5">
            <h2 className="font-display text-[19px] tracking-[0.06em]">Cible</h2>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {dernierPlanFin
                ? `Volume prévu du ${fmtDateCourte(debutSaison)} au ${fmtDateCourte(dernierPlanFin)} (fin du dernier plan)`
                : "Aucun plan enregistré pour cette saison."}
            </div>
          </div>
          {camembertsCible.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun plan avec une répartition chiffrée pour tes groupes cette saison.
            </div>
          ) : (
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              {camembertsCible.map((ch) => (
                <Camembert key={ch.titre} titre={ch.titre} items={ch.items} totalLabel="prévu" />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <Card>
          <SectionTitle>Prochaines séances</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {creneaux.length === 0 && (
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Aucun créneau cette semaine.
              </div>
            )}
            {creneaux
              .slice()
              .sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-3.5 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="text-center" style={{ minWidth: 52 }}>
                    <div className="font-display text-[13px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-secondary)" }}>
                      {JOURS[c.jour]}
                    </div>
                    <div className="font-display text-[22px]">{c.debut}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{c.groupe.nom}</div>
                    <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                      {c.groupe.objectif ?? c.bassin} · {c.bassin}
                    </div>
                  </div>
                  <Link
                    href={`/presences?slot=reg:${c.id}&date=${toDateInputValue(prochaineOccurrence(c.jour))}`}
                    className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                    style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  >
                    Ouvrir
                  </Link>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>À traiter</SectionTitle>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(30,123,255,0.10)", border: "1px solid rgba(30,123,255,0.3)" }}>
              <span className="text-[17px]">✎</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Feuilles de présence</div>
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Pointer les séances de la semaine
                </div>
              </div>
              <Link href="/presences" className="rounded-lg px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: "#1E7BFF" }}>
                Saisir
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(232,68,43,0.10)", border: "1px solid rgba(232,68,43,0.3)" }}>
              <span className="text-[17px]">☰</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Notation technique</div>
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Mettre à jour la cotation par nage
                </div>
              </div>
              <Link href="/nageurs" className="rounded-lg px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: "#E8442B" }}>
                Noter
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-strong)" }}>
              <span className="text-[17px]">⟳</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Cycle à renouveler</div>
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Générer le prochain cycle thématique
                </div>
              </div>
              <Link href="/entrainement" className="rounded-lg px-3 py-1.5 text-[13px] font-bold" style={{ color: "var(--ink)", border: "1px solid var(--border-strong)" }}>
                Générer
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
