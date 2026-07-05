import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 実スマート葬儀「売上分析_明細.csv」と同一の50列
const COLS = ["請求書番号", "請求日", "売上区分", "請求先名", "計上組織", "施行担当", "施行番号", "対象者", "葬儀種別", "葬儀日", "通夜会場名", "葬儀会場名", "火葬日", "火葬場", "喪主名", "適用会員種別", "宗派", "お迎え場所", "発行会社", "大分類", "中分類", "小分類", "細分類", "分析用コード", "発注先", "商品ID", "ブランド", "商品名", "販売種別", "税抜単価", "税込単価", "税率", "数量", "税抜合計", "消費税", "税込合計", "立替金", "前受金", "下代（税抜）", "下代（税込）", "下代用税率", "数量", "税抜価格", "消費税", "税込価格", "粗利額", "粗利率", "計上担当者", "件名", "宗教者名"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function d10(iso?: string | null) { if (!iso) return ""; return String(iso).slice(0, 10); }

export async function GET(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from"); const to = sp.get("to");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  let qb = c.from("fk_invoices").select("*,fk_estimates(*,fk_estimate_items(*))").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("billed_on", { ascending: true });
  if (from) qb = qb.gte("billed_on", from);
  if (to) qb = qb.lte("billed_on", to);
  const { data } = await qb;

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const e = r.fk_estimates ?? {};
    const mourner = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
    const deceased = [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = ((e.fk_estimate_items ?? []) as any[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const it of items) {
      const rate = Number(it.tax_rate) || 0;
      const exTotal = it.amount ?? 0;
      const tax = Math.round(exTotal * rate);
      lines.push([
        r.invoice_no ?? r.id.slice(0, 8), d10(r.billed_on), "", mourner, "", "", e.estimate_no ?? "", deceased, "", d10(e.funeral_at),
        "", e.venue_name ?? "", "", e.crematorium_name ?? "", mourner, "", e.religion ?? "", "", "",
        it.line_kind === "discount" ? "値引" : "", "", "", "", "", "", it.product_id ?? "", "", it.name, "一般",
        it.unit_price ?? 0, Math.round((it.unit_price ?? 0) * (1 + rate)), rate, it.quantity ?? 0, exTotal, tax, exTotal + tax,
        "", "", "", "", "", "", "", "", "", "", "", "", e.title ?? "", "",
      ].map(esc).join(","));
    }
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E5%A3%B2%E4%B8%8A%E5%88%86%E6%9E%90_%E6%98%8E%E7%B4%B0.csv` } });
}
