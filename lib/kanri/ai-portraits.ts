import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

export interface AiPortrait {
  id: string;
  customerId?: string;
  customerName?: string;
  estimateId?: string;
  funeralAt?: string; // 紐づく見積の告別式(無ければ通夜)日時
  funeralAtIsWake?: boolean;
  deceasedName?: string;
  imageUrl?: string;
  tefudaUrl?: string;
  monitorUrl?: string;
  thumbUrl?: string;
  sourceImageUrl?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export async function listAiPortraits(): Promise<AiPortrait[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_ai_portraits").select("*,fk_customers(last_name,first_name),fk_estimates(funeral_at,wake_at)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): AiPortrait {
  const funeralAt = r.fk_estimates?.funeral_at ?? r.fk_estimates?.wake_at ?? undefined;
  return {
    id: r.id, customerId: r.customer_id ?? undefined, estimateId: r.estimate_id ?? undefined,
    customerName: r.fk_customers ? `${r.fk_customers.last_name ?? ""} ${r.fk_customers.first_name ?? ""}`.trim() : undefined,
    funeralAt, funeralAtIsWake: !r.fk_estimates?.funeral_at && !!r.fk_estimates?.wake_at,
    deceasedName: r.deceased_name ?? undefined,
    imageUrl: r.image_url ?? undefined, tefudaUrl: r.tefuda_url ?? undefined, monitorUrl: r.monitor_url ?? undefined, thumbUrl: r.thumb_url ?? undefined,
    sourceImageUrl: r.source_image_url ?? undefined, note: r.note ?? undefined,
    createdBy: r.created_by ?? undefined, createdAt: r.created_at,
  };
}

// 施行(見積)に紐づくAI遺影を返す。正準の一意照合(同姓同名の誤マッチが起きない)。
export async function findAiPortraitByEstimate(estimateId: string): Promise<AiPortrait | null> {
  const c = db();
  if (!c || !estimateId) return null;
  const { data } = await c.from("fk_ai_portraits").select("*,fk_customers(last_name,first_name)").eq("funeral_home_id", KANRI_HOME_ID).eq("estimate_id", estimateId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
  const rows = ((data ?? []) as unknown[]).map(mapRow);
  return rows[0] ?? null;
}

// 対象者名に一致する最新のAI遺影(手札あり)を返す。施行紐付けが無い場合のフォールバック。
export async function findAiPortraitByDeceased(deceasedName: string): Promise<AiPortrait | null> {
  const c = db();
  if (!c || !deceasedName.trim()) return null;
  const norm = deceasedName.replace(/[\s　]/g, "");
  const { data } = await c.from("fk_ai_portraits").select("*,fk_customers(last_name,first_name)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).map(mapRow);
  return rows.find((p) => (p.deceasedName ?? "").replace(/[\s　]/g, "") === norm) ?? null;
}
