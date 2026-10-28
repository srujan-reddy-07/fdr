import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getFallbackUser } from "./demoData";

export async function currentDemoUser() {
  try {
    const jar = await cookies();
    const id = jar.get("fdr-demo-user")?.value;
    if (id) {
      const user = await prisma.user.findUnique({ where: { id } }).catch(() => null);
      if (user) return user;
      return getFallbackUser(id);
    }
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } }).catch(() => null);
    if (admin) return admin;
    return getFallbackUser();
  } catch {
    const jar = await cookies().catch(() => null);
    const id = jar?.get("fdr-demo-user")?.value;
    return getFallbackUser(id);
  }
}
export function canReadAll(role: string) { return ["SCRUTINY_OFFICER", "COMPETENT_AUTHORITY", "AUDITOR", "ADMIN"].includes(role); }
export function canMutate(role: string) { return ["SCRUTINY_OFFICER", "COMPETENT_AUTHORITY", "ADMIN"].includes(role); }

