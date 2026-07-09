import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// AI遺影ツールで作成した画像を Storage(ai-portraits) に保存し fk_ai_portraits に登録。
// 一覧(/kanri/ai-portrait)へ表示するための連携。
export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "保存先が未設定です。" }, { status: 400 });
  }
  let body: { dataUrl?: string; deceasedName?: string; createdBy?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "リクエストが不正です。" }, { status: 400 }); }

  const dataUrl = body.dataUrl ?? "";
  const m = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return Response.json({ ok: false, error: "画像データが不正です。" }, { status: 400 });
  const contentType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 15 * 1024 * 1024) return Response.json({ ok: false, error: "画像サイズが大きすぎます。" }, { status: 400 });

  // fk_ai_portraits は生成型に無いため any 経由（他kanri処理と同じ運用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as any;
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${KANRI_HOME_ID}/${Date.now()}-${rand}.${ext}`;
  const { error: upErr } = await c.storage.from("ai-portraits").upload(path, buf, { contentType, upsert: false });
  if (upErr) return Response.json({ ok: false, error: `保存に失敗しました：${upErr.message}` }, { status: 500 });
  const { data: pub } = c.storage.from("ai-portraits").getPublicUrl(path);

  const { data, error } = await c.from("fk_ai_portraits").insert({
    funeral_home_id: KANRI_HOME_ID,
    deceased_name: body.deceasedName?.trim() || null,
    image_url: pub.publicUrl,
    created_by: body.createdBy?.trim() || null,
  }).select("id").single();
  if (error) return Response.json({ ok: false, error: `登録に失敗しました：${error.message}` }, { status: 500 });

  return Response.json({ ok: true, id: data.id, url: pub.publicUrl });
}
