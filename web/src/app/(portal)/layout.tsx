import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NavStateProvider } from "@/components/portal/NavState";
import { Sidebar } from "@/components/portal/Sidebar";
import { Header } from "@/components/portal/Header";
import { MobileTabBar } from "@/components/portal/MobileTabBar";
import { HeroBanner } from "@/components/portal/HeroBanner";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <NavStateProvider>
      <div
        className="flex min-h-screen"
        style={{
          background: "var(--bg-base)",
          backgroundImage:
            "radial-gradient(1200px 500px at 12% -10%, rgba(30,123,255,0.18), transparent 60%), radial-gradient(900px 420px at 100% 0%, rgba(232,68,43,0.12), transparent 60%)",
        }}
      >
        <Sidebar userName={session.name} roleLabel={session.role === "ADMIN" ? "Administrateur" : "Coach · Accès total"} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Header userName={session.name} />
          <div className="p-4 md:p-6 flex flex-col gap-5 pb-24 md:pb-6">
            <HeroBanner />
            {children}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </NavStateProvider>
  );
}
