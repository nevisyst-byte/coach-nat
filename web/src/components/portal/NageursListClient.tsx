"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { initialsColor } from "@/lib/format";

type NageurRow = {
  id: string;
  nom: string;
  initiales: string;
  age: number;
  categorie: string;
  specialite: string | null;
  groupeId: string | null;
  groupeNom: string | null;
  pointsFFN: number;
  rangDept: number | null;
  rangReg: number | null;
  rangNat: number | null;
  presenceRate: number;
};

type Pole = { pole: string; nom: string; color: string; rows: NageurRow[] };
type Groupe = { id: string; nom: string; categorie: string };
type FfnResult = { iuf: string; nom: string };

const currentYear = new Date().getFullYear();

function splitNom(nom: string) {
  const i = nom.indexOf(" ");
  return i === -1 ? { prenom: nom, nomFamille: "" } : { prenom: nom.slice(0, i), nomFamille: nom.slice(i + 1) };
}

export function NageursListClient({ groupesByPole, allGroupes, isAdmin }: { groupesByPole: Pole[]; allGroupes: Groupe[]; isAdmin: boolean }) {
  const router = useRouter();

  // Création : "recherche" (prénom/nom + FFN) -> "completer" (champs propres au club).
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"recherche" | "completer">("recherche");
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [ffnResults, setFfnResults] = useState<FfnResult[]>([]);
  const [ffnSearched, setFfnSearched] = useState(false);
  const [ffnSearching, setFfnSearching] = useState(false);
  const [ffnError, setFfnError] = useState<string | null>(null);
  const [selectedIuf, setSelectedIuf] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [completer, setCompleter] = useState({ anneeNaissance: "", categorie: "", specialite: "", groupeId: "" });
  const [saving, setSaving] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  // Édition d'un nageur existant : formulaire simple, sans re-recherche FFN
  // (déjà gérée depuis sa fiche individuelle).
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [editForm, setEditForm] = useState({ prenom: "", nomFamille: "", anneeNaissance: "", categorie: "", specialite: "", groupeId: "" });

  function openCreate() {
    setPrenom("");
    setNomFamille("");
    setFfnResults([]);
    setFfnSearched(false);
    setFfnError(null);
    setSelectedIuf(null);
    setCompleter({ anneeNaissance: "", categorie: "", specialite: "", groupeId: "" });
    setSaveWarning(null);
    setCreateStep("recherche");
    setCreateOpen(true);
  }

  function openEdit(n: NageurRow) {
    setEditForm({ ...splitNom(n.nom), anneeNaissance: String(currentYear - n.age), categorie: n.categorie, specialite: n.specialite ?? "", groupeId: n.groupeId ?? "" });
    setEditing({ id: n.id });
  }

  async function searchFfn() {
    // FFN cherche sur "Nom Prénom", pas "Prénom Nom" (ordre inverse de notre
    // affichage interne) — sinon la recherche ne matche rien.
    const q = `${nomFamille.trim()} ${prenom.trim()}`.trim();
    if (q.length < 4) return;
    setFfnSearching(true);
    setFfnError(null);
    try {
      const res = await fetch(`/api/ffn/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setFfnError(data.error ?? "Erreur");
        return;
      }
      setFfnResults(data.results);
      setFfnSearched(true);
    } finally {
      setFfnSearching(false);
    }
  }

  async function pickFfnResult(iuf: string) {
    setSelectedIuf(iuf);
    setPreviewLoading(true);
    setFfnError(null);
    try {
      const res = await fetch(`/api/ffn/preview?iuf=${encodeURIComponent(iuf)}`);
      const data = await res.json();
      setCompleter((f) => ({ ...f, anneeNaissance: data.anneeNaissanceEstimee ? String(data.anneeNaissanceEstimee) : "" }));
    } finally {
      setPreviewLoading(false);
      setCreateStep("completer");
    }
  }

  function skipFfn() {
    setSelectedIuf(null);
    setCreateStep("completer");
  }

  function chooseGroupeCreate(groupeId: string) {
    const g = allGroupes.find((x) => x.id === groupeId);
    setCompleter((f) => ({ ...f, groupeId, categorie: f.categorie.trim() ? f.categorie : (g?.categorie ?? f.categorie) }));
  }

  function chooseGroupeEdit(groupeId: string) {
    const g = allGroupes.find((x) => x.id === groupeId);
    setEditForm((f) => ({ ...f, groupeId, categorie: f.categorie.trim() ? f.categorie : (g?.categorie ?? f.categorie) }));
  }

  const createIncomplet = !prenom.trim() || !nomFamille.trim() || !completer.categorie.trim() || !parseInt(completer.anneeNaissance, 10);

  async function submitCreate() {
    if (createIncomplet) return;
    setSaving(true);
    setSaveWarning(null);
    try {
      const body = {
        nom: `${prenom.trim()} ${nomFamille.trim()}`.trim(),
        anneeNaissance: parseInt(completer.anneeNaissance, 10),
        categorie: completer.categorie.trim(),
        specialite: completer.specialite.trim() || null,
        groupeId: completer.groupeId || null,
        ffnIuf: selectedIuf ?? undefined,
      };
      const res = await fetch("/api/admin/nageurs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.ffnError) {
        setSaveWarning(`Nageur créé, mais la synchro FFN a échoué (${data.ffnError}) — réessayable depuis sa fiche.`);
        setSaving(false);
        router.refresh();
        return;
      }
      setCreateOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const editIncomplet = !editForm.prenom.trim() || !editForm.nomFamille.trim() || !editForm.categorie.trim() || !parseInt(editForm.anneeNaissance, 10);

  async function submitEdit() {
    if (!editing || editIncomplet) return;
    setSaving(true);
    try {
      const body = {
        nom: `${editForm.prenom.trim()} ${editForm.nomFamille.trim()}`.trim(),
        anneeNaissance: parseInt(editForm.anneeNaissance, 10),
        categorie: editForm.categorie.trim(),
        specialite: editForm.specialite.trim() || null,
        groupeId: editForm.groupeId || null,
      };
      await fetch(`/api/admin/nageurs/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ? Ses performances, notations et absences seront supprimées aussi.`)) return;
    await fetch(`/api/admin/nageurs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" };

  return (
    <>
      {isAdmin && (
        <div className="px-4 md:px-5 pt-4">
          <button
            onClick={openCreate}
            className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
          >
            + Nouveau nageur
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 md:p-5">
        {groupesByPole.map((g) => (
          <div key={g.pole} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: `3px solid ${g.color}`, background: "var(--bg-card)" }}>
            <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
              <span className="font-display text-[17px] tracking-[0.05em] uppercase">{g.nom}</span>
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {g.rows.length} nageur{g.rows.length > 1 ? "s" : ""}
              </span>
            </div>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-5 py-2"
              style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ minWidth: 170, color: "#61789B" }}>
                Nageur
              </div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ minWidth: 60, color: "#61789B" }}>
                Catégorie
              </div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ minWidth: 90, color: "#61789B" }}>
                Groupe
              </div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ minWidth: 40, color: "#61789B" }} title="Points de cotation FFN">
                Pts FFN
              </div>
              <div className="hidden sm:block text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#61789B" }} title="Rang départemental / régional / national">
                Rangs (D/R/N)
              </div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#61789B" }} title="Part des séances pointées Présent ou Retard, calculée sur l'historique de présence de ce nageur">
                Présence
              </div>
            </div>
            <div className="flex flex-col">
              {g.rows.map((n) => {
                const p = n.presenceRate;
                const presBg = p >= 85 ? "rgba(46,204,143,0.14)" : p >= 70 ? "rgba(242,179,61,0.15)" : "rgba(232,68,43,0.16)";
                const presFg = p >= 85 ? "#2ECC8F" : p >= 70 ? "#F2B33D" : "#E8442B";
                return (
                  <div key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <Link href={`/nageurs/${n.id}`} className="flex items-center gap-2.5" style={{ minWidth: 170 }}>
                      <div
                        className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: initialsColor(n.nom) }}
                      >
                        {n.initiales}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {n.nom}
                        </div>
                        <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                          {n.age} ans{n.specialite ? ` · ${n.specialite}` : ""}
                        </div>
                      </div>
                    </Link>
                    <div className="text-[13px]" style={{ minWidth: 60, color: "var(--ink-body)" }}>
                      {n.categorie}
                    </div>
                    <div className="text-[13px]" style={{ minWidth: 90, color: "var(--ink-body)" }}>
                      {n.groupeNom ?? "—"}
                    </div>
                    <div className="font-display text-lg" style={{ minWidth: 40 }}>
                      {n.pointsFFN || "—"}
                    </div>
                    <div className="hidden sm:block text-[13px]" style={{ color: "var(--ink-body)" }}>
                      {n.rangDept ? `${n.rangDept} / ${n.rangReg} / ${n.rangNat}` : "— / — / —"}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: presBg, color: presFg }}>
                      {n.presenceRate}%
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1.5 ml-auto">
                        <button onClick={() => openEdit(n)} className="rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                          Modifier
                        </button>
                        <button onClick={() => remove(n.id, n.nom)} className="rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Création : étape 1, recherche FFN */}
      {createOpen && createStep === "recherche" && (
        <div onClick={() => setCreateOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Nouveau nageur</h2>
              <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
                Saisis le nom, on cherche directement sur ffn.extranat.fr pour récupérer ce qui existe.
              </div>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
                <input placeholder="Nom" value={nomFamille} onChange={(e) => setNomFamille(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchFfn()} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
              </div>
              <button
                onClick={searchFfn}
                disabled={ffnSearching || `${prenom.trim()} ${nomFamille.trim()}`.trim().length < 4}
                className="rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: ffnSearching || `${prenom.trim()} ${nomFamille.trim()}`.trim().length < 4 ? 0.5 : 1 }}
              >
                {ffnSearching ? "Recherche…" : "Chercher sur FFN"}
              </button>
              {ffnError && (
                <div className="text-[13px]" style={{ color: "#FF9179" }}>
                  {ffnError}
                </div>
              )}
              {ffnResults.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
                  {ffnResults.map((r) => (
                    <button
                      key={r.iuf}
                      onClick={() => pickFfnResult(r.iuf)}
                      disabled={previewLoading}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}
                    >
                      <span className="text-sm font-semibold">{r.nom}</span>
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                        {previewLoading && selectedIuf === r.iuf ? "…" : `IUF ${r.iuf}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {ffnResults.length === 0 && !ffnSearching && ffnSearched && (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun résultat FFN — tu peux continuer en saisie manuelle.
                </div>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setCreateOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={skipFfn} disabled={!prenom.trim() || !nomFamille.trim()} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)", opacity: !prenom.trim() || !nomFamille.trim() ? 0.5 : 1 }}>
                Continuer sans FFN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Création : étape 2, compléter les champs propres au club */}
      {createOpen && createStep === "completer" && (
        <div onClick={() => setCreateOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">
                  {prenom} {nomFamille}
                </h2>
                <div className="text-[13px] mt-0.5" style={{ color: selectedIuf ? "#2ECC8F" : "var(--ink-secondary)" }}>
                  {selectedIuf ? `Relié à la fiche FFN (IUF ${selectedIuf})` : "Sans lien FFN"}
                </div>
              </div>
              <button onClick={() => setCreateStep("recherche")} className="text-xs cursor-pointer underline" style={{ color: "var(--ink-muted)" }}>
                ← changer
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "#61789B" }}>
                    Année de naissance {selectedIuf && completer.anneeNaissance && <span style={{ color: "#2ECC8F" }}>(estimée FFN)</span>}
                  </div>
                  <input
                    type="number"
                    placeholder={`ex. ${currentYear - 12}`}
                    value={completer.anneeNaissance}
                    onChange={(e) => setCompleter((f) => ({ ...f, anneeNaissance: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "#61789B" }}>
                    Catégorie
                  </div>
                  <input
                    placeholder="ex. Espoir, EN3…"
                    value={completer.categorie}
                    onChange={(e) => setCompleter((f) => ({ ...f, categorie: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "#61789B" }}>
                  Groupe
                </div>
                <select value={completer.groupeId} onChange={(e) => chooseGroupeCreate(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                  <option value="" style={{ background: "#101A2B" }}>
                    — groupe —
                  </option>
                  {allGroupes.map((g) => (
                    <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                      {g.nom}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                  Choisir un groupe pré-remplit la catégorie si elle est vide.
                </div>
              </div>
              <input
                placeholder="Spécialité — optionnel, à définir par le coach (ex. Crawl, 4 nages…)"
                value={completer.specialite}
                onChange={(e) => setCompleter((f) => ({ ...f, specialite: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              {saveWarning && (
                <div className="text-[13px]" style={{ color: "#F2B33D" }}>
                  {saveWarning}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setCreateOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={submitCreate}
                disabled={saving || createIncomplet}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || createIncomplet ? 0.5 : 1, cursor: saving || createIncomplet ? "not-allowed" : "pointer" }}
              >
                {saving ? "Enregistrement…" : "Créer le nageur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Modifier le nageur</h2>
              <button onClick={() => setEditing(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <input placeholder="Prénom" value={editForm.prenom} onChange={(e) => setEditForm((f) => ({ ...f, prenom: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
                <input placeholder="Nom" value={editForm.nomFamille} onChange={(e) => setEditForm((f) => ({ ...f, nomFamille: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "#61789B" }}>
                    Année de naissance
                  </div>
                  <input
                    type="number"
                    placeholder={`ex. ${currentYear - 12}`}
                    value={editForm.anneeNaissance}
                    onChange={(e) => setEditForm((f) => ({ ...f, anneeNaissance: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "#61789B" }}>
                    Catégorie
                  </div>
                  <input
                    placeholder="ex. Espoir, EN3…"
                    value={editForm.categorie}
                    onChange={(e) => setEditForm((f) => ({ ...f, categorie: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <select value={editForm.groupeId} onChange={(e) => chooseGroupeEdit(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                <option value="" style={{ background: "#101A2B" }}>
                  — groupe —
                </option>
                {allGroupes.map((g) => (
                  <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                    {g.nom}
                  </option>
                ))}
              </select>
              <input
                placeholder="Spécialité — optionnel, à définir par le coach (ex. Crawl, 4 nages…)"
                value={editForm.specialite}
                onChange={(e) => setEditForm((f) => ({ ...f, specialite: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setEditing(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={submitEdit}
                disabled={saving || editIncomplet}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || editIncomplet ? 0.5 : 1, cursor: saving || editIncomplet ? "not-allowed" : "pointer" }}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

