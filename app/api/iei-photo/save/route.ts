import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// dataURL(png/jpeg/webp) を Storage(ai-portraits) にアップロードして公開URLを返す。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upload(c: any, dataUrl: string): Promise<{ url?: string; error?: string }> {
  const m = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl ?? "");
  if (!m) return { error: "画像データが不正です。" };
  const contentType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 15 * 1024 * 1024) return { error: "画像サイズが大きすぎます。" };
  const path = `${KANRI_HOME_ID}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await c.storage.from("ai-portraits").upload(path, buf, { contentType, upsert: false });
  if (error) return { error: error.message };
  return { url: c.storage.from("ai-portraits").getPublicUrl(path).data.publicUrl };
}

// AI遺影ツールで作成した画像を保存し fk_ai_portraits に登録。
export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "保存先が未設定です。" }, { status: 400 });
  }
  let body: { baseDataUrl?: string; tefudaDataUrl?: string; monitorDataUrl?: string; dataUrl?: string; portraitId?: string; customerId?: string; estimateId?: string; deceasedName?: string; createdBy?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "リクエストが不正です。" }, { status: 400 }); }

  // 後方互換: dataUrl 単体でも受ける
  const baseData = body.baseDataUrl || body.dataUrl;
  if (!baseData) return Response.json({ ok: false, error: "画像データがありません。" }, { status: 400 });
  // 身元不明行の最終防波堤: 対象者名は必須
  const deceasedName = body.deceasedName?.trim();
  if (!deceasedName) return Response.json({ ok: false, error: "対象者（故人）名が必要です。" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as any;
  const base = await upload(c, baseData);
  if (base.error) return Response.json({ ok: false, error: `保存に失敗しました：${base.error}` }, { status: 500 });
  let tefudaUrl: string | undefined;
  if (body.tefudaDataUrl) {
    const t = await upload(c, body.tefudaDataUrl);
    if (!t.error) tefudaUrl = t.url; // 手札は失敗しても本体は保存する
  }
  let monitorUrl: string | undefined;
  if (body.monitorDataUrl) {
    const m = await upload(c, body.monitorDataUrl);
    if (!m.error) monitorUrl = m.url; // モニターも失敗しても本体は保存する
  }

  const row = {
    funeral_home_id: KANRI_HOME_ID,
    customer_id: body.customerId || null,
    estimate_id: body.estimateId || null,
    deceased_name: deceasedName,
    image_url: base.url,
    tefuda_url: tefudaUrl || null,
    monitor_url: monitorUrl || null,
    created_by: body.createdBy?.trim() || null,
  };
  // 1) 明示の portraitId(一覧の「編集」で写真差し替え) → 更新
  if (body.portraitId) {
    const { error } = await c.from("fk_ai_portraits").update(row).eq("funeral_home_id", KANRI_HOME_ID).eq("id", body.portraitId);
    if (error) return Response.json({ ok: false, error: `更新に失敗しました：${error.message}` }, { status: 500 });
    return Response.json({ ok: true, id: body.portraitId, url: base.url, updated: true });
  }
  // 2) 冪等: 同一施行(見積)の既存遺影があれば更新(1施行1遺影・二度押し防止)。施行無しは常に新規。
  if (body.estimateId) {
    const { data: ex } = await c.from("fk_ai_portraits").select("id").eq("funeral_home_id", KANRI_HOME_ID).eq("estimate_id", body.estimateId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
    if (ex && ex[0]) {
      const { error } = await c.from("fk_ai_portraits").update(row).eq("id", ex[0].id);
      if (error) return Response.json({ ok: false, error: `更新に失敗しました：${error.message}` }, { status: 500 });
      return Response.json({ ok: true, id: ex[0].id, url: base.url, updated: true });
    }
  }
  const { data, error } = await c.from("fk_ai_portraits").insert(row).select("id").single();
  if (error) return Response.json({ ok: false, error: `登録に失敗しました：${error.message}` }, { status: 500 });
  return Response.json({ ok: true, id: data.id, url: base.url });
}
