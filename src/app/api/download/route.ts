import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const candidates = [
    path.join(process.cwd(), "public", "FDR-Track-Vercel-Ready.zip"),
    path.join(process.cwd(), "..", "FDR-Track-Vercel-Ready.zip"),
    path.join(process.cwd(), "public", "FDR_Track_SIH26265_Fixed.zip"),
    path.join(process.cwd(), "..", "FDR-Track- fixxxxxxxxxxxxx.zip")
  ];

  const filePath = candidates.find(p => fs.existsSync(p));
  if (!filePath) {
    return NextResponse.json({ error: "Download file not found on server" }, { status: 404 });
  }

  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
