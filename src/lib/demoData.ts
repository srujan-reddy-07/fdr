import { evaluateInstrument } from "./rules";

const states = [
  "Telangana", "Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu",
  "Kerala", "Gujarat", "Rajasthan", "Delhi", "Odisha"
];

const categories = ["Engineering", "Management", "Pharmacy", "Technical University"];

export interface FallbackInstitution {
  id: string;
  aicteId: string;
  name: string;
  state: string;
  category: string;
  isGovernment: boolean;
  email: string;
  phone: string;
}

export interface FallbackUser {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId?: string | null;
}

export interface FallbackDiscrepancy {
  id: string;
  instrumentId: string;
  ruleCode: string;
  severity: string;
  expected: string;
  found: string;
  status: string;
  resolutionNote?: string | null;
  resolvedBy?: string | null;
}

export interface FallbackInstrument {
  id: string;
  institutionId: string;
  type: string;
  referenceNumber: string;
  issuingBank: string;
  branch: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  jointInFavourOfAICTE: boolean;
  custodyStatus: string;
  adminStatus: string;
  custodyLocation?: string | null;
  institution: FallbackInstitution;
  discrepancies: FallbackDiscrepancy[];
  documents: any[];
}

// 1. Generate 25 institutions
const institutions: FallbackInstitution[] = Array.from({ length: 25 }, (_, i) => ({
  id: `inst-${i + 1}`,
  aicteId: `SYN-AICTE-${String(i + 1).padStart(4, "0")}`,
  name: `${["National", "Deccan", "River", "Pioneer", "Summit"][i % 5]} ${
    ["Institute of Technology", "Technical College", "School of Engineering", "Academy"][i % 4]
  } ${i + 1}`,
  state: states[i % states.length],
  category: categories[i % categories.length],
  isGovernment: i % 7 === 0,
  email: `compliance${i + 1}@example.test`,
  phone: `900000${String(i + 1).padStart(4, "0")}`
}));

// 2. Generate 5 demo users
const users: FallbackUser[] = [
  { id: "user-1", name: "Institution Demo", email: "institution@example.test", role: "INSTITUTION_USER", institutionId: institutions[0].id },
  { id: "user-2", name: "Scrutiny Officer", email: "scrutiny@example.test", role: "SCRUTINY_OFFICER", institutionId: null },
  { id: "user-3", name: "Competent Authority", email: "authority@example.test", role: "COMPETENT_AUTHORITY", institutionId: null },
  { id: "user-4", name: "Read-only Auditor", email: "auditor@example.test", role: "AUDITOR", institutionId: null },
  { id: "user-5", name: "System Admin", email: "admin@example.test", role: "ADMIN", institutionId: null }
];

// 3. Generate 64 instruments matching seed.ts
const refStatus = [
  "SUBMITTED", "UNDER_SCRUTINY", "DISCREPANCY_OPEN", "VERIFIED", "RENEWAL_PENDING",
  "RENEWED_OR_REPLACED", "RELEASE_REQUESTED", "RELEASE_APPROVED", "RELEASED", "REJECTED"
];
const custody = ["WITH_INSTITUTION", "SUBMITTED_TO_OFFICE", "IN_CUSTODY", "RETURNED"];

const now = new Date();
const instruments: FallbackInstrument[] = [];

