import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { SemaineTypeClient } from "@/components/portal/SemaineTypeClient";
import { CalendrierClient } from "@/components/portal/CalendrierClient";
import { EcheancesAdmin } from "@/components/admin/EcheancesAdmin";
import { VueEnsembleClient, type JourDetail } from "@/components/portal/VueEnsembleClient";
import { objectifActuel } from "@/lib/objectifs";
import { parseHeureMin } from "@/lib/disposition-horaire";
import { estEnVacances, type ZoneScolaire } from "@/lib/vacances-scolaires";
import { toDateInputValue } from "@/lib/week";

type Evt = { id: string; label: string; color: string; detail: string };

const MOIS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function CalendrierPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { mois: moisParam } = await searchParams;
  const [creneaux, groupes, coachs, nageurs, echeances, stages, evenementsSemaine, settings] = await Promise.all([
    prisma.creneau.findMany({
      include: {
        groupe: { include: { plansEntrainement: { select: { theme: true, dateDebut: true, dateFin: true }, orderBy: { createdAt: "desc" } } } },
        coach: { include: { user: true } },
        effectifNageurs: { select: { nageurId: true } },
      },
    }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
    prisma.echeance.findMany({ orderBy: { date: "asc" } }),
    prisma.stage.findMany({ orderBy: { dateDebut: "asc" } }),
    prisma.evenementSemaine.findMany({ include: { coach: { include: { user: true } } } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const today = new Date();
  // Mois affiché piloté par ?mois=AAAA-MM (navigation précédent/suivant sur
  // la vue calendaire) — le mois courant par défaut si absent ou invalide,
  // pour ne jamais bloquer la page sur un seul mois.
  const moisMatch = moisParam?.match(/^(\d{4})-(\d{2})$/);
  const year = moisMatch ? Number(moisMatch[1]) : today.getFullYear();
  const month = moisMatch ? Number(moisMatch[2]) - 1 : today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = lundi
  const zone = (settings?.zoneScolaire ?? "B") as ZoneScolaire;

  const moisPrecedent = new Date(year, month - 1, 1);
  const moisSuivant = new Date(year, month + 1, 1);
  const hrefMois = (d: Date) => `/calendrier?mois=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const estMoisCourant = year === today.getFullYear() && month === today.getMonth();

  const echeancesByDay = new Map<number, Evt[]>();
  for (const e of echeances) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const list = echeancesByDay.get(d.getDate()) ?? [];
      list.push({ id: e.id, label: e.titre, color: e.color, detail: e.detail });
      echeancesByDay.set(d.getDate(), list);
    }
  }

  // Créneaux de stage tombant exactement dans le mois affiché (pour le détail
  // jour par jour) — requête à part de la liste "stages" ci-dessous (plus
  // légère, utilisée par l'onglet Vacances).
  const moisDebut = new Date(year, month, 1);
  const moisFin = new Date(year, month, daysInMonth);
  const stagesMoisDetail = await prisma.stage.findMany({
    where: { dateDebut: { lte: moisFin }, dateFin: { gte: moisDebut } },
    include: { jours: true, creneaux: { include: { coach: { include: { user: true } } } } },
  });

  const cellsDetail: (JourDetail | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const weekday = (startWeekday + d - 1) % 7;
    const dateIso = toDateInputValue(date);
    const vac = estEnVacances(date, zone);

    const evenements: JourDetail["evenements"] = [];
    for (const c of creneaux) {
      if (c.jour !== weekday) continue;
      evenements.push({
        kind: "reg",
        id: c.id,
        debut: c.debut,
        fin: c.fin,
        debutMin: parseHeureMin(c.debut),
        finMin: parseHeureMin(c.fin),
        groupeNom: c.groupe.nom,
        coachNom: c.libelleCoach ?? c.coach?.user.name ?? null,
        bassin: c.bassin,
        etat: c.etat,
        enPause: Boolean(vac && c.actifHorsVacances),
        presenceHref: `/presences?slot=reg:${c.id}&date=${dateIso}`,
      });
    }
    for (const stage of stagesMoisDetail) {
      for (const j of stage.jours) {
        if (!j.date || j.date.getFullYear() !== year || j.date.getMonth() !== month || j.date.getDate() !== d) continue;
        for (const c of stage.creneaux.filter((cc) => cc.jour === j.jour)) {
          evenements.push({
            kind: "stage",
            id: c.id,
            debut: c.debut,
            fin: c.fin,
            debutMin: parseHeureMin(c.debut),
            finMin: parseHeureMin(c.fin),
            groupeNom: c.groupe,
            coachNom: c.coach?.user.name ?? null,
            bassin: c.bassin,
            stageNom: stage.nom,
            stageColor: stage.color,
            presenceHref: `/presences?slot=stage:${c.id}&date=${dateIso}`,
          });
        }
      }
    }

    cellsDetail.push({
      n: d,
      dateIso,
      evenements,
      echeances: (echeancesByDay.get(d) ?? []).map((e) => ({ id: e.id, titre: e.label, detail: e.detail, color: e.color })),
      vacances: vac?.nom ?? null,
    });
  }

  const vueEnsemble = (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
      <Card>
        <VueEnsembleClient
          mois={MOIS_LONG[month]}
          annee={year}
          cells={cellsDetail}
          aujourdhui={estMoisCourant ? today.getDate() : -1}
          hrefMoisPrecedent={hrefMois(moisPrecedent)}
          hrefMoisSuivant={hrefMois(moisSuivant)}
          hrefMoisCourant={estMoisCourant ? null : "/calendrier"}
        />
      </Card>
      <Card>
        <SectionTitle>Échéances de la saison</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {echeances.map((e) => {
            const d = new Date(e.date);
            return (
              <div key={e.id} className="flex gap-3.5 items-center rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${e.color}` }}>
                <div className="text-center" style={{ minWidth: 46 }}>
                  <div className="font-display text-2xl leading-none">{d.getDate()}</div>
                  <div className="text-[11px] uppercase" style={{ color: "var(--ink-secondary)" }}>
                    {MOIS_LONG[d.getMonth()].slice(0, 4)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{e.titre}</div>
                  <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                    {e.detail}
                  </div>
                </div>
              </div>
            );
          })}
          {echeances.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucune échéance enregistrée.
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const prochainesEcheances = echeances
    .filter((e) => e.date.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    .map((e) => ({ id: e.id, titre: e.titre, detail: e.detail, color: e.color, date: e.date.toISOString(), jour: (new Date(e.date).getDay() + 6) % 7 }));

  const creneauxAvecObjectif = creneaux.map((c) => ({
    ...c,
    groupe: { ...c.groupe, objectif: objectifActuel(c.groupe.plansEntrainement, c.groupe.objectif, today) },
  }));

  const semaineType = (
    <SemaineTypeClient
      creneaux={creneauxAvecObjectif}
      groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
      coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
      nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, groupeId: n.groupeId }))}
      evenements={evenementsSemaine.map((e) => ({
        id: e.id,
        jour: e.jour,
        debut: e.debut,
        fin: e.fin,
        categorie: e.categorie,
        titre: e.titre,
        lieu: e.lieu,
        coachId: e.coachId,
        coach: e.coach ? { user: { name: e.coach.user.name } } : null,
      }))}
      prochainesEcheances={prochainesEcheances}
    />
  );

  const vacances = (
    <Card>
      <div className="flex justify-between items-center mb-3.5 gap-3 flex-wrap">
        <div>
          <SectionTitle>Stages de vacances</SectionTitle>
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Les créneaux de la semaine type se mettent en pause sur ces périodes ; les stages ci-dessous
            prennent le relais au planning.
          </div>
        </div>
        <Link
          href="/stages"
          className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
        >
          Gérer les stages →
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {stages.map((s) => (
          <Link
            key={s.id}
            href={`/stages?stage=${s.id}`}
            className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${s.color}` }}
          >
            <div className="flex-1">
              <div className="text-sm font-semibold">{s.nom}</div>
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {s.periodeLabel} · {s.lieu}
              </div>
            </div>
          </Link>
        ))}
        {stages.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucun stage enregistré pour l&apos;instant.
          </div>
        )}
      </div>
    </Card>
  );

  const datesSpecifiques = (
    <Card>
      <SectionTitle>Dates spécifiques (compétitions, réunions…)</SectionTitle>
      <EcheancesAdmin echeances={echeances.map((e) => ({ id: e.id, date: e.date.toISOString(), titre: e.titre, detail: e.detail, color: e.color }))} />
    </Card>
  );

  return <CalendrierClient vueEnsemble={vueEnsemble} semaineType={semaineType} vacances={vacances} datesSpecifiques={datesSpecifiques} />;
}
