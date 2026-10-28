import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFallbackUser } from "@/lib/demoData";
import { z } from "zod";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid demo user" }, { status: 400 });

  let user: { id: string; name: string; role: string; institutionId?: string | null } | null = null;
  try {
    user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  } catch {
    user = null;
  }

  if (!user) {
    user = getFallbackUser(parsed.data.userId);
  }

  if (!user) return NextResponse.json({ error: "Unknown demo user" }, { status: 404 });

  const response = NextResponse.json({ id: user.id, name: user.name, role: user.role, institutionId: user.institutionId });
  response.cookies.set("fdr-demo-user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
