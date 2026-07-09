import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const c=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const HOME="11111111-1111-1111-1111-111111111111";
function parseCsv(text){const t=text.replace(/^﻿/,"");const rows=[];let cur=[],f="",q=false;
for(let i=0;i<t.length;i++){const ch=t[i];
if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
else{if(ch==='"')q=true;else if(ch===","){cur.push(f);f="";}else if(ch==="\n"){cur.push(f);rows.push(cur);cur=[];f="";}else if(ch!=="\r")f+=ch;}}
if(f!==""||cur.length){cur.push(f);rows.push(cur);}
return rows.filter(r=>r.some(v=>v.trim()!==""));}
const num=(v)=>{const x=Number(String(v||"").replace(/,/g,""));return isNaN(x)?0:x;};
const dOnly=(v)=>{if(!v||!/\d/.test(v))return null;return v.replace(/\//g,"-").slice(0,10);};
const rate=(v)=>{const s=String(v||"");if(s.includes("8"))return 0.08;if(s==="0"||s.includes("非"))return 0;const x=Number(s);return !isNaN(x)&&x>0&&x<1?x:0.1;};
const norm=(v)=>(v||"").replace(/[\s　]/g,"");

// ===== 0. 旧移植データ削除 =====
await c.from("fk_payments").delete().gte("amount",-999999999);
await c.from("fk_payment_slips").delete().eq("funeral_home_id",HOME);
await c.from("fk_invoice_details").delete().gte("price",-999999999);
const { count: delInv } = await c.from("fk_invoices").delete({count:"exact"}).eq("funeral_home_id",HOME);
const { count: delStub } = await c.from("fk_estimates").delete({count:"exact"}).eq("funeral_home_id",HOME).eq("memo","売上集計より移植");
console.log("deleted invoices",delInv,"stub estimates",delStub);

// ===== 1. 顧客 source_id 付与＋不足顧客の作成 =====
const invRel=JSON.parse(fs.readFileSync("tmp/smartsougi-crawl/invoice-relations.json","utf8"));
const estRel=JSON.parse(fs.readFileSync("tmp/smartsougi-crawl/estimate-relations.json","utf8"));
const custPairs=new Map(); // sourceCustomerId -> name
for(const r of [...invRel,...estRel]) if(r.customerId&&r.customerName) custPairs.set(r.customerId,r.customerName);
console.log("unique source customers:",custPairs.size);

const { data: ourCust } = await c.from("fk_customers").select("id,last_name,first_name,source_id").eq("funeral_home_id",HOME).is("deleted_at",null).limit(5000);
const byName=new Map(); const bySource=new Map();
for(const cu of (ourCust??[])){
  byName.set(norm(`${cu.last_name}${cu.first_name??""}`),cu.id);
  if(cu.source_id) bySource.set(cu.source_id,cu.id);
}
let matched=0,createdCust=0;
for(const [sid,name] of custPairs){
  if(bySource.has(sid)) continue;
  const key=norm(name);
  const our=byName.get(key);
  if(our){ await c.from("fk_customers").update({source_id:sid}).eq("id",our); bySource.set(sid,our); matched++; }
  else {
    const nm=name.trim().replace(/　/g," ");const sp=nm.indexOf(" ");
    const {data}=await c.from("fk_customers").insert({funeral_home_id:HOME,source_id:sid,last_name:sp>0?nm.slice(0,sp):nm,first_name:sp>0?nm.slice(sp+1):null}).select("id").single();
    if(data){bySource.set(sid,data.id);byName.set(key,data.id);createdCust++;}
  }
}
console.log("customers matched",matched,"created",createdCust);

// invoice source_id -> our customer uuid
const invToCust=new Map(); const invMeta=new Map();
for(const r of invRel){ if(r.customerId) invToCust.set(r.id,bySource.get(r.customerId)??null); invMeta.set(r.id,r); }

// ===== 2. 請求書 1,251件（売上集計CSV 2023-2026, 請求書番号は正データそのまま） =====
const sum=parseCsv(fs.readFileSync("tmp/スマート葬儀/分析データ/2023年01月01日〜2026年07月06日_売上集計.csv","utf8"));
const sh=sum[0]; const six=Object.fromEntries(sh.map((x,i)=>[x,i]));
const sg=(r,k)=>{const i=six[k];return i!=null?(r[i]??"").trim():"";};
const invPayload=[]; const invNoSeen=new Set();
for(const r of sum.slice(1)){
  const no=sg(r,"請求書番号"); if(!no||invNoSeen.has(no))continue; invNoSeen.add(no);
  const meta=invMeta.get(no);
  const total=num(sg(r,"請求合計額")); const paid=num(sg(r,"入金済合計額"));
  invPayload.push({
    funeral_home_id:HOME, source_id:no, invoice_no:no,
    customer_id:invToCust.get(no)??null,
    title:sg(r,"件名")||null, sale_category:sg(r,"売上区分")||null,
    construction_no:sg(r,"施行番号")||null, deceased_name:sg(r,"対象者")||null, mourner_name:sg(r,"喪主名")||null,
    invoice_target_name:(meta?.cells?.[8]||sg(r,"請求先名"))||null,
    billed_on:dOnly(sg(r,"請求日")), total, paid_total:paid,
    status: paid<=0?"unpaid":paid>=total?"paid":"partial",
  });
}
const invIdByNo=new Map();
for(let i=0;i<invPayload.length;i+=200){
  const {data,error}=await c.from("fk_invoices").insert(invPayload.slice(i,i+200)).select("id,source_id");
  if(error){console.log("inv err",i,error.message);break;}
  for(const d of data) invIdByNo.set(d.source_id,d.id);
}
console.log("invoices inserted",invIdByNo.size,"of",invPayload.length);

// ===== 3. 請求明細 16,313行 =====
const det=parseCsv(fs.readFileSync("tmp/スマート葬儀/分析データ/売上分析_明細_2023年01月06日〜2026年07月06日.csv","utf8"));
const dh=det[0]; const dix=Object.fromEntries(dh.map((x,i)=>[x,i]));
const dg=(r,k)=>{const i=dix[k];return i!=null?(r[i]??"").trim():"";};
const sortCounter=new Map();
const detPayload=[];
for(const r of det.slice(1)){
  const no=dg(r,"請求書番号"); const invId=invIdByNo.get(no);
  if(!invId)continue;
  const so=(sortCounter.get(no)??0); sortCounter.set(no,so+1);
  detPayload.push({
    invoice_id:invId,
    title:dg(r,"商品名")||"（無題）", price:num(dg(r,"税抜単価")), price_including_tax:num(dg(r,"税込単価"))||null,
    tax:rate(dg(r,"税率")), quantity:num(dg(r,"数量"))||0,
    amount:num(dg(r,"税抜合計")), tax_amount:num(dg(r,"消費税")), amount_including_tax:num(dg(r,"税込合計")),
    product_source_id:dg(r,"商品ID")||null, sale_kind:dg(r,"販売種別")||null,
    category_large:dg(r,"大分類")||null, category_middle:dg(r,"中分類")||null, supplier:dg(r,"発注先")||null,
    sort_order:so,
  });
}
let detIns=0;
for(let i=0;i<detPayload.length;i+=500){
  const {error}=await c.from("fk_invoice_details").insert(detPayload.slice(i,i+500));
  if(error){console.log("det err",i,error.message);break;}
  detIns+=Math.min(500,detPayload.length-i);
}
console.log("details inserted",detIns,"of",detPayload.length);

// ===== 4. 見積 929件（scrape: source_id/顧客/件名/金額） =====
const { data: exEst } = await c.from("fk_estimates").select("source_id").eq("funeral_home_id",HOME).not("source_id","is",null).limit(3000);
const estSeen=new Set((exEst??[]).map(e=>e.source_id));
const estPayload=[];
for(const r of estRel){
  if(estSeen.has(r.id))continue; estSeen.add(r.id);
  const total=num((r.cells?.[4]||"").replace(/円/,""));
  estPayload.push({
    funeral_home_id:HOME, source_id:r.id, customer_id:bySource.get(r.customerId)??null,
    kind:"funeral", status:"confirmed", title:r.cells?.[3]||null,
    deceased_last_name:r.cells?.[2]||null,
    subtotal:total, discount_total:0, tax_total:0, total,
  });
}
let estIns=0;
for(let i=0;i<estPayload.length;i+=200){
  const {error}=await c.from("fk_estimates").insert(estPayload.slice(i,i+200));
  if(error){console.log("est err",i,error.message);break;}
  estIns+=Math.min(200,estPayload.length-i);
}
console.log("estimates inserted",estIns,"of",estPayload.length);

// ===== 5. 葬家移植分を kind=funeral_target に分離 =====
const {count:ftCount}=await c.from("fk_estimates").update({kind:"funeral_target"},{count:"exact"}).eq("funeral_home_id",HOME).is("source_id",null).not("estimate_no","is",null).like("memo","%顧客番号:%");
console.log("funeral_target marked",ftCount);
