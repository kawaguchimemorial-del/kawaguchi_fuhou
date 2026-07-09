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
    // 正しい顧客詳細ページにいることをURLで検証（前回の教訓）
    if (!p.url().includes(`/customers/${cu.source_id}`)) { fail++; done++; continue; }
    await p.waitForTimeout(350);
    const info = await p.evaluate(() => {
      const t = document.body.innerText;
      const i = t.indexOf("お問い合わせ（登録）日時");
      if (i < 0) return null;
      const m = t.slice(i, i + 80).match(/(\d{4})\/(\d{2})\/(\d{2})[^\d]{0,10}(\d{2}):(\d{2})/);
      const cn = (() => { const j = t.indexOf("顧客番号"); if (j < 0) return null; const mm = t.slice(j, j + 40).match(/(\d{5,})/); return mm ? mm[1] : null; })();
      return m ? { iso: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`, customerNo: cn } : null;
    });
    if (info) { results[cu.id]=info; ok++; } else fail++;
  } catch { fail++; }
  done++;
  if (done % 100 === 0) console.log("progress", done, "ok", ok, "fail", fail);
}
await b.close();
// ユニーク性検証（前回の全件同一値バグの再発防止）
const uniq = new Set(Object.values(results).map(r=>r.iso));
console.log("crawl finished ok:",ok,"fail:",fail,"unique datetimes:",uniq.size);
fs.writeFileSync("tmp/smartsougi-crawl/customer-regdates2.json", JSON.stringify(results));
if (uniq.size < 10) { console.log("ABORT: 値がユニークでないため更新中止"); process.exit(1); }
let upd=0;
for (const [id, r] of Object.entries(results)) {
  const patch = { registered_at: r.iso, created_at: r.iso };
  if (r.customerNo) patch.customer_no = r.customerNo;
  await db.from("fk_customers").update(patch).eq("id", id);
  upd++;
  if (upd % 200 === 0) console.log("updated", upd);
}
console.log("db updated", upd);
