import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const dynamic = "force-dynamic";

// 施行番号から対象者情報を読込む（葬家データを検索）
export async function GET(req: Request) {
  const pno = new URL(req.url).searchParams.get("pno")?.trim();
  if (!pno || !isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ found: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await c.from("fk_estimates")
    .select("deceased_last_name,deceased_first_name,customer_id,fk_customers(last_name,first_name)")
    .eq("funeral_home_id", KANRI_HOME_ID).eq("estimate_no", pno).is("deleted_at", null).limit(1).maybeSingle();
  if (!data) return Response.json({ found: false });
  const cu = data.fk_customers;
  return Response.json({
    found: true,
    deceasedName: [data.deceased_last_name, data.deceased_first_name].filter(Boolean).join(" "),
    customerId: data.customer_id ?? null,
    customerName: cu ? [cu.last_name, cu.first_name].filter(Boolean).join(" ") : null,
  });
}
