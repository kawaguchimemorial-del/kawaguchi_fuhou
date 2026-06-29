"use server";

import { z } from "zod";
import { getPublicMemorial } from "./data";
import { religionVocab } from "./religion";
import { store, nextId } from "./store";
import { OFFERING_PRODUCTS } from "./products";

// 共通の戻り値型
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; errors: Record<string, string> };

// ---------------------------------------------------------------------------
// バーチャル参拝（焼香/玉串奉奠/献花）
// ---------------------------------------------------------------------------
const worshipSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().trim().max(40).optional().or(z.literal("")),
  isAnonymous: z.enum(["on", ""]).optional(),
  message: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function submitWorship(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = worshipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const { slug, displayName, isAnonymous, message } = parsed.data;
  const m = await getPublicMemorial(slug);
  if (!m || m.attendDecline) {
    return { ok: false, errors: { _form: "現在この式場では参拝を受け付けておりません。" } };
  }
  const anon = isAnonymous === "on" || !displayName;
  store.worships.push({
    id: nextId("wor"),
    memorialSlug: slug,
    worshipType: religionVocab(m.religionType).worshipLabel,
    displayName: anon ? null : displayName!.trim(),
    isAnonymous: anon,
    message: message ? message.trim() : null,
    createdAt: new Date().toISOString(),
  });
  // TODO(supabase): virtual_worships へ INSERT（連打抑止は (memorial_id, ip_hash) で）
  return { ok: true, message: `${religionVocab(m.religionType).worshipLabel}を承りました。` };
}

// ---------------------------------------------------------------------------
// お悔やみ記帳・メッセージ（公開前モデレーション = 既定 pending）
// ---------------------------------------------------------------------------
const messageSchema = z.object({
  slug: z.string().min(1),
  senderName: z.string().trim().min(1, "お名前をご入力ください").max(40),
  body: z.string().trim().min(1, "メッセージをご入力ください").max(1000),
});

export async function submitMessage(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const { slug, senderName, body } = parsed.data;
  const m = await getPublicMemorial(slug);
  if (!m) return { ok: false, errors: { _form: "対象が見つかりませんでした。" } };

  store.messages.push({
    id: nextId("msg"),
    memorialSlug: slug,
    senderName,
    body,
    moderationStatus: "pending", // 既定で承認待ち
    createdAt: new Date().toISOString(),
  });
  // TODO(supabase): condolence_messages へ INSERT。spam/NGワード/XSS対策・画像は別途。
  return {
    ok: true,
    message: "お悔やみメッセージを承りました。ご遺族の確認後に公開されます。",
  };
}

