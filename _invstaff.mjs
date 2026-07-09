import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const HOME="11111111-1111-1111-1111-111111111111";
const b = await chromium.launchPersistentContext("tmp/ss-profile", { headless: true });
const p = b.pages()[0] ?? await b.newPage();
async function login() {
  await p.locator('input[type="email"], input[name*="email"]').first().fill("syo.san33@gmail.com");
  await p.locator('input[type="password"]').first().fill("sat118");
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(()=>{}), p.locator('button[type="submit"], input[type="submit"]').first().click()]);
  await p.waitForTimeout(1500);
}
const map={};
for (let page=1; page<=30; page++){
  const url = page===1 ? "https://app.smartsougi.jp/users/customer_managements/invoices" : `https://app.smartsougi.jp/users/customer_managements/invoices?page=${page}`;
  await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  if (p.url().includes("sign_in")) { await login(); await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000}); }
  await p.waitForSelector("table tbody tr",{timeout:15000}).catch(()=>{});
  await p.waitForTimeout(600);
  const rows = await p.evaluate(() => [...document.querySelectorAll("table tbody tr")].map(tr => {
    const a=[...tr.querySelectorAll("a")].map(x=>x.getAttribute("href")||"").find(h=>/\/invoices\/\d+/.test(h));
    const m=a? a.match(/\/invoices\/(\d+)/):null;
    const cells=[...tr.querySelectorAll("td")].map(td=>td.textContent.trim().replace(/\s+/g," "));
    return m?{id:m[1],staff:cells[9]||""}:null;
  }).filter(Boolean));
  if(rows.length===0){console.log("end at",page);break;}
  for(const r of rows){
    const name=r.staff.replace(/\s*\d{4}\/\d{2}\/\d{2}.*$/,"").trim();
    if(name) map[r.id]=name;
  }
  if(page%5===0) console.log("page",page,"collected",Object.keys(map).length);
}
await b.close();
const uniq=new Set(Object.values(map));
console.log("collected",Object.keys(map).length,"unique staff:",uniq.size,[...uniq].slice(0,8).join("/"));
let upd=0;
for(const [sid,name] of Object.entries(map)){
  await db.from("fk_invoices").update({staff_name:name}).eq("funeral_home_id",HOME).eq("source_id",sid);
  upd++; if(upd%200===0)console.log("updated",upd);
}
console.log("invoice staff updated",upd);
