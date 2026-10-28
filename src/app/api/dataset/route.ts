import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFallbackAllInstruments } from "@/lib/demoData";

export async function GET(req: NextRequest) {
  try {
    let instruments: any[] = [];
    try {
      instruments = await prisma.instrument.findMany({
        include: {
          institution: true,
          discrepancies: { where: { status: "OPEN" } },
        },
        orderBy: { maturityDate: "asc" },
      });
    } catch {
      instruments = [];
    }

    if (!instruments || instruments.length === 0) {
      instruments = getFallbackAllInstruments();
    }

    const format = req.nextUrl.searchParams.get("format") || "csv";

    if (format === "json") {
      return new NextResponse(JSON.stringify(instruments, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="fdr_track_dataset.json"',
          "Cache-Control": "no-store",
        },
      });
    }

    // Default: Clean Institutional CSV export
    const headers = [
      "AICTE ID",
      "Institution Name",
      "State",
      "Category",
      "Reference Number",
      "Type",
      "Issuing Bank",
      "Branch",
      "Amount (INR)",
      "Issue Date",
      "Maturity Date",
      "Admin Status",
      "Custody Status",
      "Open Discrepancies",
      "Joint In Favour Of AICTE",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = instruments.map((i) => [
      escapeCsv(i.institution.aicteId),
      escapeCsv(i.institution.name),
      escapeCsv(i.institution.state),
      escapeCsv(i.institution.category),
      escapeCsv(i.referenceNumber),
      escapeCsv(i.type),
      escapeCsv(i.issuingBank),
      escapeCsv(i.branch),
      Number(i.amount),
      escapeCsv(new Date(i.issueDate).toISOString().slice(0, 10)),
      escapeCsv(new Date(i.maturityDate).toISOString().slice(0, 10)),
      escapeCsv(i.adminStatus),
      escapeCsv(i.custodyStatus),
      i.discrepancies.length,
      i.jointInFavourOfAICTE ? "Yes" : "Needs Scrutiny",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fdr_track_institutional_dataset.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate dataset" }, { status: 500 });
  }
}
