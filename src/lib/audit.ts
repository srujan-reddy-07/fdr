import { createHash } from "crypto";
import { prisma } from "./prisma";
export type AuditPayload = {
  actor: string;
  role: string;
  action: string;
  entity: string;
  beforeJson: string | null;
  afterJson: string | null;
  previousHash: string | null;
};

export async function appendAudit(actor:string, role:string, action:string, entity:string, before?:unknown, after?:unknown) {
  const previous = await prisma.auditLog.findFirst({orderBy:{timestamp:"desc"}});
  const payload: AuditPayload = {actor,role,action,entity,beforeJson:before===undefined?null:JSON.stringify(before),afterJson:after===undefined?null:JSON.stringify(after),previousHash:previous?.hash ?? null};
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return prisma.auditLog.create({data:{...payload,hash}});
}
export async function verifyAuditChain() {
  const rows = await prisma.auditLog.findMany({orderBy:{timestamp:"asc"}});
  let previousHash: string|null = null;
  for (const row of rows) {
    const payload: AuditPayload = {actor:row.actor,role:row.role,action:row.action,entity:row.entity,beforeJson:row.beforeJson,afterJson:row.afterJson,previousHash};
    const expected = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    if (row.previousHash !== previousHash || row.hash !== expected) return {ok:false,checked:rows.length,brokenEntry:row.id};
    previousHash = row.hash;
  }
  return {ok:true,checked:rows.length,brokenEntry:null};
}
