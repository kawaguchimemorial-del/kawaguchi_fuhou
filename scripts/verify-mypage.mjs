// 喪主マイページの動作検証: ログイン→全画面巡回→スクショ
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3111";
const ID = "testmourn1";
const PW = "320387";
const MID = "58e32cb6-2c20-43a5-9382-ffd5122dbff7";
const OUT = path.resolve("tmp/mypage-verify");
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log("[verify]", ...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: "ja-JP" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });

async function shot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const h1 = await page.locator("h1").first().innerText().catch(() => "(no h1)");
  log(name.padEnd(22), "|", page.url().replace(BASE, ""), "| h1:", h1);
}

try {
  // 1. 未ログインで直アクセス → サインインへ飛ばされること
  await page.goto(`${BASE}/mypage/${MID}`, { waitUntil: "networkidle" });
  log("未ログイン時のリダイレクト先:", page.url().replace(BASE, ""));
  if (!page.url().includes("/sign-in")) errors.push("!! 未ログインでマイページに入れてしまう");

  // 2. 誤ったパスワード
  await page.fill("#loginId", ID);
  await page.fill("#password", "000000");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  await shot("00_bad_password");
  const err = (await page.locator('[role="alert"]').first().textContent().catch(() => "")) ?? "";
  log("誤PW時のエラー表示:", JSON.stringify(err));
  if (!err) errors.push("!! 誤パスワードでエラーが出ない");

  // 3. 正しい認証情報
  await page.fill("#loginId", ID);
  await page.fill("#password", PW);
  await page.click('button[type="submit"]');
  // 本番のコールドスタートでは遷移に数秒かかるため、固定待ちではなくURLの変化を待つ
  await page.waitForURL(`**/mypage/${MID}`, { timeout: 30000 }).catch(() => {});
  await shot("01_home");
  if (!page.url().includes(MID)) errors.push("!! ログインに失敗した");

  // 4. 全画面を巡回
  const pages = [
    ["announcement", "02_announcement"],
    ["online", "03_online"],
    ["attendees", "04_attendees"],
    ["visitors", "05_visitors"],
    ["funeral-photos", "06_funeral_photos"],
    ["album", "07_album"],
    ["password", "08_password"],
    ["mail-settings", "09_mail_settings"],
    ["contact", "10_contact"],
    ["term", "11_term"],
    ["transactions", "12_transactions"],
  ];
  for (const [p, name] of pages) {
    await page.goto(`${BASE}/mypage/${MID}/${p}`, { waitUntil: "networkidle" });
    await shot(name);
  }

  // 5. 参列者詳細（一覧の1件目）
  await page.goto(`${BASE}/mypage/${MID}/attendees`, { waitUntil: "networkidle" });
  // export リンクも同じ接頭辞のため除外する
  const first = page.locator('a[href*="/attendees/"]:not([href*="/export"])').first();
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(1500);
    await shot("13_attendee_detail");
  } else log("参列者0件のため詳細はスキップ");

  // 6. エクスポート
  for (const [url, name] of [
    [`/mypage/${MID}/attendees/export?fmt=csv`, "koden.csv"],
    [`/mypage/${MID}/attendees/export?fmt=txt`, "koden.txt"],
    [`/mypage/${MID}/visitors/export`, "visitors.csv"],
  ]) {
    const r = await page.request.get(BASE + url);
    const body = await r.text();
    fs.writeFileSync(path.join(OUT, name), body);
    log("export", name, "status:", r.status(), "bytes:", body.length);
    if (r.status() !== 200) errors.push(`!! export ${name} が ${r.status()}`);
  }

  // 7. 他人の案件IDを直打ちしても入れないこと
  const other = "71303751-d9d6-4e8e-b7dd-bb375de0e9ed";
  await page.goto(`${BASE}/mypage/${other}`, { waitUntil: "networkidle" });
  log("他案件への直アクセス →", page.url().replace(BASE, ""));
  // 自分の案件へ戻される（またはサインインへ）のが正。他案件が表示されたら不合格。
  if (page.url().includes(other)) errors.push("!! 他案件のマイページに入れてしまう");

  // 8. 未認証でのエクスポートも塞がれていること
  const anon = await ctx.browser().newContext();
  const ap = await anon.newPage();
  const r = await ap.request.get(`${BASE}/mypage/${MID}/attendees/export?fmt=csv`);
  log("未認証エクスポート status:", r.status());
  if (r.status() !== 401) errors.push(`!! 未認証エクスポートが ${r.status()} で通る`);
  await anon.close();
} catch (e) {
  errors.push("FATAL " + e.message);
} finally {
  await browser.close();
}

console.log("\n=== 結果 ===");
if (errors.length) { console.log("問題あり:"); errors.forEach((e) => console.log(" -", e)); process.exitCode = 1; }
else console.log("すべて問題なし");
