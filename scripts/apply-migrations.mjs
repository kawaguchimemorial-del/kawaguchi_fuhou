// マイグレーション適用スクリプト（Session pooler 経由・IPv4/DDL対応）
// 使い方:
//   node scripts/apply-migrations.mjs              … supabase/migrations/*.sql を番号順に全適用
//   node scripts/apply-migrations.mjs 0025         … 0025 で始まるファイルだけ適用
// 各SQLは冪等（create ... if not exists / add column if not exists 等）で書くこと。
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const cs = env.SUPABASE_POOLER_URL || env.SUPABASE_DB_URL;
if (!cs) { console.error("SUPABASE_POOLER_URL / SUPABASE_DB_URL が .env.local にありません"); process.exit(1); }

const filter = process.argv[2];
const dir = "supabase/migrations";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && (!filter || f.startsWith(filter))).sort();
if (!files.length) { console.error("対象SQLがありません:", filter ?? "(all)"); process.exit(1); }

const cl = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await cl.connect();
console.log("接続OK:", cs.replace(/:[^:@/]+@/, ":***@"));
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  try { await cl.query(sql); console.log("✓ 適用:", f); }
  catch (e) { console.error("✗ 失敗:", f, "\n  ", e.message); await cl.end(); process.exit(1); }
}
await cl.end();
console.log("完了:", files.length, "件");
