import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentDemoUser, canReadAll } from "@/lib/auth";
import { appendAudit } from "@/lib/audit";
import { getFallbackInstruments, addFallbackInstrument } from "@/lib/demoData";
import { z } from "zod";

const createSchema = z.object({
  institutionId: z.string().min(1),
  referenceNumber: z.string().min(3).max(100),
  issuingBank: z.string().min(2).max(120),
  branch: z.string().default("Main Branch"),
  amount: z.number().positive(),
  issueDate: z.string(),
  maturityDate: z.string(),
  jointInFavourOfAICTE: z.boolean().default(false)
});

export async function GET(req: NextRequest) {
  const user = await currentDemoUser();
  const q = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const offsetDays = parseInt(req.nextUrl.searchParams.get("offsetDays") || "0", 10) || 0;

  try {
    if (!user) throw new Error("No user");
    const andClauses: any[] = [];
    if (!canReadAll(user.role)) {
      andClauses.push({ institutionId: user.institutionId || "__none__" });
    }
    if (q) {
      andClauses.push({
        OR: [
          { referenceNumber: { contains: q } },
          { issuingBank: { contains: q } },
          { institution: { name: { contains: q } } }
        ]
      });
    }
    if (status) {
      andClauses.push({ adminStatus: status });
    }
    const where = andClauses.length > 0 ? { AND: andClauses } : {};
    const simNow = new Date(Date.now() + offsetDays * 86400000);
    const rows = await prisma.instrument.findMany({
      where,
      include: { institution: true, discrepancies: { where: { status: "OPEN" } }, documents: true },
      orderBy: { maturityDate: "asc" }
    });
    if (!rows || rows.length === 0) {
      // If DB returned 0 but no filters applied, DB might be unseeded
      if (!q && !status) throw new Error("Unseeded database");
    }
    return NextResponse.json(rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      validityStatus:
        new Date(r.maturityDate) < simNow
          ? "MATURED"
          : (new Date(r.maturityDate).getTime() - simNow.getTime()) <= 30 * 86400000
          ? "EXPIRING_SOON"
          : "ACTIVE"
    })));
  } catch {
    return NextResponse.json(getFallbackInstruments(user, q, status, offsetDays));
  }
}

export async function POST(req: NextRequest) {
  const user = await currentDemoUser();
  if (!user || !["INSTITUTION_USER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  if (user.role === "INSTITUTION_USER" && user.institutionId && user.institutionId !== d.institutionId) {
    return NextResponse.json({ error: "You can submit only for your institution" }, { status: 403 });
  }
  if (new Date(d.maturityDate) <= new Date(d.issueDate)) {
    return NextResponse.json({ error: "Maturity date must be after issue date" }, { status: 400 });
  }

  try {
    const instrument = await prisma.instrument.create({
      data: {
        ...d,
        issueDate: new Date(d.issueDate),
        maturityDate: new Date(d.maturityDate),
        adminStatus: "SUBMITTED",
        custodyStatus: "WITH_INSTITUTION"
      }
    });
    await prisma.fieldSource.createMany({
      data: Object.entries(d).map(([fieldName, value]) => ({
        instrumentId: instrument.id,
        fieldName,
        value: String(value),
        source: "INSTITUTION_DECLARED" as const,
        recordedBy: user.name
      }))
    }).catch(() => null);
    await appendAudit(user.name, user.role, "CREATE_INSTRUMENT", instrument.id, undefined, d).catch(() => null);
    return NextResponse.json(instrument, { status: 201 });
  } catch {
    const instrument = addFallbackInstrument(user, d);
    return NextResponse.json(instrument, { status: 201 });
  }
}
