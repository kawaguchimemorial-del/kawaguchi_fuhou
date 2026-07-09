import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";
import type { FuneralScriptSavedFile } from "@/lib/funeral-script/types";

export interface FuneralScriptRecord {
  id: string;
  customerId?: string;
  customerName?: string;
  estimateId?: string;
  funeralAt?: string; // 紐づく見積の告別式(無ければ通夜)日時
  funeralAtIsWake?: boolean;
  deceasedName?: string;
  ceremonyType?: string;
  title?: string;
  sectionCount?: number;
  hasLetter?: boolean;
  createdBy?: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export async function listFuneralScripts(): Promise<FuneralScriptRecord[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c
    .from("fk_funeral_scripts")
    .select("*,fk_customers(last_name,first_name),fk_estimates(funeral_at,wake_at)")
    .eq("funeral_home_id", KANRI_HOME_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): FuneralScriptRecord {
  const funeralAt = r.fk_estimates?.funeral_at ?? r.fk_estimates?.wake_at ?? undefined;
  const content = (r.content ?? {}) as Partial<FuneralScriptSavedFile>;
  const sections = Array.isArray(content.sections) ? content.sections : [];
  return {
    id: r.id,
    customerId: r.customer_id ?? undefined,
    estimateId: r.estimate_id ?? undefined,
    customerName: r.fk_customers
      ? `${r.fk_customers.last_name ?? ""} ${r.fk_customers.first_name ?? ""}`.trim()
      : undefined,
    funeralAt,
    funeralAtIsWake: !r.fk_estimates?.funeral_at && !!r.fk_estimates?.wake_at,
    deceasedName: r.deceased_name ?? undefined,
    ceremonyType: r.ceremony_type ?? content.form?.ceremonyType ?? undefined,
    title: r.title ?? undefined,
    sectionCount: sections.length,
    hasLetter: !!content.originalLetter,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  };
}

// 保存済み台本の中身(保存ファイル)を返す。ツールでの再編集(開く)に使う。
export async function getFuneralScriptContent(
  id: string,
): Promise<FuneralScriptSavedFile | null> {
  const c = db();
  if (!c || !id) return null;
  const { data } = await c
    .from("fk_funeral_scripts")
    .select("content")
    .eq("funeral_home_id", KANRI_HOME_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .limit(1)
    .single();
  const content = data?.content;
  if (!content || typeof content !== "object") return null;
  return content as FuneralScriptSavedFile;
}
