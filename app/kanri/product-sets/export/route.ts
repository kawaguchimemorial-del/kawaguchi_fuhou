import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 実スマート葬儀 product_sets.csv と同一の17列
const COLS = ["セットコード", "セット名", "セット価格(税抜)", "セット価格(税込)", "消費税率", "セルフプランニングに表示する", "非表示", "内訳:商品ID", "内訳:個数", "内訳:請求(見積)書に出力しない", "内訳:発注しない", "選択式メニュー:名称", "選択式メニュー:商品ID", "選択式メニュー:追加料金", "会員価格:会員種別ID", "セットメンバーシップ:価格(税抜)", "セットメンバーシップ:価格(税込)"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export async function GET() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await c.from("fk_product_sets").select("*,fk_product_set_items(*)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: true });

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const st of ((data ?? []) as any[])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = ((st.fk_product_set_items ?? []) as any[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const rows = items.length ? items : [null];
    for (const it of rows) {
      lines.push([
        st.code ?? "", st.name, st.price ?? 0, st.tax_included_price ?? 0, `${Math.round(Number(st.tax ?? 0.1) * 100)}%`,
        st.self_planning ? 1 : "", st.hidden ? 1 : "",
        it?.product_source_id ?? "", it?.quantity ?? "", it?.hide_on_invoice ? 1 : "", it?.not_ordering ? 1 : "",
        "", "", "", "", "", "",
      ].map(esc).join(","));
    }
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent("セット商品.csv")}` } });
}
