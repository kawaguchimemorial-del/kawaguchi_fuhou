import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";
import {
  FUNERAL_SCRIPT_FILE_KIND,
  FUNERAL_SCRIPT_FILE_VERSION,
} from "@/lib/funeral-script/types";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  FuneralScriptSection,
} from "@/lib/funeral-script/types";

export const dynamic = "force-dynamic";

type SaveBody = {
  scriptId?: string;
  customerId?: string;
  estimateId?: string;
  deceasedName?: string;
  createdBy?: string;
  form?: FuneralScriptFormData;
  sections?: FuneralScriptSection[];
  originalLetter?: FuneralScriptOriginalLetter | null;
};

// 作成ツールで作った台本を保存し fk_funeral_scripts に登録(AI遺影と同方針)。
export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "保存先が未設定です。" }, { status: 400 });
  }
  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "リクエストが不正です。" }, { status: 400 });
  }

  if (!body.form || typeof body.form !== "object" || !Array.isArray(body.sections)) {
    return Response.json({ ok: false, error: "台本データがありません。" }, { status: 400 });
  }
  // 身元不明行の最終防波堤: 対象者名は必須
  const deceasedName = (body.deceasedName || body.form.deceasedName || "").trim();
  if (!deceasedName) {
    return Response.json({ ok: false, error: "対象者（故人）名が必要です。" }, { status: 400 });
  }

  const content = {
    kind: FUNERAL_SCRIPT_FILE_KIND,
    version: FUNERAL_SCRIPT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    form: body.form,
    sections: body.sections,
    originalLetter: body.originalLetter ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as any;

  // 外部キー不整合で保存全体が失敗しないよう、実在しないIDはnull化して紐付けのみ外す。
  let customerId = body.customerId || null;
  let estimateId = body.estimateId || null;
  if (customerId) {
    const { data } = await c.from("fk_customers").select("id").eq("id", customerId).maybeSingle();
    if (!data) customerId = null;
  }
  if (estimateId) {
    const { data } = await c.from("fk_estimates").select("id").eq("id", estimateId).maybeSingle();
    if (!data) estimateId = null;
  }

  const row = {
    funeral_home_id: KANRI_HOME_ID,
    customer_id: customerId,
    estimate_id: estimateId,
    deceased_name: deceasedName,
    ceremony_type: body.form.ceremonyType || null,
    title: (body.form.venueName || "").trim() || null,
    content,
    created_by: body.createdBy?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // 1) 明示の scriptId(一覧から開いて再保存) → 更新
  if (body.scriptId) {
    const { error } = await c
      .from("fk_funeral_scripts")
      .update(row)
      .eq("funeral_home_id", KANRI_HOME_ID)
      .eq("id", body.scriptId);
    if (error) return Response.json({ ok: false, error: `更新に失敗しました：${error.message}` }, { status: 500 });
    return Response.json({ ok: true, id: body.scriptId, updated: true });
  }

  // 2) 冪等: 同一施行(見積)の既存台本があれば更新(1施行1台本・二度押し防止)。施行無しは常に新規。
  if (estimateId) {
    const { data: ex } = await c
      .from("fk_funeral_scripts")
      .select("id")
      .eq("funeral_home_id", KANRI_HOME_ID)
      .eq("estimate_id", estimateId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (ex && ex[0]) {
      const { error } = await c.from("fk_funeral_scripts").update(row).eq("id", ex[0].id);
      if (error) return Response.json({ ok: false, error: `更新に失敗しました：${error.message}` }, { status: 500 });
      return Response.json({ ok: true, id: ex[0].id, updated: true });
    }
  }

  const { data, error } = await c
    .from("fk_funeral_scripts")
    .insert(row)
    .select("id")
    .single();
  if (error) return Response.json({ ok: false, error: `登録に失敗しました：${error.message}` }, { status: 500 });
  return Response.json({ ok: true, id: data.id });
}
