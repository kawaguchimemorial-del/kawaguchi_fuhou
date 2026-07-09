import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const HOME="11111111-1111-1111-1111-111111111111";

const { data: custs } = await db.from("fk_customers").select("id,source_id").eq("funeral_home_id",HOME).not("source_id","is",null).is("deleted_at",null).limit(2000);
console.log("targets:",custs.length);

const b = await chromium.launchPersistentContext("tmp/ss-profile", { headless: true });
const p = b.pages()[0] ?? await b.newPage();
async function login() {
  await p.locator('input[type="email"], input[name*="email"]').first().fill("syo.san33@gmail.com");
  await p.locator('input[type="password"]').first().fill("sat118");
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(()=>{}), p.locator('button[type="submit"], input[type="submit"]').first().click()]);
  await p.waitForTimeout(1500);
}
let done=0, ok=0, fail=0;
const results={};
for (const cu of custs) {
  const url = `https://app.smartsougi.jp/users/customer_managements/customers/${cu.source_id}`;
  try {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
    if (p.url().includes("sign_in")) { await login(); await p.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 }); }
    await p.waitForTimeout(400);
    const text = await p.evaluate(() => document.body.innerText);
    // 「お問い合わせ（登録）日時」の直後の日時を抽出
    const m = text.match(/お問い合わせ（登録）日時[\s\S]{0,60}?(\d{4})\/(\d{2})\/(\d{2})[^\d]{0,8}(\d{2}):(\d{2})/);
    if (m) {
      const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`;
      results[cu.id]=iso; ok++;
    } else fail++;
  } catch { fail++; }
  done++;
  if (done % 50 === 0) console.log("progress", done, "ok", ok, "fail", fail);
}
await b.close();
fs.writeFileSync("tmp/smartsougi-crawl/customer-regdates.json", JSON.stringify(results));
console.log("crawl finished ok:",ok,"fail:",fail);

// DB更新
let upd=0;
const entries=Object.entries(results);
for (const [id, iso] of entries) {
  await db.from("fk_customers").update({ registered_at: iso, created_at: iso }).eq("id", id);
  upd++;
  if (upd % 100 === 0) console.log("updated", upd);
}
console.log("db updated", upd);
