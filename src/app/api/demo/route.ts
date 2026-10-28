import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentDemoUser } from "@/lib/auth";
import { getFallbackDemoUsers } from "@/lib/demoData";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, institutionId: true },
      orderBy: { role: "asc" }
    });
    if (!users || users.length === 0) throw new Error("Empty database");
    const current = await currentDemoUser();
    return NextResponse.json({
      users,
      current: current ? { id: current.id, name: current.name, role: current.role, institutionId: current.institutionId } : null
    });
  } catch {
    const fallbackUsers = getFallbackDemoUsers();
    const current = await currentDemoUser();
    return NextResponse.json({
      users: fallbackUsers,
      current: current ? { id: current.id, name: current.name, role: current.role, institutionId: current.institutionId } : fallbackUsers[4]
    });
  }
}

