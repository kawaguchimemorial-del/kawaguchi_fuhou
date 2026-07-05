import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 売掛残高CSV（対象日時点の未回収残高一覧）
const COLS = ["請求書番号", "請求日", "請求先名", "対象者", "件名", "請求額", "入金額", "売掛残高", "発行会社", "計上組織"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function d10(iso?: string | null) { if (!iso) return ""; return String(iso).slice(0, 10).replace(/-/g, "/"); }

export async function GET(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("db not configured", { status: 500 });
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from"); const to = sp.get("to");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  let qb = c.from("fk_invoices").select("*,fk_estimates(title,deceased_last_name,deceased_first_name,mourner_last_name,mourner_first_name)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("billed_on", { ascending: true }).limit(3000);
  if (from) qb = qb.gte("billed_on", from);
  if (to) qb = qb.lte("billed_on", to);
  const { data } = await qb;

  const lines = [COLS.join(",")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const remaining = (r.total ?? 0) - (r.paid_total ?? 0);
    if (remaining === 0) continue;
    const e = r.fk_estimates ?? {};
    lines.push([
      r.invoice_no ?? r.id.slice(0, 8), d10(r.billed_on),
      [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" "),
      [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" "),
      e.title ?? "", r.total ?? 0, r.paid_total ?? 0, remaining, "", "",
    ].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent("売掛残高.csv")}` } });
}
