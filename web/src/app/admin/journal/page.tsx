import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Connexion",
  LOGIN_ECHEC: "Connexion échouée",
  LOGOUT: "Déconnexion",
  MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé",
  COMPTE_CREE: "Compte créé",
  COMPTE_MODIFIE: "Compte modifié",
  COMPTE_SUPPRIME: "Compte supprimé",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "#2ECC8F",
  LOGIN_ECHEC: "#E8442B",
  LOGOUT: "#61789B",
  MOT_DE_PASSE_REINITIALISE: "#F2B33D",
  COMPTE_CREE: "#1E7BFF",
  COMPTE_MODIFIE: "#F2B33D",
  COMPTE_SUPPRIME: "#E8442B",
};

export default async function JournalPage() {
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <Card>
      <SectionTitle right={`${entries.length} entrées les plus récentes`}>Journal d&apos;activité</SectionTitle>
      <div className="text-[13px] mb-3.5" style={{ color: "var(--ink-secondary)" }}>
        Connexions, déconnexions et actions sur les comptes — pas d&apos;action de gestion courante (groupes, nageurs,
        planning...).
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Date", "Compte", "Rôle", "Action", "Cible", "Détail", "IP"].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#61789B" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 px-2" style={{ color: "var(--ink-secondary)" }}>
                  Aucune entrée pour le moment.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 px-2 whitespace-nowrap" style={{ color: "var(--ink-secondary)" }}>
                  {e.createdAt.toLocaleString("fr-FR")}
                </td>
                <td className="py-2 px-2 font-semibold whitespace-nowrap">{e.userName}</td>
                <td className="py-2 px-2" style={{ color: "var(--ink-secondary)" }}>
                  {e.role ?? "—"}
                </td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: ACTION_COLORS[e.action] ?? "var(--ink)" }}>
                    {ACTION_LABELS[e.action] ?? e.action}
                  </span>
                </td>
                <td className="py-2 px-2" style={{ color: "var(--ink-body)" }}>
                  {e.cible ?? "—"}
                </td>
                <td className="py-2 px-2" style={{ color: "var(--ink-secondary)" }}>
                  {e.detail ?? "—"}
                </td>
                <td className="py-2 px-2 whitespace-nowrap" style={{ color: "var(--ink-secondary)" }}>
                  {e.ip ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
