import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentDemoUser, canMutate } from "@/lib/auth";
import { appendAudit } from "@/lib/audit";
import { evaluateInstrument } from "@/lib/rules";
import { reviewFallbackInstrument } from "@/lib/demoData";
import { z } from "zod";

const schema = z.object({
  action: z.enum([
    "RUN_RULES",
    "VERIFY_BANK",
    "RESOLVE_DISCREPANCY",
    "RECOMMEND_RELEASE",
    "APPROVE_RELEASE",
    "REJECT_RELEASE"
  ]),
  note: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentDemoUser();
  if (!user || !canMutate(user.role)) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { action, note } = parsed.data;

  try {
    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: { discrepancies: true, documents: true }
    });
    if (!instrument) throw new Error("Instrument not found in DB");

    if (action === "RUN_RULES") {
      const findings = evaluateInstrument({ ...instrument, amount: Number(instrument.amount) });
      await prisma.discrepancy.deleteMany({ where: { instrumentId: id, status: "OPEN" } });
      for (const f of findings) {
        await prisma.discrepancy.create({
          data: { instrumentId: id, ruleCode: f.ruleCode, severity: f.severity, expected: f.expected, found: f.found }
        });
      }
      const status = findings.length ? "DISCREPANCY_OPEN" : "VERIFIED";
      await prisma.instrument.update({ where: { id }, data: { adminStatus: status } });
      await appendAudit(user.name, user.role, "RUN_RULES", id, undefined, { findings, status }).catch(() => null);
      return NextResponse.json({ findings, status });
    }

    if (action === "VERIFY_BANK") {
      const outcome = instrument.referenceNumber.endsWith("99") ? "MISMATCH" : "CONFIRMED";
      if (outcome === "CONFIRMED") {
        await prisma.fieldSource.updateMany({ where: { instrumentId: id }, data: { source: "BANK_CONFIRMED" } });
      }
      await appendAudit(user.name, user.role, "SIMULATED_BANK_VERIFICATION", id, undefined, { outcome }).catch(() => null);
      return NextResponse.json({ outcome, notice: "Simulated: real integration needs an authorised bank or AICTE verification channel" });
    }

    if (action === "RESOLVE_DISCREPANCY") {
      if (!note?.trim()) return NextResponse.json({ error: "Resolution note required" }, { status: 400 });
      await prisma.discrepancy.updateMany({
        where: { instrumentId: id, status: { in: ["OPEN", "RESPONDED"] } },
        data: { status: "RESOLVED", resolutionNote: note, resolvedBy: user.name }
      });
      const open = await prisma.discrepancy.count({ where: { instrumentId: id, status: "OPEN" } });
      if (!open) await prisma.instrument.update({ where: { id }, data: { adminStatus: "VERIFIED" } });
      await appendAudit(user.name, user.role, "RESOLVE_DISCREPANCY", id, undefined, { note }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    if (action === "RECOMMEND_RELEASE") {
      const open = instrument.discrepancies.filter(d => d.status === "OPEN").length;
      const conditions = [
        { name: "No open discrepancies", pass: open === 0, reason: open ? `${open} open discrepancy items` : "Clear" },
        { name: "Required document present", pass: instrument.documents.length > 0, reason: instrument.documents.length ? "Document present" : "Upload required document" },
        { name: "Custody confirmed", pass: instrument.custodyStatus === "IN_CUSTODY", reason: instrument.custodyStatus }
      ];
      if (conditions.some(c => !c.pass)) return NextResponse.json({ error: "Release blocked by conditions", conditions }, { status: 409 });
      await prisma.instrument.update({ where: { id }, data: { adminStatus: "RELEASE_REQUESTED" } });
      await prisma.releaseRequest.create({
        data: {
          instrumentId: id,
          requestedBy: user.name,
          reason: note || "Institution release request",
          conditionsChecklist: JSON.stringify(conditions),
          stage: "RECOMMENDED",
          slaDueDate: new Date(Date.now() + 7 * 86400000)
        }
      });
      await appendAudit(user.name, user.role, "RECOMMEND_RELEASE", id, undefined, { conditions }).catch(() => null);
      return NextResponse.json({ ok: true, conditions });
    }

    if (action === "APPROVE_RELEASE" || action === "REJECT_RELEASE") {
      if (user.role !== "COMPETENT_AUTHORITY" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only competent authority can decide" }, { status: 403 });
      }
      await prisma.instrument.update({
        where: { id },
        data: {
          adminStatus: action === "APPROVE_RELEASE" ? "RELEASE_APPROVED" : "REJECTED",
          ...(action === "APPROVE_RELEASE" ? { custodyStatus: "RETURNED" } : {})
        }
      });
      await prisma.releaseRequest.updateMany({
        where: { instrumentId: id, stage: { in: ["REQUESTED", "SCRUTINY", "RECOMMENDED"] } },
        data: { stage: action === "APPROVE_RELEASE" ? "RELEASED" : "REJECTED", decisionNotes: note || "" }
      });
      await appendAudit(user.name, user.role, action, id, undefined, { note }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch {
    const res = reviewFallbackInstrument(id, action, note, user);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    return NextResponse.json(res);
  }
}
