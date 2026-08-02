// AI遺影の「服装」見本画像を生成する。
// 生成物: public/iei-clothing/<id>.webp （lib/iei-photo/clothing.ts の id と対応）
// ※ /iei-photo 配下には置かない。middleware の保護対象と重なり画像が認証で弾かれるため。
//
// 使い方:
//   node scripts/gen-clothing-samples.mjs            … 未生成のものだけ作る（作成済みは飛ばす）
//   node scripts/gen-clothing-samples.mjs male_suit  … idの前方一致で作り直す（上書き）
//   node scripts/gen-clothing-samples.mjs --all      … 全部作り直す（上書き）
//
// 見本は「服だけが分かる絵」にする。顔を出すと、選ぶ人がその顔の人になると誤解するため、
// 頭部の無いトルソー（洋裁用のボディ）に着せた状態で、正面・白背景で生成する。
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = "public/iei-clothing";
const API = "https://api.openai.com/v1/images/generations";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
const model = process.env.OPENAI_IMAGE_MODEL || env.OPENAI_IMAGE_MODEL || "gpt-image-2";
if (!apiKey) { console.error("OPENAI_API_KEY がありません（.env.local）"); process.exit(1); }

const { IEI_PHOTO_CLOTHING_ITEMS } = await import("../lib/iei-photo/clothing.ts");

const arg = process.argv[2];
const force = arg === "--all";
const filter = force ? null : arg;

fs.mkdirSync(OUT_DIR, { recursive: true });

/** 服だけを見せる見本の指示。全アイテム共通の枠を作り、服の説明だけ差し替える。 */
function buildPrompt(item) {
  const who = item.gender === "male" ? "男性用" : "女性用";
  return [
    `${who}の衣服の見本写真を作ってください。`,
    `衣服: ${item.sample}`,
    "頭部と手足の無い、洋裁用のトルソー（ボディ）に着せた状態で、真正面から撮影した1枚。",
    "顔・髪・肌・人物は写さないでください。",
    "背景は白一色。影は薄く、衣服の色と形がはっきり分かるようにしてください。",
    "衣服は上半身（胸から腰のあたりまで）が画面いっぱいに入る大きさで、切れないように収めてください。",
    "日本の葬儀で使う遺影写真の服装見本です。落ち着いた、実在の衣服らしい自然な質感にしてください。",
    "文字・ロゴ・値札・装飾枠は入れないでください。",
  ].join("\n");
}

async function generate(item) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(item),
      n: 1,
      size: "1024x1024",
      quality: "high",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message ?? ""; } catch { /* 本文が読めないこともある */ }
    throw new Error(`OpenAI ${res.status} ${detail}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("画像が返りませんでした");
  return Buffer.from(b64, "base64");
}

const targets = IEI_PHOTO_CLOTHING_ITEMS.filter((i) => !filter || i.id.startsWith(filter));
if (!targets.length) { console.error("対象がありません:", filter); process.exit(1); }

let made = 0, skipped = 0;
for (const item of targets) {
  const out = path.join(OUT_DIR, `${item.id}.webp`);
  if (!force && !filter && fs.existsSync(out)) { skipped++; continue; }
  try {
    const png = await generate(item);
    // 選択欄のサムネイル用途。512pxあれば拡大表示にも足り、1枚40KB前後に収まる。
    await sharp(png).resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toFile(out);
    made++;
    console.log(`✓ ${item.id}  ${item.label}  ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.error(`✗ ${item.id}: ${e.message}`);
  }
}
console.log(`完了: 生成 ${made}件 / 既存のため省略 ${skipped}件`);