for (let i = 0; i < 64; i++) {
  const issue = new Date(now);
  issue.setDate(issue.getDate() - ((i * 11) % 650));
  const maturity = new Date(now);
  maturity.setDate(maturity.getDate() + ([20, 75, 150, -12, 300, 7, 45, 120][i % 8]));

  const status = refStatus[i % refStatus.length];
  const inst = institutions[i % institutions.length];
  const item: FallbackInstrument = {
    id: `inst-record-${i + 1}`,
    institutionId: inst.id,
    type: i % 9 === 0 ? "SECURITY_DEPOSIT" : "FDR",
    referenceNumber: i === 2 ? "SAMPLE-DUP-001" : i === 17 ? "SAMPLE-DUP-001" : `SAMPLE-FDR-${String(i + 1).padStart(4, "0")}`,
    issuingBank: ["Sample Bank", "Demo National Bank", "Illustrative Cooperative Bank"][i % 3],
    branch: ["Central Branch", "North Branch", "Main Branch"][i % 3],
    amount: [500000, 1250000, 250000, 750000, 1800000][i % 5],
    issueDate: issue.toISOString(),
    maturityDate: maturity.toISOString(),
    jointInFavourOfAICTE: i % 6 !== 2,
    custodyStatus: custody[i % custody.length],
    adminStatus: status,
    custodyLocation: i % 3 === 0 ? "Regional Bureau - Demo Custody" : null,
    institution: inst,
    discrepancies: [],
    documents: i % 4 === 0 ? [{
      id: `doc-${i + 1}`,
      kind: "FDR_SCAN",
      filename: `sample-fdr-${i + 1}.pdf`,
      extractedFields: JSON.stringify({ amount: [500000, 1250000, 250000, 750000, 1800000][i % 5] })
    }] : []
  };

  if ([2, 10, 20, 31, 44].includes(i)) {
    item.discrepancies.push({
      id: `disc-${i + 1}`,
      instrumentId: item.id,
      ruleCode: i === 2 ? "R04" : "R09",
      severity: i === 2 ? "HIGH" : "MEDIUM",
      expected: i === 2 ? "Unique FDR reference" : "Joint/lien wording present",
      found: i === 2 ? "Duplicate reference number" : "Wording not confirmed",
      status: "OPEN"
    });
  }

  instruments.push(item);
}

