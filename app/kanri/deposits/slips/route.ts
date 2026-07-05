import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 実スマート葬儀「伝票明細_.csv」と同一の22列
const COLS = ["施行番号", "喪主", "葬儀日", "売上区分", "入金先", "伝票区分", "伝票番号", "発行日", "返品", "入金方法", "入金種別", "入金日", "金額", "請求書名", "葬儀会場", "計上組織", "宛名", "振込依頼名", "摘要", "発行会社", "計上担当者", "備考"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export async function GET() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await c.from("fk_payment_slips")
    .select("*,fk_payments(paid_on,amount,method,category),fk_invoices(total,fk_estimates(estimate_no,title,funeral_at,venue_name,mourner_last_name,mourner_first_name))")
    .eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("issued_on", { ascending: false });

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sl of ((data ?? []) as any[])) {
    const e = sl.fk_invoices?.fk_estimates ?? {};
    const mourner = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pays = ((sl.fk_payments ?? []) as any[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const rows = pays.length ? pays : [null];
    for (const p of rows) {
      lines.push([
        sl.performance_no ?? e.estimate_no ?? "",  // 施行番号
        mourner,                                    // 喪主
        fmt(e.funeral_at),                          // 葬儀日
        sl.summary ?? "",                           // 売上区分
        sl.source ?? "",                            // 入金先
        sl.slip_kind ?? "",                         // 伝票区分
        sl.slip_no ?? "",                           // 伝票番号
        fmt(sl.issued_on),                          // 発行日
        "",                                         // 返品
        p?.method ?? "",                            // 入金方法
        p?.category ?? "",                          // 入金種別
        fmt(p?.paid_on),                            // 入金日
        p?.amount ?? 0,                             // 金額
        e.title ?? "",                              // 請求書名
        e.venue_name ?? "",                         // 葬儀会場
        "",                                         // 計上組織
        sl.addressee ?? "",                         // 宛名
        sl.transfer_name ?? "",                     // 振込依頼名
        sl.summary ?? "",                           // 摘要
        sl.issuer_company ?? "",                    // 発行会社
        "",                                         // 計上担当者
        sl.remark ?? "",                            // 備考
      ].map(esc).join(","));
    }
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E4%BC%9D%E7%A5%A8%E6%98%8E%E7%B4%B0_.csv` } });
}
