import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface Customer {
  id: string;
  customerNo?: string;
  lastName: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
  status?: string;
  inflow?: string;
  staffName?: string;
  registeredAt?: string;
  gender?: string;
  birthDate?: string;
  telephoneNumber?: string;
  mobileNumber?: string;
  faxNumber?: string;
  email?: string;
  availableSmsAutoSent: boolean;
  availableDmSend: boolean;
  availableMailMagazine: boolean;
  postcode?: string;
  prefectureCode?: string;
  addressCity?: string;
  addressStreet?: string;
  addressBuilding?: string;
  note?: string;
  rank?: string;
  reason?: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCustomer(r: any): Customer {
  return {
    id: r.id, customerNo: r.customer_no ?? undefined,
    lastName: r.last_name, firstName: r.first_name ?? undefined,
    lastNameKana: r.last_name_kana ?? undefined, firstNameKana: r.first_name_kana ?? undefined,
    status: r.status ?? undefined, inflow: r.inflow ?? undefined, staffName: r.staff_name ?? undefined,
    registeredAt: r.registered_at ?? undefined, gender: r.gender ?? undefined, birthDate: r.birth_date ?? undefined,
    telephoneNumber: r.telephone_number ?? undefined, mobileNumber: r.mobile_number ?? undefined,
    faxNumber: r.fax_number ?? undefined, email: r.email ?? undefined,
    availableSmsAutoSent: !!r.available_sms_auto_sent, availableDmSend: !!r.available_dm_send,
    availableMailMagazine: !!r.available_mail_magazine,
    postcode: r.postcode ?? undefined, prefectureCode: r.prefecture_code ?? undefined,
    addressCity: r.address_city ?? undefined, addressStreet: r.address_street ?? undefined, addressBuilding: r.address_building ?? undefined,
    note: r.note ?? undefined, rank: r.rank ?? undefined, reason: r.reason ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listCustomers(opts?: { q?: string; status?: string }): Promise<Customer[]> {
  const c = db();
  if (!c) return [];
  let qb = c.from("fk_customers").select("*").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
  if (opts?.status) qb = qb.eq("status", opts.status);
  const { data, error } = await qb;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data as any[]).map(mapCustomer);
  if (opts?.q) {
    const q = opts.q.trim();
    rows = rows.filter((r) => [r.lastName, r.firstName, r.lastNameKana, r.firstNameKana, r.email, r.mobileNumber, r.customerNo].filter(Boolean).some((v) => String(v).includes(q)));
  }
  return rows;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.from("fk_customers").select("*").eq("id", id).is("deleted_at", null).single();
  if (error || !data) return null;
  return mapCustomer(data);
}

export async function countCustomers(): Promise<number> {
  const c = db();
  if (!c) return 0;
  const { count } = await c.from("fk_customers").select("id", { count: "exact", head: true }).eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null);
  return count ?? 0;
}

export interface CustomerNote { id: string; kind?: string; body: string; createdBy?: string; createdAt: string }
export async function listCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_customer_notes").select("id,kind,body,created_by,created_at").eq("customer_id", customerId).order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, kind: r.kind ?? undefined, body: r.body, createdBy: r.created_by ?? undefined, createdAt: r.created_at }));
}

/** 月別顧客登録数（直近7ヶ月）。 */
export async function monthlyCustomerCounts(): Promise<{ month: string; count: number }[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_customers").select("created_at").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null);
  const map = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-7).map(([month, count]) => ({ month, count }));
}
