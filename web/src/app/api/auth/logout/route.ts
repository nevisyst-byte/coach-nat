import { NextResponse } from "next/server";
import { getSession, clearSessionCookie, revokeSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await revokeSession(session.sessionId);
    await logAudit({ userId: session.userId, userName: session.name, role: session.role, action: "LOGOUT" });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
