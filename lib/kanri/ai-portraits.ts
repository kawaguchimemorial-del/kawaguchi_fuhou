import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

export interface AiPortrait {
  id: string;
  deceasedName?: string;
  imageUrl?: string;
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
  const { data } = await c.from("fk_ai_portraits").select("*").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, deceasedName: r.deceased_name ?? undefined,
    imageUrl: r.image_url ?? undefined, thumbUrl: r.thumb_url ?? undefined,
    sourceImageUrl: r.source_image_url ?? undefined, note: r.note ?? undefined,
    createdBy: r.created_by ?? undefined, createdAt: r.created_at,
  }));
}