// ---------------------------------------------------------------------------
// 供花・供物 注文（確認画面へ進む前のバリデーション）
//   ※決済はフェーズ3（法務確定後）。ここでは注文内容の検証・記録まで。
// ---------------------------------------------------------------------------
const orderSchema = z
  .object({
    slug: z.string().min(1),
    productId: z.string().min(1, "商品をお選びください"),
    quantity: z.coerce.number().int().min(1).max(20),
    ordererName: z.string().trim().min(1, "お名前をご入力ください"),
    ordererKana: z.string().trim().min(1, "フリガナをご入力ください"),
    company: z.string().trim().optional().or(z.literal("")),
    postalCode: z.string().trim().regex(/^\d{7}$/, "郵便番号は7桁（ハイフン不要）"),
    address: z.string().trim().min(1, "住所をご入力ください"),
    phone: z.string().trim().regex(/^\d{10,11}$/, "電話番号は10〜11桁の数字"),
    email: z.string().trim().email("メールアドレスの形式が正しくありません"),
    emailConfirm: z.string().trim(),
    namePlateText: z.string().trim().min(1, "札名をご入力ください").max(100),
    oldChar: z.enum(["on", ""]).optional(),
    invoiceName: z.string().trim().optional().or(z.literal("")),
    memo: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.email === d.emailConfirm, {
    path: ["emailConfirm"],
    message: "確認用メールアドレスが一致しません",
  });

export async function submitOrder(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;
  const m = await getPublicMemorial(d.slug);
  if (!m || m.flowerDecline) {
    return { ok: false, errors: { _form: "現在この式場では供花のご注文を受け付けておりません。" } };
  }
  const product = OFFERING_PRODUCTS.find((p) => p.id === d.productId);
  if (!product) return { ok: false, errors: { productId: "商品が見つかりません" } };

  store.orders.push({
    id: nextId("ord"),
    memorialSlug: d.slug,
    productId: d.productId,
    quantity: d.quantity,
    unitPriceAtOrder: product.priceJpy, // 注文時価格をスナップショット
    ordererName: d.ordererName,
    ordererKana: d.ordererKana,
    company: d.company || null,
    postalCode: d.postalCode,
    address: d.address,
    phone: d.phone,
    email: d.email,
    namePlateText: d.namePlateText,
    oldCharRequested: d.oldChar === "on",
    invoiceName: d.invoiceName || null,
    memo: d.memo || null,
    status: "pending_confirm",
    createdAt: new Date().toISOString(),
  });
  // TODO(stripe/supabase): フェーズ3で決済（オンラインカード・確認→与信→葬儀社確認で確定）。
  const total = product.priceJpy * d.quantity;
  return {
    ok: true,
    message: `ご注文を承りました（${product.name} ×${d.quantity}／合計 ${total.toLocaleString()}円・税込）。葬儀社よりご連絡のうえ確定いたします。`,
  };
}

// ---------------------------------------------------------------------------
// 香典オンライン決済（金額はサーバ側で許可値を再検証。確定はWebhookが唯一の真実源）
//   フェーズ3（法務確定後）に Stripe Connect で実決済。ここでは検証・記録まで。
// ---------------------------------------------------------------------------
const ALLOWED_AMOUNTS = [3000, 5000, 10000, 30000, 50000]; // 4・9を避けたプリセット
const kodenSchema = z.object({
  slug: z.string().min(1),
  amount: z.coerce.number().int(),
  donorName: z.string().trim().min(1, "ご芳名をご入力ください").max(40),
  donorCompany: z.string().trim().max(60).optional().or(z.literal("")),
  feePayer: z.enum(["sender", "recipient"]).default("recipient"),
  message: z.string().trim().max(200).optional().or(z.literal("")),
  isAmountPublic: z.enum(["on", ""]).optional(),
});

export async function submitKoden(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = kodenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  // サーバ側で金額を再検証（クライアント送信額を信用しない）
  if (!ALLOWED_AMOUNTS.includes(d.amount)) {
    return { ok: false, errors: { amount: "選択できない金額です" } };
  }
  const m = await getPublicMemorial(d.slug);
  if (!m || m.kodenDecline || isPastIso(m.kodenAcceptUntil)) {
    return { ok: false, errors: { _form: "現在この式場ではお香典を受け付けておりません。" } };
  }

  const idempotencyKey = nextId("koden_idem");
  store.koden.push({
    id: nextId("kod"),
    memorialSlug: d.slug,
    donorName: d.donorName,
    donorCompany: d.donorCompany || null,
    amountJpy: d.amount, // JPYは整数円（×100しない）
    hyogaki: religionVocab(m.religionType).kodenHyogaki,
    feePayer: d.feePayer,
    message: d.message || null,
    isAmountPublic: d.isAmountPublic === "on",
    status: "requires_payment", // 実決済成功はWebhookで succeeded に更新
    providerPaymentIntentId: null,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  });
  // TODO(stripe): PaymentIntent作成(destination charge/application_fee, 冪等キー=idempotencyKey,
  //   3DS必須)。確定は /api/webhooks/stripe の payment_intent.succeeded で行う。
  return {
    ok: true,
    message: `お香典（${d.amount.toLocaleString()}円）のお申し込みを受け付けました。決済画面は準備中です。`,
  };
}

// ---------------------------------------------------------------------------
// WEB出欠（RSVP）。受付QR・香典帳統合の起点（原典にない差別化機能）。
// ---------------------------------------------------------------------------
const rsvpSchema = z.object({
  slug: z.string().min(1),
  attendeeName: z.string().trim().min(1, "お名前をご入力ください").max(40),
  kana: z.string().trim().max(40).optional().or(z.literal("")),
  mode: z.enum(["real", "online"]),
  event: z.string().trim().max(40).optional().or(z.literal("")),
  headcount: z.coerce.number().int().min(1).max(20),
});

export async function submitRsvp(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = rsvpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const m = await getPublicMemorial(d.slug);
  if (!m) return { ok: false, errors: { _form: "対象が見つかりませんでした。" } };
  // TODO(supabase): rsvp テーブルへINSERT。受付QR・香典帳と統合。
  return {
    ok: true,
    message:
      d.mode === "online"
        ? "オンライン参列のご登録を承りました。"
        : "ご参列のご登録を承りました。当日は受付にてお名前をお伝えください。",
  };
}

function isPastIso(iso?: string): boolean {
  return iso ? new Date(iso).getTime() < Date.now() : false;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
