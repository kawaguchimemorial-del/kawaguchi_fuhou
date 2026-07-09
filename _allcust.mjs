import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const HOME="11111111-1111-1111-1111-111111111111";
const norm=(v)=>(v||"").replace(/[\s　]/g,"");
const b = await chromium.launchPersistentContext("tmp/ss-profile", { headless: true });
const p = b.pages()[0] ?? await b.newPage();
async function login() {
  await p.locator('input[type="email"], input[name*="email"]').first().fill("syo.san33@gmail.com");
  await p.locator('input[type="password"]').first().fill("sat118");
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(()=>{}), p.locator('button[type="submit"], input[type="submit"]').first().click()]);
  await p.waitForTimeout(1500);
}
// 1) 全顧客一覧をページング取得 (ID⇔氏名)
const idByName=new Map();
for (let page=1; page<=40; page++){
  const url = page===1 ? "https://app.smartsougi.jp/users/customer_managements/customers" : `https://app.smartsougi.jp/users/customer_managements/customers?page=${page}`;
  await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  if (p.url().includes("sign_in")) { await login(); await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000}); }
  await p.waitForSelector("table tbody tr",{timeout:15000}).catch(()=>{});
  await p.waitForTimeout(500);
  const rows = await p.evaluate(() => [...document.querySelectorAll("table tbody tr")].map(tr=>{
    const a=[...tr.querySelectorAll("a")].map(x=>x.getAttribute("href")||"").find(h=>/\/customers\/\d+/.test(h));
    const m=a? a.match(/\/customers\/(\d+)/):null;
    const cells=[...tr.querySelectorAll("td")].map(td=>td.textContent.trim().replace(/\s+/g," "));
    return m?{id:m[1],cells:cells.slice(0,4)}:null;
  }).filter(Boolean));
  if(rows.length===0){console.log("list end at",page);break;}
  for(const r of rows){
    // 氏名セルはID/ステータスの後: cells[2]（画面により変動するため数値でないセルを名前候補に）
    const name=r.cells.find((c,i)=>i>0&&c&&!/^\d+$/.test(c))||"";
    if(name) idByName.set(norm(name), r.id);
  }
}
console.log("list customers:",idByName.size);

// 2) source_id無し顧客を名前照合してsource_id付与
const { data: nosrc } = await db.from("fk_customers").select("id,last_name,first_name").eq("funeral_home_id",HOME).is("source_id",null).is("deleted_at",null).limit(2000);
console.log("without source_id:",(nosrc??[]).length);
const targets=[];
for(const cu of (nosrc??[])){
  const sid=idByName.get(norm(`${cu.last_name}${cu.first_name??""}`));
  if(sid){ await db.from("fk_customers").update({source_id:sid}).eq("id",cu.id); targets.push({id:cu.id,source_id:sid}); }
}
console.log("newly matched:",targets.length);

// 3) 新規マッチ分の詳細から登録日時・顧客番号を取得
let ok=0,fail=0,done=0;
for(const cu of targets){
  const url=`https://app.smartsougi.jp/users/customer_managements/customers/${cu.source_id}`;
  try{
    await p.goto(url,{waitUntil:"domcontentloaded",timeout:40000});
    if(p.url().includes("sign_in")){await login();await p.goto(url,{waitUntil:"domcontentloaded",timeout:40000});}
    if(!p.url().includes(`/customers/${cu.source_id}`)){fail++;done++;continue;}
    await p.waitForTimeout(300);
    const info=await p.evaluate(()=>{
      const t=document.body.innerText;
      const i=t.indexOf("お問い合わせ（登録）日時");
      if(i<0)return null;
      const m=t.slice(i,i+80).match(/(\d{4})\/(\d{2})\/(\d{2})[^\d]{0,10}(\d{2}):(\d{2})/);
      const j=t.indexOf("顧客番号"); const cn=j>=0?(t.slice(j,j+40).match(/(\d{5,})/)||[])[1]:null;
      return m?{iso:`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`,customerNo:cn}:null;
    });
    if(info){const patch={registered_at:info.iso,created_at:info.iso};if(info.customerNo)patch.customer_no=info.customerNo;
      await db.from("fk_customers").update(patch).eq("id",cu.id);ok++;}
    else fail++;
  }catch{fail++;}
  done++;
  if(done%50===0)console.log("detail progress",done,"ok",ok);
}
console.log("details updated ok:",ok,"fail:",fail);
await b.close();
