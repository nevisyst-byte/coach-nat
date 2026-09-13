import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { SeanceSelect } from "@/components/portal/SeanceSelect";
import { DateNav } from "@/components/portal/DateNav";
import { PresenceRoster } from "@/components/portal/PresenceRoster";
import { JOURS } from "@/lib/format";
import { lastOccurrenceOnOrBefore, toDateInputValue } from "@/lib/week";
import { resolveSeanceInstance } from "@/lib/seance-instance";
import { genererSeance, genererSeanceMulti, normalizeCombos, type Bloc } from "@/lib/seance-generator";
import { couleurObjectif } from "@/lib/objectifs";
import { seanceDepuisPlan } from "@/lib/plan-entrainement";
import { AjustementBloc } from "@/components/portal/AjustementBloc";
import { EditerSeanceInstance } from "@/components/portal/EditerSeanceInstance";
import { getSession } from "@/lib/auth";
import { buildManualBlocs, blocsToSections, type SectionManuelle } from "@/lib/seance-manual";

export default async function PresencesPage({ searchParams }: { searchParams: Promise<{ slot?: string; date?: string }> }) {
  const [creneaux, creneauxStage, modelesSeance] = await Promise.all([
    prisma.creneau.findMany({ include: { groupe: true } }),
    prisma.creneauStage.findMany({ include: { stage: true } }),
    prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const modeles = modelesSeance.map((m) => ({
    id: m.id,
    nom: m.nom,
    theme: m.theme,
    heureDebut: m.heureDebut,
    combos: normalizeCombos(m.combos),
    volumeNage: m.volumeNage,
    sections: m.sections as unknown as SectionManuelle[] | null,
  }));

  const options = [
    ...creneaux.map((c) => ({ value: `reg:${c.id}`, label: `${JOURS[c.jour]} ${c.debut} · ${c.groupe.nom}` })),
    ...creneauxStage.map((c) => ({ value: `stage:${c.id}`, label: `${c.stage.nom} · ${JOURS[c.jour]} ${c.debut} · ${c.groupe}` })),
  ];

  if (options.length === 0) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Aucune séance planifiée pour le moment.
        </div>
      </Card>
    );
  }

  const { slot: slotParam, date: dateParam } = await searchParams;
  const slot = slotParam && options.some((o) => o.value === slotParam) ? slotParam : options[0].value;
  const [kind, id] = slot.split(":");

  const stepDays = kind === "reg" ? 7 : 1;
  const defaultDate =
    kind === "reg"
      ? toDateInputValue(lastOccurrenceOnOrBefore(creneaux.find((c) => c.id === id)!.jour))
      : toDateInputValue(new Date());
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : defaultDate;

  const session = await getSession();
  const instance = await resolveSeanceInstance(slot, date);
  if (!instance) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Séance introuvable.
        </div>
      </Card>
    );
  }

  const groupeNom = kind === "reg" ? creneaux.find((c) => c.id === id)?.groupe.nom ?? null : creneauxStage.find((c) => c.id === id)?.groupe ?? null;
  const realGroupe = groupeNom && groupeNom !== "Tous groupes" ? groupeNom : null;

  // Un créneau régulier peut restreindre son effectif à un sous-ensemble du
  // groupe (ex. seuls les 4 nages font le créneau technique) — sinon, tout
  // le groupe est attendu par défaut.
  const effectifExplicite = kind === "reg" ? await prisma.creneauNageur.findMany({ where: { creneauId: id }, include: { nageur: { include: { groupe: true } } } }) : [];
  const nageurs =
    effectifExplicite.length > 0
      ? effectifExplicite.map((cn) => cn.nageur)
      : await prisma.nageur.findMany({ where: realGroupe ? { groupe: { nom: realGroupe } } : {}, include: { groupe: true } });
  const presences = await prisma.presence.findMany({ where: { seanceInstanceId: instance.id } });
  const etatMap = new Map(presences.map((p) => [p.nomPersonne, p.etat]));

  const rosterNageurs = nageurs.map((n) => ({ nom: n.nom, initiales: n.initiales, sousTitre: n.groupe?.categorie ?? n.categorie, etat: etatMap.get(n.nom) ?? "PRESENT", nageurId: n.id }));

  const creneauReg = kind === "reg" ? creneaux.find((c) => c.id === id) : null;
  const creneauStageActuel = kind === "stage" ? creneauxStage.find((c) => c.id === id) : null;
  const groupeId = creneauReg?.groupeId ?? null;
  const planContenu = !instance.blocs && groupeId ? await seanceDepuisPlan(groupeId, new Date(`${date}T00:00:00`)) : null;

  // Un créneau de stage porte directement son propre contenu détaillé (pas
  // de plan d'entraînement séparé pour un stage) — mêmes sections/combos que
  // sur un plan classique, lus directement sur le créneau.
  const sectionsStage = creneauStageActuel?.sections as unknown as SectionManuelle[] | null;
  const combosStage = normalizeCombos(creneauStageActuel?.combos);
  const contenuStage =
    !instance.blocs && creneauStageActuel
      ? sectionsStage && sectionsStage.length > 0
        ? { resume: `${creneauStageActuel.theme}`, items: buildManualBlocs(creneauStageActuel.debut, sectionsStage).map((bloc) => ({ bloc, sectionId: null, pourcentage: null })) }
        : combosStage && combosStage.length > 0
          ? { resume: `${creneauStageActuel.theme}`, items: genererSeanceMulti(combosStage, creneauStageActuel.volume || 0).blocs.map((bloc) => ({ bloc, sectionId: null, pourcentage: null })) }
          : creneauStageActuel.variant && creneauStageActuel.intensite && creneauStageActuel.nage
            ? { resume: `${creneauStageActuel.theme}`, items: genererSeance(creneauStageActuel.variant, creneauStageActuel.intensite, creneauStageActuel.nage, creneauStageActuel.volume || 0).blocs.map((bloc) => ({ bloc, sectionId: null, pourcentage: null })) }
            : null
      : null;

  const seancePrevue = instance.blocs
    ? {
        resume: `${instance.variant} · ${instance.intensite} · ${instance.nage} · ${instance.volumeNage} m`,
        items: (instance.blocs as unknown as Bloc[]).map((bloc) => ({ bloc, sectionId: null, pourcentage: null })),
      }
    : planContenu
      ? { resume: `Plan d'entraînement : ${planContenu.nomPlan}`, items: planContenu.items }
      : contenuStage
        ? contenuStage
        : instance.variant && instance.intensite && instance.nage && instance.volumeNage
          ? { resume: `${instance.variant} · ${instance.intensite} · ${instance.nage} · ${instance.volumeNage} m`, items: genererSeance(instance.variant, instance.intensite, instance.nage, instance.volumeNage).blocs.map((bloc) => ({ bloc, sectionId: null, pourcentage: null })) }
          : null;

  // Pré-remplissage de l'éditeur ponctuel : la surcharge déjà enregistrée
  // pour cette date si elle existe, sinon le détail structuré du plan actif
  // ou du créneau de stage — et si le contenu vient d'une génération auto
  // (combos/variant, pas de sections manuelles), on reconstruit des sections
  // éditables à partir des blocs déjà compilés (mêmes 4 phases, mêmes
  // volumes que "Séance prévue") plutôt que de ne montrer qu'une section
  // vide : le coach doit pouvoir modifier toute la séance, pas juste
  // l'échauffement.
  const sectionsInitiales =
    (instance.sections as unknown as SectionManuelle[] | null) ??
    planContenu?.sections ??
    sectionsStage ??
    (seancePrevue ? blocsToSections(seancePrevue.items.map((i) => i.bloc)) : []);
  const heureDebutInitiale = instance.heureDebut ?? planContenu?.heureDebut ?? creneauReg?.debut ?? creneauStageActuel?.debut ?? "17:00";

  const compte = { PRESENT: 0, RETARD: 0, ABSENT: 0, EXCUSE: 0 } as Record<string, number>;
  for (const p of rosterNageurs) compte[p.etat]++;
  const total = rosterNageurs.length || 1;
  const taux = Math.round(((compte.PRESENT + compte.RETARD) / total) * 100);
  const tauxColor = taux >= 85 ? "#2ECC8F" : taux >= 70 ? "#F2B33D" : "#E8442B";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/planning"
        className="self-start rounded-[9px] px-3.5 py-1.5 text-[13px]"
        style={{ border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
      >
        ← Planning
      </Link>
      <div className="flex items-center gap-3.5 flex-wrap">
        <SeanceSelect value={slot} options={options} />
        <DateNav slot={slot} date={date} stepDays={stepDays} />
        <div className="flex gap-3.5 flex-wrap flex-1">
          {[
            { label: "Présent", color: "#2ECC8F" },
            { label: "Retard", color: "#F2B33D" },
            { label: "Absent", color: "#E8442B" },
            { label: "Excusé", color: "#8CC4FF" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--ink-body)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {[
          { v: compte.PRESENT, l: "Présents", color: "#2ECC8F" },
          { v: compte.RETARD, l: "Retards", color: "#F2B33D" },
          { v: compte.ABSENT, l: "Absents", color: "#E8442B" },
          { v: compte.EXCUSE, l: "Excusés", color: "#8CC4FF" },
        ].map((r) => (
          <Card key={r.l} padding={16}>
            <div className="font-display text-[34px] leading-none" style={{ color: r.color }}>
              {r.v}
            </div>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {r.l}
            </div>
          </Card>
        ))}
        <Card padding={16} className="flex flex-col justify-center">
          <div className="flex justify-between text-[13px] mb-1.5">
            <span style={{ color: "var(--ink-secondary)" }}>Taux de présence</span>
            <span className="font-bold" style={{ color: tauxColor }}>
              {taux}%
            </span>
          </div>
          <div className="h-2.5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-md" style={{ width: `${taux}%`, background: tauxColor }} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 items-start grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(400px,1fr))]">
        <PresenceRoster key={instance.id} title="Nageurs" people={rosterNageurs} seanceInstanceId={instance.id} role="SWIMMER" />

        <Card>
          <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-[19px] tracking-[0.06em]">Séance prévue</h2>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ink-secondary)" }}>
                · {heureDebutInitiale}
              </span>
            </div>
            {session && kind === "reg" && <EditerSeanceInstance instanceId={instance.id} heureDebutInitial={heureDebutInitiale} sectionsInitiales={sectionsInitiales} modeles={modeles} />}
          </div>
          {seancePrevue ? (
            <>
              <div className="text-[13px] mb-3.5" style={{ color: "#7FDCFF" }}>
                {seancePrevue.resume}
              </div>
              <div className="flex flex-col gap-2.5">
                {seancePrevue.items.map(({ bloc: b, sectionId, pourcentage }, i) => (
                  <div
                    key={i}
                    className="flex gap-3.5 rounded-xl px-3.5 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderLeft: `3px solid ${b.objectif ? couleurObjectif(b.objectif) : "var(--border)"}` }}
                  >
                    <div style={{ minWidth: 64 }}>
                      <div className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
                        {b.phase}
                      </div>
                      <div className="font-display text-lg">{b.distance}</div>
                      {b.objectif && (
                        <div className="text-[10px] font-semibold mt-0.5" style={{ color: couleurObjectif(b.objectif) }}>
                          {b.objectif}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold whitespace-pre-line">{b.contenu}</div>
                      <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                        {b.consigne}
                      </div>
                    </div>
                    {sectionId && planContenu?.editable && session && (
                      <AjustementBloc planId={planContenu.planId} groupeId={groupeId!} date={date} sectionId={sectionId} pourcentageActuel={pourcentage} />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun contenu de séance planifié pour cette date — ni plan d&apos;entraînement actif pour ce groupe, ni
              contenu saisi pour ce créneau. Utilise « ✎ Modifier cette séance » ci-dessus pour la saisir, ou{" "}
              <Link href="/entrainement" style={{ color: "#7FDCFF" }}>
                planifie un plan d&apos;entraînement
              </Link>{" "}
              pour ce groupe.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
