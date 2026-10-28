export type RuleFinding = { ruleCode: string; severity: "LOW"|"MEDIUM"|"HIGH"; expected: string; found: string; message: string };
export type DeclaredInstrument = { referenceNumber: string; issuingBank: string; amount: number; issueDate: Date|string; maturityDate: Date|string; jointInFavourOfAICTE: boolean };
export function validityStatus(maturity: Date, now = new Date()): "ACTIVE"|"EXPIRING_SOON"|"MATURED" {
  const days = Math.ceil((maturity.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "MATURED";
  if (days <= 30) return "EXPIRING_SOON";
  return "ACTIVE";
}
export function evaluateInstrument(d: DeclaredInstrument, now = new Date(), requiredAmount = 100000): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const issue = new Date(d.issueDate), maturity = new Date(d.maturityDate);
  if (!d.referenceNumber.trim() || !d.issuingBank.trim() || !Number.isFinite(d.amount)) findings.push({ruleCode:"R01",severity:"HIGH",expected:"All mandatory fields supplied",found:"One or more fields missing",message:"Mandatory field missing"});
  if (!(maturity > issue)) findings.push({ruleCode:"R02",severity:"HIGH",expected:"Maturity after issue date",found:`Issue ${issue.toISOString().slice(0,10)}; maturity ${maturity.toISOString().slice(0,10)}`,message:"Invalid date order"});
  if (maturity < now) findings.push({ruleCode:"R08",severity:"HIGH",expected:"Instrument valid at submission",found:"Maturity date is in the past",message:"Instrument already expired"});
  if (d.amount < requiredAmount) findings.push({ruleCode:"R11",severity:"HIGH",expected:`At least ${requiredAmount}`,found:String(d.amount),message:"Amount below illustrative configured requirement"});
  if (!d.jointInFavourOfAICTE) findings.push({ruleCode:"R09",severity:"MEDIUM",expected:"Joint/lien wording present",found:"Not confirmed",message:"Needs scrutiny; not a definitive fraud finding"});
  return findings;
}
export function reminderOffsets(maturity: Date, now = new Date(), offsets = [90,60,30,15,7]) {
  return offsets.filter(n => {
    const target = new Date(maturity); target.setDate(target.getDate()-n);
    return target >= now && target < new Date(now.getTime()+86400000);
  });
}
export function releaseConditions(input: { openDiscrepancies: number; overdueFlags: number; requiredDocumentsPresent: boolean; custodyConfirmed: boolean }) {
  return [
    {name:"No open discrepancies",pass:input.openDiscrepancies===0,reason:input.openDiscrepancies===0?"No open discrepancies":`${input.openDiscrepancies} discrepancy item(s) remain open`},
    {name:"No overdue compliance flags",pass:input.overdueFlags===0,reason:input.overdueFlags===0?"No overdue flags":`${input.overdueFlags} overdue flag(s) remain`},
    {name:"Required documents present",pass:input.requiredDocumentsPresent,reason:input.requiredDocumentsPresent?"Required documents present":"Required documents are missing"},
    {name:"Custody confirmed",pass:input.custodyConfirmed,reason:input.custodyConfirmed?"Custody confirmed":"Custody must be confirmed"}
  ];
}
