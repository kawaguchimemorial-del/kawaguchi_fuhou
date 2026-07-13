"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ORDER_MAIL_KEYS, validateSlots } from "@/lib/memorial/mail-template";

const HOME_ID = "11111111-1111-1111-1111-111111111111";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertSetting(c: any, key: string, extra: Record<string, string>) {
  const { data: exist } = await c.from("fk_master_items").select("id").eq("funeral_home_id", HOME_ID).eq("master_type", "app_setting").eq("name", key).is("deleted_at", null).limit(1).maybeSingle();
  if (exist) await c.from("fk_master_items").update({ extra }).eq("id", exist.id);
  else await c.from("fk_master_items").insert({ funeral_home_id: HOME_ID, master_type: "app_setting", name: key, extra });
}

// メール設定(通知先+文言テンプレ)の保存。空スロットは既定値運用(空のまま保存=既定値)。
export async function saveOrderMailSettings(
  input: { notifyTo: string; slots: Record<string, string> }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Supabase未設定" };
  const to = (input.notifyTo ?? "").trim();
  if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "通知先メールアドレスの形式が正しくありません。" };
  const slots: Record<string, string> = {};
  for (const k of ORDER_MAIL_KEYS) slots[k] = (input.slots?.[k] ?? "").trim();
  const verr = validateSlots(slots);
  if (verr) return { ok: false, error: verr };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  try {
    await upsertSetting(c, "order_notify", { to });
    await upsertSetting(c, "order_mail_template", slots);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
