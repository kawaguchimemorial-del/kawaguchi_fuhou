import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface EstimateItem { id?: string; productId?: string | null; lineKind: "item" | "discount"; name: string; unitPrice: number; quantity: number; taxRate: number; amount: number; isSetItem?: boolean; hiddenPaper?: boolean; priceIncludingTax?: number }
export interface Estimate {
  id: string;
  estimateNo?: string;
  customerId?: string | null;
  title?: string;
  memo?: string;
  estimateOn?: string;
  estimateLimitOn?: string;
  kind: string;
  deceased: { lastName?: string; firstName?: string; lastNameKana?: string; firstNameKana?: string; gender?: string; birthDate?: string; deathDate?: string; age?: number };
  mourner: { lastName?: string; firstName?: string; kana?: string; relation?: string; phone?: string; postcode?: string; prefecture?: string; addressCity?: string; addressStreet?: string; addressBuilding?: string };
  religion?: string;
  wakeAt?: string;
  funeralAt?: string;
  venueName?: string;
  venueAddress?: string;
  crematoriumName?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  advancePayment: number;
  status: string;
  memorialId?: string | null;
  memorialSlug?: string; // 訃報案内の詳細ルートはslugで解決するため保持
  createdAt: string;
  items?: EstimateItem[];
  customerName?: string;
  mournerSign?: string; mournerSignedAt?: string; ownerSign?: string; ownerSignedAt?: string;
  sourceId?: string;
  // 宛名情報・セット商品・発行情報（作成/編集フォーム用）
  addresseeKind?: string; addresseeLastName?: string; addresseeFirstName?: string; addresseeHonorific?: string;
  addresseeLastNameKana?: string; addresseeFirstNameKana?: string;
  addresseePostcode?: string; addresseePrefecture?: string; addresseeCity?: string; addresseeStreet?: string; addresseeBuilding?: string;
  productSetId?: string; brand?: string; issuerCompany?: string; chargedOrg?: string; chargedUser?: string;
  wakeMealCount?: number; funeralMealCount?: number; imibaraiFee?: number;
  staffName?: string; // 最終更新者(葬儀担当者)
  isPreConsultation?: boolean; // 事前相談
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEstimate(r: any): Estimate {
  return {
    id: r.id, estimateNo: r.estimate_no ?? undefined, customerId: r.customer_id ?? undefined,
    title: r.title ?? undefined, memo: r.memo ?? undefined, estimateOn: r.estimate_on ?? undefined, estimateLimitOn: r.estimate_limit_on ?? undefined,
    kind: r.kind ?? "funeral",
    deceased: { lastName: r.deceased_last_name ?? undefined, firstName: r.deceased_first_name ?? undefined, lastNameKana: r.deceased_last_name_kana ?? undefined, firstNameKana: r.deceased_first_name_kana ?? undefined, gender: r.deceased_gender ?? undefined, birthDate: r.deceased_birth_date ?? undefined, deathDate: r.deceased_death_date ?? undefined, age: r.deceased_age ?? undefined },
    mourner: { lastName: r.mourner_last_name ?? undefined, firstName: r.mourner_first_name ?? undefined, kana: r.mourner_kana ?? undefined, relation: r.mourner_relation ?? undefined, phone: r.mourner_phone ?? undefined, postcode: r.mourner_postcode ?? undefined, prefecture: r.mourner_prefecture ?? undefined, addressCity: r.mourner_address_city ?? undefined, addressStreet: r.mourner_address_street ?? undefined, addressBuilding: r.mourner_address_building ?? undefined },
    religion: r.religion ?? undefined, wakeAt: r.wake_at ?? undefined, funeralAt: r.funeral_at ?? undefined,
    venueName: r.venue_name ?? undefined, venueAddress: r.venue_address ?? undefined, crematoriumName: r.crematorium_name ?? undefined,
    subtotal: r.subtotal ?? 0, discountTotal: r.discount_total ?? 0, taxTotal: r.tax_total ?? 0, total: r.total ?? 0, advancePayment: r.advance_payment ?? 0,
    status: r.status ?? "draft", memorialId: r.memorial_id ?? undefined, createdAt: r.created_at,
    customerName: r.fk_customers ? `${r.fk_customers.last_name ?? ""} ${r.fk_customers.first_name ?? ""}`.trim() : undefined,
    sourceId: r.source_id ?? undefined,
    addresseeKind: r.addressee_kind ?? undefined, addresseeLastName: r.addressee_last_name ?? undefined, addresseeFirstName: r.addressee_first_name ?? undefined,
    addresseeHonorific: r.addressee_honorific ?? undefined, addresseeLastNameKana: r.addressee_last_name_kana ?? undefined, addresseeFirstNameKana: r.addressee_first_name_kana ?? undefined,
    addresseePostcode: r.addressee_postcode ?? undefined, addresseePrefecture: r.addressee_prefecture ?? undefined,
    addresseeCity: r.addressee_address_city ?? undefined, addresseeStreet: r.addressee_address_street ?? undefined, addresseeBuilding: r.addressee_address_building ?? undefined,
    productSetId: r.product_set_id ?? undefined, brand: r.brand ?? undefined,
    wakeMealCount: r.wake_meal_count ?? undefined, funeralMealCount: r.funeral_meal_count ?? undefined, imibaraiFee: r.imibarai_fee ?? undefined,
    issuerCompany: r.issuer_company ?? undefined, chargedOrg: r.charged_org ?? undefined, chargedUser: r.charged_user ?? undefined,
    staffName: r.staff_name ?? undefined,
    mournerSign: r.mourner_sign ?? undefined, mournerSignedAt: r.mourner_signed_at ?? undefined,
    ownerSign: r.owner_sign ?? undefined, ownerSignedAt: r.owner_signed_at ?? undefined,
    isPreConsultation: !!r.is_pre_consultation,
  };
}

export async function listEstimates(): Promise<Estimate[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_estimates").select("*,fk_customers(last_name,first_name)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false }).limit(2000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(mapEstimate);
}

export async function listEstimatesByCustomer(customerId: string): Promise<Estimate[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_estimates").select("*,fk_customers(last_name,first_name)").eq("customer_id", customerId).is("deleted_at", null).order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(mapEstimate);
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_estimates").select("*,fk_customers(last_name,first_name)").eq("id", id).is("deleted_at", null).single();
  if (!data) return null;
  const est = mapEstimate(data);
  // 訃報案内の詳細ルート(/fuhou/ceremonies/[id])は slug で解決するため、
  // memorial_id(UUID)から slug を引き直す(UUIDをそのままリンクすると404になる)。
  if (est.memorialId) {
    const { data: mem } = await c.from("memorials").select("slug").eq("id", est.memorialId).maybeSingle();
    est.memorialSlug = mem?.slug ?? undefined;
  }
  const { data: items } = await c.from("fk_estimate_items").select("*").eq("estimate_id", id).order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  est.items = ((items ?? []) as any[]).map((r) => ({ id: r.id, productId: r.product_id ?? undefined, lineKind: r.line_kind, name: r.name, unitPrice: r.unit_price, quantity: r.quantity, taxRate: Number(r.tax_rate), amount: r.amount, isSetItem: !!r.is_set_item, hiddenPaper: !!r.hidden_paper, priceIncludingTax: r.price_including_tax ?? undefined }));
  return est;
}

export function deceasedFullName(e: Estimate): string {
  return [e.deceased.lastName, e.deceased.firstName].filter(Boolean).join(" ");
}
export function mournerFullName(e: Estimate): string {
  return [e.mourner.lastName, e.mourner.firstName].filter(Boolean).join(" ");
}
