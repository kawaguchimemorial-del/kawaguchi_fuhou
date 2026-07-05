import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface RelatedLink { id: string; relation?: string; customer: { id: string; name: string } }

export async function listRelatedCustomers(customerId: string): Promise<RelatedLink[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_related_customers").select("id,relation,related:related_customer_id(id,last_name,first_name)").eq("customer_id", customerId).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, relation: r.relation ?? undefined,
    customer: { id: r.related?.id, name: `${r.related?.last_name ?? ""} ${r.related?.first_name ?? ""}`.trim() },
  }));
}
