import {PrismaClient} from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma=new PrismaClient();
const states=["Telangana","Andhra Pradesh","Karnataka","Maharashtra","Tamil Nadu","Kerala","Gujarat","Rajasthan","Delhi","Odisha"];
const categories=["Engineering","Management","Pharmacy","Technical University"];
async function main(){
 await prisma.auditLog.deleteMany(); await prisma.alert.deleteMany(); await prisma.releaseRequest.deleteMany(); await prisma.discrepancy.deleteMany(); await prisma.fieldSource.deleteMany(); await prisma.document.deleteMany(); await prisma.instrumentLineage.deleteMany(); await prisma.instrument.deleteMany(); await prisma.user.deleteMany(); await prisma.institution.deleteMany(); await prisma.reminderRule.deleteMany(); await prisma.appConfig.deleteMany();
 const inst=[];
 for(let i=0;i<25;i++)inst.push(await prisma.institution.create({data:{aicteId:`SYN-AICTE-${String(i+1).padStart(4,"0")}`,name:`${["National","Deccan","River","Pioneer","Summit"][i%5]} ${["Institute of Technology","Technical College","School of Engineering","Academy"][i%4]} ${i+1}`,state:states[i%states.length],category:categories[i%categories.length],isGovernment:i%7===0,email:`compliance${i+1}@example.test`,phone:`900000${String(i+1).padStart(4,"0")}`}}));
 const hash=await bcrypt.hash("Demo@12345",10);
 const userSpecs=[
  ["Institution Demo","institution@example.test","INSTITUTION_USER",inst[0].id],
  ["Scrutiny Officer","scrutiny@example.test","SCRUTINY_OFFICER",null],
  ["Competent Authority","authority@example.test","COMPETENT_AUTHORITY",null],
  ["Read-only Auditor","auditor@example.test","AUDITOR",null],
  ["System Admin","admin@example.test","ADMIN",null]
 ] as const;
 for(const [name,email,role,institutionId] of userSpecs)await prisma.user.create({data:{name,email,role,passwordHash:hash,institutionId}});
 const now=new Date();
 const refStatus=["SUBMITTED","UNDER_SCRUTINY","DISCREPANCY_OPEN","VERIFIED","RENEWAL_PENDING","RENEWED_OR_REPLACED","RELEASE_REQUESTED","RELEASE_APPROVED","RELEASED","REJECTED"];
 const custody=["WITH_INSTITUTION","SUBMITTED_TO_OFFICE","IN_CUSTODY","RETURNED"];
 const created=[];
 for(let i=0;i<64;i++){
  const issue=new Date(now);issue.setDate(issue.getDate()-((i*11)%650));
  const maturity=new Date(now);maturity.setDate(maturity.getDate()+([20,75,150,-12,300,7,45,120][i%8]));
  const status=refStatus[i%refStatus.length];
  const item=await prisma.instrument.create({data:{institutionId:inst[i%inst.length].id,type:i%9===0?"SECURITY_DEPOSIT":"FDR",referenceNumber:i===2?"SAMPLE-DUP-001":i===17?"SAMPLE-DUP-001":`SAMPLE-FDR-${String(i+1).padStart(4,"0")}`,issuingBank:["Sample Bank","Demo National Bank","Illustrative Cooperative Bank"][i%3],branch:["Central Branch","North Branch","Main Branch"][i%3],amount:[500000,1250000,250000,750000,1800000][i%5],issueDate:issue,maturityDate:maturity,jointInFavourOfAICTE:i%6!==2,custodyStatus:custody[i%custody.length] as any,adminStatus:status as any,custodyLocation:i%3===0?"Regional Bureau - Demo Custody":null}});
  created.push(item);
  await prisma.fieldSource.createMany({data:[{instrumentId:item.id,fieldName:"referenceNumber",value:item.referenceNumber,source:"INSTITUTION_DECLARED",recordedBy:"Seed Data"},{instrumentId:item.id,fieldName:"amount",value:String(item.amount),source:"INSTITUTION_DECLARED",recordedBy:"Seed Data"},{instrumentId:item.id,fieldName:"issuingBank",value:item.issuingBank,source:"INSTITUTION_DECLARED",recordedBy:"Seed Data"}]});
  if([2,10,20,31,44].includes(i))await prisma.discrepancy.create({data:{instrumentId:item.id,ruleCode:i===2?"R04":"R09",severity:i===2?"HIGH":"MEDIUM",expected:i===2?"Unique FDR reference":"Joint/lien wording present",found:i===2?"Duplicate reference number":"Wording not confirmed",status:"OPEN"}});
  if(i%4===0)await prisma.document.create({data:{instrumentId:item.id,kind:"FDR_SCAN",filename:`sample-fdr-${i+1}.pdf`,sha256:`SIMULATED_SHA256_${String(i+1).padStart(4,"0")}`,encryptedStoragePath:"simulated://encrypted-document-not-stored",uploadedBy:"Seed Data",extractedText:"Synthetic demo document placeholder",extractedFields:JSON.stringify({referenceNumber:item.referenceNumber,amount:Number(item.amount)})}});
 }
 await prisma.instrumentLineage.create({data:{oldInstrumentId:created[5].id,newInstrumentId:created[15].id,reason:"RENEWAL"}});
 await prisma.instrumentLineage.create({data:{oldInstrumentId:created[15].id,newInstrumentId:created[25].id,reason:"RENEWAL"}});
 for(const d of [90,60,30,15,7])await prisma.reminderRule.create({data:{offsetDays:d,channel:"IN_APP",recipientRole:"INSTITUTION_USER",escalationAfterDays:3}});
 for(const [key,value] of [["minimumAmountByCategory",JSON.stringify({Engineering:100000,Management:100000,Pharmacy:100000,"Technical University":100000})],["reminderOffsets","90,60,30,15,7"],["rulesIllustrative","true"]])await prisma.appConfig.create({data:{key,value}});
 console.log(`Seeded ${inst.length} synthetic institutions, ${created.length} instruments and 5 demo users.`);
}
main().finally(()=>prisma.$disconnect());
