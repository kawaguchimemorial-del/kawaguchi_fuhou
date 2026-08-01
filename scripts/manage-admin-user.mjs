// 管理画面（/kanri /fuhou 等）のアカウント発行・停止・一覧。
// 自己登録は用意していないため、アカウントはここでのみ作る。
//
// 使い方（<ID> は ishikawa のような半角小文字。ログイン画面で入力するもの）:
//   node scripts/manage-admin-user.mjs list
//   node scripts/manage-admin-user.mjs create <ID> <お名前> [パスワード]
//        … パスワードを省略すると自動生成して表示する（本人に伝えて初回ログイン後に変更してもらう）
//        … <お名前> は見積の「計上担当者／担当者（葬儀担当）」に自動で入る名前。
//           選択肢(EstimateCreateForm の STAFF_OPTIONS)と同じ表記にすること。
//   node scripts/manage-admin-user.mjs password <ID> [新しいパスワード]
//   node scripts/manage-admin-user.mjs disable <ID>   … 退職・異動時。行は残す
//   node scripts/manage-admin-user.mjs enable  <ID>
//
// 許可の正本は admin_users テーブル。あわせて auth ユーザーの app_metadata.admin も
// 同じ値にする（middleware がDB問い合わせ無しで門前払いするために参照する）。
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error(".env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY がありません"); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Supabase Auth はメールアドレスで人を識別するため、IDに社内専用ドメインを付けて内部の
// メールアドレスとして扱う（lib/admin/login-id.ts と同じ規則。実在しないドメインなので送信はしない）。
const LOGIN_DOMAIN = "kawaguchi-tenrei.local";
const toEmail = (v) => (v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`);
const toId = (v) => (v.endsWith(`@${LOGIN_DOMAIN}`) ? v.slice(0, -1 - LOGIN_DOMAIN.length) : v);

const [cmd, loginId, ...rest] = process.argv.slice(2);
const norm = loginId ? toEmail(loginId.trim().toLowerCase()) : "";

/** 覚えやすさより強度。伝達は口頭/電話を想定し記号は控えめにする。 */
function genPassword() {
  const abc = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(16), (b) => abc[b % abc.length]).join("");
}

/** メールアドレスから auth ユーザーを引く（管理APIに検索が無いためページを辿る） */
async function findAuthUser(mail) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === mail);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function setActive(active) {
  if (!norm) { console.error("IDを指定してください"); process.exit(1); }
  const user = await findAuthUser(norm);
  if (!user) { console.error("該当ユーザーがいません:", toId(norm)); process.exit(1); }
  const { error: e1 } = await sb.from("admin_users").update({ is_active: active }).eq("user_id", user.id);
  if (e1) { console.error("admin_users の更新に失敗:", e1.message); process.exit(1); }
  const { error: e2 } = await sb.auth.admin.updateUserById(user.id, { app_metadata: { admin: active } });
  if (e2) { console.error("app_metadata の更新に失敗:", e2.message); process.exit(1); }
  // 停止時は発行済みのセッションも切る（次のアクセスからではなく即座に締め出す）
  if (!active) await sb.auth.admin.signOut(user.id, "global").catch(() => {});
  console.log(active ? "✓ 有効化:" : "✓ 停止:", toId(norm));
}

switch (cmd) {
  case "list": {
    const { data, error } = await sb
      .from("admin_users")
      .select("email, display_name, role, is_active, last_login_at, created_at")
      .order("created_at");
    if (error) { console.error(error.message); process.exit(1); }
    if (!data.length) { console.log("登録なし"); break; }
    for (const r of data) {
      console.log(
        `${r.is_active ? "有効" : "停止"}  ${toId(r.email).padEnd(20)} ${(r.display_name || "").padEnd(12)} ${r.role}  最終ログイン: ${r.last_login_at ?? "—"}`,
      );
    }
    break;
  }

  case "create": {
    const name = rest[0] || "";
    if (!norm || !name) { console.error("使い方: create <ID> <お名前> [パスワード]"); process.exit(1); }
    const password = rest[1] || genPassword();

    let user = await findAuthUser(norm);
    if (user) {
      console.log("既に auth ユーザーが存在するため、許可の付与のみ行います:", norm);
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: norm,
        password,
        email_confirm: true, // 社内発行のため確認メールは挟まない
        app_metadata: { admin: true },
      });
      if (error) { console.error("作成に失敗:", error.message); process.exit(1); }
      user = data.user;
    }

    const { error: e1 } = await sb.from("admin_users").upsert(
      { user_id: user.id, email: norm, display_name: name, role: "admin", is_active: true },
      { onConflict: "user_id" },
    );
    if (e1) { console.error("admin_users の登録に失敗:", e1.message); process.exit(1); }
    await sb.auth.admin.updateUserById(user.id, { app_metadata: { admin: true } });

    console.log("✓ 発行しました");
    console.log("  ID        :", toId(norm));
    console.log("  お名前    :", name);
    if (!rest[1]) console.log("  パスワード:", password, "（本人に伝えて、ログイン後に変更してもらってください）");
    break;
  }

  case "password": {
    if (!norm) { console.error("使い方: password <ID> [新しいパスワード]"); process.exit(1); }
    const user = await findAuthUser(norm);
    if (!user) { console.error("該当ユーザーがいません:", toId(norm)); process.exit(1); }
    const password = rest[0] || genPassword();
    const { error } = await sb.auth.admin.updateUserById(user.id, { password });
    if (error) { console.error("変更に失敗:", error.message); process.exit(1); }
    console.log("✓ パスワードを変更しました:", toId(norm));
    if (!rest[0]) console.log("  新しいパスワード:", password);
    break;
  }

  case "disable": await setActive(false); break;
  case "enable": await setActive(true); break;

  default:
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 16).join("\n"));
}
