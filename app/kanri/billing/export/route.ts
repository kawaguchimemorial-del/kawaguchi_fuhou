import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 実スマート葬儀「入金一覧_.csv」と同一の25列
const COLS = ["請求書ID", "顧客名", "対象者", "請求先名", "請求先郵便番号", "請求先住所", "件名", "売上区分", "計上組織", "施行番号", "喪主", "札名", "請求日", "葬儀日", "請求額", "入金日", "入金額", "支払方法", "支払種別", "未入金残", "入金期限", "施行担当", "発行会社", "計上担当者", "備考"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export async function GET() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await c.from("fk_invoices")
    .select("*,fk_estimates(estimate_no,title,funeral_at,deceased_last_name,deceased_first_name,mourner_last_name,mourner_first_name,mourner_postcode,mourner_prefecture,mourner_address_city,mourner_address_street,mourner_address_building),fk_payments(paid_on,amount,method,category)")
    .eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("billed_on", { ascending: false });

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const e = r.fk_estimates ?? {};
    const mourner = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
    const deceased = [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ");
    const addr = [e.mourner_prefecture, e.mourner_address_city, e.mourner_address_street, e.mourner_address_building].filter(Boolean).join("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pays = ((r.fk_payments ?? []) as any[]).sort((a, b) => String(a.paid_on ?? "").localeCompare(String(b.paid_on ?? "")));
    const lastPay = pays[pays.length - 1];
    lines.push([
      r.invoice_no ?? r.id.slice(0, 8),      // 請求書ID
      mourner,                                // 顧客名（実CSVでは請求先=顧客名）
      deceased,                               // 対象者
      mourner,                                // 請求先名
      e.mourner_postcode ?? "",               // 請求先郵便番号
      addr,                                   // 請求先住所
      e.title ?? "",                          // 件名
      "",                                     // 売上区分
      "",                                     // 計上組織
      e.estimate_no ?? "",                    // 施行番号
      "",                                     // 喪主（実CSVは空欄運用）
      "",                                     // 札名
      fmt(r.billed_on),                       // 請求日
      fmt(e.funeral_at),                      // 葬儀日
      r.total ?? 0,                           // 請求額
      fmt(lastPay?.paid_on),                  // 入金日
      r.paid_total ?? 0,                      // 入金額
      lastPay?.method ?? "",                  // 支払方法
      lastPay?.category ?? "",                // 支払種別
      (r.total ?? 0) - (r.paid_total ?? 0),   // 未入金残
      fmt(r.due_on),                          // 入金期限
      "",                                     // 施行担当
      "",                                     // 発行会社
      "",                                     // 計上担当者
      "",                                     // 備考
    ].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E5%85%A5%E9%87%91%E4%B8%80%E8%A6%A7_.csv` } });
}
