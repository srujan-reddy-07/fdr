import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentDemoUser, canReadAll } from "@/lib/auth";
import { getFallbackDashboard } from "@/lib/demoData";

export async function GET() {
  try {
    const user = await currentDemoUser();
    if (!user) throw new Error("No user");
    const scope = canReadAll(user.role) ? {} : { institutionId: user.institutionId || "__none__" };
    const all = await prisma.instrument.findMany({
      where: scope,
      include: { discrepancies: { where: { status: "OPEN" } } }
    });
    if (!all || all.length === 0) throw new Error("Empty database");
    const now = Date.now();
    const days = (d: Date) => Math.ceil((d.getTime() - now) / 86400000);
    return NextResponse.json({
      total: all.length,
      totalValue: all.reduce((s, i) => s + Number(i.amount), 0),
      active: all.filter(i => days(i.maturityDate) > 30).length,
      expiring30: all.filter(i => days(i.maturityDate) >= 0 && days(i.maturityDate) <= 30).length,
      matured: all.filter(i => days(i.maturityDate) < 0).length,
      openDiscrepancies: all.reduce((s, i) => s + i.discrepancies.length, 0),
      pending: all.filter(i => ["SUBMITTED", "UNDER_SCRUTINY", "DISCREPANCY_OPEN", "RELEASE_REQUESTED"].includes(i.adminStatus)).length
    });
  } catch {
    const user = await currentDemoUser();
    return NextResponse.json(getFallbackDashboard(user));
  }
}
