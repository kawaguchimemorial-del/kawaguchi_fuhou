import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 実スマート葬儀「売上集計.csv」と同一の62列
const COLS = ["請求書番号", "伝票番号", "請求日", "売上区分", "請求先名", "計上組織", "施行担当", "施行番号", "対象者", "葬儀種別", "葬儀日", "通夜会場名", "葬儀会場名", "火葬日", "火葬場", "喪主名", "適用会員種別", "宗派", "宗教者名", "お迎場所", "流入経路", "発行会社", "10%税抜合計", "8%税抜合計", "消費税10%合計", "消費税8%合計", "10%税込合計", "8%税込合計", "非課税合計", "立替金", "前受金", "請求合計額", "備考", "ブランド", "セット商品名", "セット金額（税抜）", "下代（税抜）", "下代（税込）", "数量", "税抜価格", "消費税", "税込価格", "粗利額", "粗利率", "計上担当者", "件名", "宗教者名", "入金済合計額", "最終入金日", "未収金額", "割引後価格", "合計（税込）", "選択された商品パターン名称", "対象者郵便番号", "対象者都道府県", "対象者市区町村", "対象者番地", "対象者建物名", "喪主郵便番号", "喪主都道府県", "喪主市区町村", "喪主番地", "喪主建物名"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function d10(iso?: string | null) { if (!iso) return ""; return String(iso).slice(0, 10); }

export async function GET(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from"); const to = sp.get("to");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  let qb = c.from("fk_invoices").select("*,fk_estimates(*,fk_estimate_items(*)),fk_payments(paid_on,amount)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("billed_on", { ascending: true });
  if (from) qb = qb.gte("billed_on", from);
  if (to) qb = qb.lte("billed_on", to);
  const { data } = await qb;

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const e = r.fk_estimates ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = ((e.fk_estimate_items ?? []) as any[]);
    const mourner = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
    const deceased = [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ");
    let ex10 = 0, ex8 = 0, tax10 = 0, tax8 = 0, exempt = 0;
    for (const it of items) {
      const rate = Number(it.tax_rate) || 0;
      const amt = it.amount ?? 0;
      if (rate === 0.1) { ex10 += amt; tax10 += Math.round(amt * 0.1); }
      else if (rate === 0.08) { ex8 += amt; tax8 += Math.round(amt * 0.08); }
      else exempt += amt;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pays = ((r.fk_payments ?? []) as any[]).sort((a, b) => String(a.paid_on ?? "").localeCompare(String(b.paid_on ?? "")));
    const lastPay = pays[pays.length - 1];
    lines.push([
      r.invoice_no ?? r.id.slice(0, 8), "", d10(r.billed_on), "", mourner, "", "", e.estimate_no ?? "", deceased, "",
      d10(e.funeral_at), "", e.venue_name ?? "", "", e.crematorium_name ?? "", mourner, "", e.religion ?? "", "", "",
      "", "", ex10, ex8, tax10, tax8, ex10 + tax10, ex8 + tax8, exempt, 0,
      e.advance_payment ?? "", r.total ?? 0, e.memo ?? "", "", "", "", "", "", items.reduce((a, it) => a + (it.quantity ?? 0), 0), ex10 + ex8 + exempt,
      tax10 + tax8, r.total ?? 0, "", "", "", e.title ?? "", "", r.paid_total ?? 0, d10(lastPay?.paid_on), (r.total ?? 0) - (r.paid_total ?? 0),
      "", r.total ?? 0, "", "", "", "", "", "", e.mourner_postcode ?? "", e.mourner_prefecture ?? "", e.mourner_address_city ?? "", e.mourner_address_street ?? "", e.mourner_address_building ?? "",
    ].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E5%A3%B2%E4%B8%8A%E9%9B%86%E8%A8%88.csv` } });
}
