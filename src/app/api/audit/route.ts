import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentDemoUser } from "@/lib/auth";
import { verifyAuditChain } from "@/lib/audit";
import { getFallbackAudit } from "@/lib/demoData";

export async function GET() {
  const user = await currentDemoUser();
  if (!user || !["AUDITOR", "ADMIN", "SCRUTINY_OFFICER", "COMPETENT_AUTHORITY"].includes(user.role)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  try {
    const entries = await prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
    const verification = await verifyAuditChain();
    if (!entries || entries.length === 0) throw new Error("Empty audit log");
    return NextResponse.json({ entries, verification });
  } catch {
    return NextResponse.json(getFallbackAudit());
  }
}