// 4. Initial mock audit logs
const auditLogs: any[] = [
  {
    id: "audit-init-1",
    timestamp: new Date().toISOString(),
    actor: "System Initializer",
    role: "ADMIN",
    action: "SYSTEM_BOOTSTRAP",
    entity: "FDR_TRACK_ENGINE",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
];

// Helper functions
export function getFallbackDemoUsers(): FallbackUser[] {
  return users;
}

export function getFallbackUser(id?: string | null): FallbackUser {
  if (id) {
    const found = users.find(u => u.id === id);
    if (found) return found;
  }
  return users.find(u => u.role === "ADMIN") || users[4];
}

export function getFallbackDashboard(user?: FallbackUser | null) {
  const role = user?.role || "ADMIN";
  const canReadAll = ["SCRUTINY_OFFICER", "COMPETENT_AUTHORITY", "AUDITOR", "ADMIN"].includes(role);
  const rows = canReadAll
    ? instruments
    : instruments.filter(i => i.institutionId === (user?.institutionId || "inst-1"));

  const now = Date.now();
  const days = (d: string) => Math.ceil((new Date(d).getTime() - now) / 86400000);

  return {
    total: rows.length,
    totalValue: rows.reduce((s, i) => s + Number(i.amount), 0),
    active: rows.filter(i => days(i.maturityDate) > 30).length,
    expiring30: rows.filter(i => days(i.maturityDate) >= 0 && days(i.maturityDate) <= 30).length,
    matured: rows.filter(i => days(i.maturityDate) < 0).length,
    openDiscrepancies: rows.reduce((s, i) => s + i.discrepancies.filter(d => d.status === "OPEN").length, 0),
    pending: rows.filter(i => ["SUBMITTED", "UNDER_SCRUTINY", "DISCREPANCY_OPEN", "RELEASE_REQUESTED"].includes(i.adminStatus)).length
  };
}

export function getFallbackInstruments(user: FallbackUser | null, q = "", status = "", offsetDays = 0) {
  const role = user?.role || "ADMIN";
  const canReadAll = ["SCRUTINY_OFFICER", "COMPETENT_AUTHORITY", "AUDITOR", "ADMIN"].includes(role);

  let filtered = canReadAll
    ? [...instruments]
    : instruments.filter(i => i.institutionId === (user?.institutionId || "inst-1"));

  if (q.trim()) {
    const query = q.toLowerCase();
    filtered = filtered.filter(i =>
      i.referenceNumber.toLowerCase().includes(query) ||
      i.issuingBank.toLowerCase().includes(query) ||
      i.institution.name.toLowerCase().includes(query)
    );
  }

  if (status.trim()) {
    filtered = filtered.filter(i => i.adminStatus === status);
  }

  const simNow = new Date(Date.now() + offsetDays * 86400000);

  return filtered.map(r => ({
    ...r,
    amount: Number(r.amount),
    validityStatus:
      new Date(r.maturityDate) < simNow
        ? "MATURED"
        : (new Date(r.maturityDate).getTime() - simNow.getTime()) <= 30 * 86400000
        ? "EXPIRING_SOON"
        : "ACTIVE"
  }));
}

export function addFallbackInstrument(user: FallbackUser, data: any) {
  const inst = institutions.find(i => i.id === data.institutionId) || institutions[0];
  const item: FallbackInstrument = {
    id: `inst-record-${Date.now()}`,
    institutionId: inst.id,
    type: "FDR",
    referenceNumber: data.referenceNumber,
    issuingBank: data.issuingBank,
    branch: data.branch || "Main Branch",
    amount: Number(data.amount),
    issueDate: new Date(data.issueDate).toISOString(),
    maturityDate: new Date(data.maturityDate).toISOString(),
    jointInFavourOfAICTE: Boolean(data.jointInFavourOfAICTE),
    custodyStatus: "WITH_INSTITUTION",
    adminStatus: "SUBMITTED",
    institution: inst,
    discrepancies: [],
    documents: []
  };

  instruments.unshift(item);
  auditLogs.unshift({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: user.name,
    role: user.role,
    action: "CREATE_INSTRUMENT",
    entity: item.id,
    hash: "simulated_hash_" + Math.random().toString(36).slice(2, 10)
  });

  return item;
}

export function reviewFallbackInstrument(id: string, action: string, note = "", user: FallbackUser) {
  const item = instruments.find(i => i.id === id);
  if (!item) return { error: "Instrument not found", status: 404 };

  if (action === "RUN_RULES") {
    const findings = evaluateInstrument({ ...item, amount: Number(item.amount) });
    item.discrepancies = findings.map((f, idx) => ({
      id: `disc-${Date.now()}-${idx}`,
      instrumentId: id,
      ruleCode: f.ruleCode,
      severity: f.severity,
      expected: f.expected,
      found: f.found,
      status: "OPEN"
    }));
    item.adminStatus = findings.length ? "DISCREPANCY_OPEN" : "VERIFIED";
    return { findings, status: item.adminStatus };
  }

  if (action === "VERIFY_BANK") {
    const outcome = item.referenceNumber.endsWith("99") ? "MISMATCH" : "CONFIRMED";
    return { outcome, notice: "Simulated bank verification" };
  }

  if (action === "RESOLVE_DISCREPANCY") {
    item.discrepancies.forEach(d => {
      d.status = "RESOLVED";
      d.resolutionNote = note;
      d.resolvedBy = user.name;
    });
    item.adminStatus = "VERIFIED";
    return { ok: true };
  }

  if (action === "RECOMMEND_RELEASE") {
    item.adminStatus = "RELEASE_REQUESTED";
    return { ok: true };
  }

  if (action === "APPROVE_RELEASE" || action === "REJECT_RELEASE") {
    item.adminStatus = action === "APPROVE_RELEASE" ? "RELEASE_APPROVED" : "REJECTED";
    if (action === "APPROVE_RELEASE") item.custodyStatus = "RETURNED";
    return { ok: true };
  }

  return { error: "Unsupported action", status: 400 };
}

export function getFallbackAudit() {
  return {
    entries: auditLogs,
    verification: { ok: true, checked: auditLogs.length, brokenEntry: null }
  };
}

export function getFallbackAllInstruments() {
  return instruments;
}
