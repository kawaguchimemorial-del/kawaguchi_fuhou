"use server";

import { z } from "zod";
import { getPublicMemorial } from "./data";
import { religionVocab } from "./religion";
import { store, nextId } from "./store";
import { OFFERING_PRODUCTS } from "./products";
import { dbEnabled, resolveMemorialId, insertRow, insertRowReturningId, updateRowById, getPublicProducts } from "./db";
import { getStripe, kodenPaymentEnabled, offeringPaymentEnabled, chargedAmount } from "@/lib/stripe/server";
import { fulfillOfferingOrder, type OfferingPayload } from "./offering-fulfill";

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
  if (dbEnabled()) {
    const mid = await resolveMemorialId(slug);
    if (mid)
      await insertRow("virtual_worships", {
        memorial_id: mid,
        worship_type: religionVocab(m.religionType).worshipLabel,
        display_name: anon ? null : displayName!.trim(),
        is_anonymous: anon,
        message: message ? message.trim() : null,
      });
  }
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
  // クライアントでSupabase Storageへアップ済みの画像URL(JSON配列文字列, 最大3件)
  imagePaths: z.string().optional().or(z.literal("")),
});

function parseImagePaths(raw?: string): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 3);
  } catch {
    return [];
  }
}

export async function submitMessage(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const { slug, senderName, body } = parsed.data;
  const imagePaths = parseImagePaths(parsed.data.imagePaths);
  const m = await getPublicMemorial(slug);
  if (!m) return { ok: false, errors: { _form: "対象が見つかりませんでした。" } };

  if (dbEnabled()) {
    const mid = await resolveMemorialId(slug);
    if (mid)
      await insertRow("condolence_messages", {
        memorial_id: mid,
        sender_name: senderName,
        body,
        image_paths: imagePaths,
        moderation_status: "pending",
      });
  }
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
    ordererFirstName: z.string().trim().min(1, "名をご入力ください"),
    ordererKanaMei: z.string().trim().optional().or(z.literal("")),
    company: z.string().trim().optional().or(z.literal("")),
    postalCode: z.string().trim().regex(/^\d{7}$/, "郵便番号は7桁（ハイフン不要）"),
    prefecture: z.string().trim().min(1, "都道府県をお選びください"),
    city: z.string().trim().min(1, "市区町村をご入力ください"),
    street: z.string().trim().min(1, "番地をご入力ください"),
    building: z.string().trim().optional().or(z.literal("")),
    phone: z.string().trim().regex(/^\d{10,11}$/, "電話番号は10〜11桁の数字"),
    email: z.string().trim().email("メールアドレスの形式が正しくありません"),
    emailConfirm: z.string().trim(),
    namePlateText: z.string().trim().min(1, "札名をご入力ください").max(100),
    oldChar: z.enum(["on", ""]).optional(),
    paymentMethod: z.enum(["請求書払い（銀行振込）", "当日現地払い", "クレジットカード"]).optional(),
    invoiceName: z.string().trim().optional().or(z.literal("")),
    memo: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.email === d.emailConfirm, {
    path: ["emailConfirm"],
    message: "確認用メールアドレスが一致しません",
  });

export type OrderStart =
  | { ok: false; errors: Record<string, string> }
  | { ok: true; message: string }
  | { ok: true; card: true; clientSecret: string; amount: number; productName: string; quantity: number };

export async function submitOrder(
  _prev: OrderStart | null,
  formData: FormData
): Promise<OrderStart> {
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;
  const fullName = [d.ordererName, d.ordererFirstName].filter(Boolean).join(" ");
  const fullKana = [d.ordererKana, d.ordererKanaMei].filter(Boolean).join(" ");
  const fullAddress = [d.prefecture, d.city, d.street, d.building].filter(Boolean).join("");
  const m = await getPublicMemorial(d.slug);
  if (!m || m.flowerDecline) {
    return { ok: false, errors: { _form: "現在この式場では供花のご注文を受け付けておりません。" } };
  }
  // 価格・商品名は信頼できるDBの商品マスタから再取得（クライアント送信値を信用しない）。
  // DB未設定時のみ暫定ダミーで照合。
  const dbProducts = await getPublicProducts();
  const catalog = dbProducts.length > 0 ? dbProducts : OFFERING_PRODUCTS;
  const product = catalog.find((p) => p.id === d.productId);
  if (!product) return { ok: false, errors: { productId: "商品が見つかりません" } };

  const total = product.priceJpy * d.quantity;
  const paymentMethod = d.paymentMethod || "請求書払い（銀行振込）";
  const wantCard = d.paymentMethod === "クレジットカード";

  // 確定処理(請求書・メール)で使う注文内容。カード決済時はDBに一時保存し、決済成功Webhookで使う。
  const payload: OfferingPayload = {
    slug: d.slug, productId: d.productId, productName: product.name, unitPriceJpy: product.priceJpy, quantity: d.quantity,
    ordererLast: d.ordererName, ordererFirst: d.ordererFirstName, ordererKana: d.ordererKana || "", ordererKanaMei: d.ordererKanaMei || "",
    company: d.company || "", postalCode: d.postalCode, prefecture: d.prefecture, city: d.city, street: d.street, building: d.building || "",
    phone: d.phone, email: d.email, namePlateText: d.namePlateText, oldChar: d.oldChar === "on",
    invoiceName: d.invoiceName || "", memo: d.memo || "", paymentMethod,
  };

  // ===== カード決済(Stripe) =====
  // 決済が成功して初めて確定(請求書作成・メール・一覧表示)する。失敗時は請求書を作らず一覧にも出さない。
  const stripe = getStripe();
  if (wantCard && stripe && offeringPaymentEnabled() && dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (!mid) return { ok: false, errors: { _form: "対象の式場が見つかりませんでした。" } };
    const idempotencyKey = nextId("offer_idem");
    const orderId = await insertRowReturningId("offering_orders", {
      memorial_id: mid, product_id: d.productId, product_name: product.name, quantity: d.quantity,
      unit_price_jpy: product.priceJpy, charged_amount_jpy: total, orderer_name: fullName, orderer_kana: fullKana,
      company: d.company || null, postal_code: d.postalCode, address: fullAddress, phone: d.phone, email: d.email,
      name_plate_text: d.namePlateText, old_char: d.oldChar === "on", invoice_name: d.invoiceName || null, memo: d.memo || null,
      payment_method: "クレジットカード", status: "requires_payment", idempotency_key: idempotencyKey, pending_payload: payload,
    });
    if (!orderId) return { ok: false, errors: { _form: "受付処理に失敗しました。時間をおいてお試しください。" } };
    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: total, currency: "jpy", automatic_payment_methods: { enabled: true },
          description: `供花・供物 ${product.name}×${d.quantity} / ${m.deceased?.nameKanji ?? ""}`,
          metadata: { kind: "offering", offering_order_id: orderId, memorial_id: mid, slug: d.slug, orderer_name: fullName },
        },
        { idempotencyKey }
      );
      await updateRowById("offering_orders", orderId, { provider_payment_intent_id: intent.id, updated_at: new Date().toISOString() });
      return { ok: true, card: true, clientSecret: intent.client_secret!, amount: total, productName: product.name, quantity: d.quantity };
    } catch {
      await updateRowById("offering_orders", orderId, { status: "error", updated_at: new Date().toISOString() });
      return { ok: false, errors: { _form: "決済の準備に失敗しました。時間をおいて再度お試しください。" } };
    }
  }

  // ===== 銀行振込 / 当日現地払い（従来どおり即時確定） =====
  if (dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (mid)
      await insertRow("offering_orders", {
        memorial_id: mid, product_id: d.productId, product_name: product.name, quantity: d.quantity,
        unit_price_jpy: product.priceJpy, orderer_name: fullName, orderer_kana: fullKana, company: d.company || null,
        postal_code: d.postalCode, address: fullAddress, phone: d.phone, email: d.email, name_plate_text: d.namePlateText,
        old_char: d.oldChar === "on", invoice_name: d.invoiceName || null, memo: d.memo || null,
        payment_method: paymentMethod, status: "pending_confirm",
      });
  }
  store.orders.push({
    id: nextId("ord"), memorialSlug: d.slug, productId: d.productId, quantity: d.quantity,
    unitPriceAtOrder: product.priceJpy, ordererName: fullName, ordererKana: fullKana, company: d.company || null,
    postalCode: d.postalCode, address: fullAddress, phone: d.phone, email: d.email, namePlateText: d.namePlateText,
    oldCharRequested: d.oldChar === "on", invoiceName: d.invoiceName || null, memo: d.memo || null,
    status: "pending_confirm", createdAt: new Date().toISOString(),
  });
  // 請求書作成・確認/通知メール（共通処理）
  await fulfillOfferingOrder(payload);
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
  if (dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (mid)
      await insertRow("koden_payments", {
        memorial_id: mid,
        donor_name: d.donorName,
        donor_company: d.donorCompany || null,
        amount_jpy: d.amount,
        hyogaki: religionVocab(m.religionType).kodenHyogaki,
        fee_payer: d.feePayer,
        message: d.message || null,
        is_amount_public: d.isAmountPublic === "on",
        status: "requires_payment",
      });
  }
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
  return {
    ok: true,
    message: `お香典（${d.amount.toLocaleString()}円）のお申し込みを受け付けました。決済画面は準備中です。`,
  };
}

// 香典のクレジット決済開始。koden_paymentsを requires_payment で作成し、StripeのPaymentIntentを発行して
// clientSecret を返す（フロントは Payment Element で確定）。確定の真実源は /api/webhooks/stripe。
// STRIPE_SECRET_KEY 未設定時は stripe:false を返し、従来の「準備中」表示にフォールバックする。
export type KodenStart =
  | { ok: false; errors: Record<string, string> }
  | { ok: true; stripe: false; message: string }
  | { ok: true; stripe: true; clientSecret: string; amount: number; chargedAmount: number; feePayer: string };

export async function createKodenPayment(
  _prev: KodenStart | null,
  formData: FormData
): Promise<KodenStart> {
  const parsed = kodenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (!ALLOWED_AMOUNTS.includes(d.amount)) return { ok: false, errors: { amount: "選択できない金額です" } };
  const m = await getPublicMemorial(d.slug);
  if (!m || m.kodenDecline || isPastIso(m.kodenAcceptUntil)) {
    return { ok: false, errors: { _form: "現在この式場ではお香典を受け付けておりません。" } };
  }

  const hyogaki = religionVocab(m.religionType).kodenHyogaki;
  const charge = chargedAmount(d.amount, d.feePayer);
  const idempotencyKey = nextId("koden_idem");

  const stripe = getStripe();
  // 香典決済フラグOFF or Stripe未設定 or DB未接続 → 従来どおり記録のみで「準備中」
  if (!stripe || !kodenPaymentEnabled() || !dbEnabled()) {
    if (dbEnabled()) {
      const mid = await resolveMemorialId(d.slug);
      if (mid) await insertRow("koden_payments", {
        memorial_id: mid, donor_name: d.donorName, donor_company: d.donorCompany || null,
        amount_jpy: d.amount, hyogaki, fee_payer: d.feePayer, message: d.message || null,
        is_amount_public: d.isAmountPublic === "on", status: "requires_payment",
      });
    }
    return { ok: true, stripe: false, message: `お香典（${d.amount.toLocaleString()}円）のお申し込みを受け付けました。決済画面は準備中です。` };
  }

  const mid = await resolveMemorialId(d.slug);
  if (!mid) return { ok: false, errors: { _form: "対象の式場が見つかりませんでした。" } };

  // 先に決済レコードを作成し、そのidをPaymentIntentのmetadataへ（Webhookで突合するため）。
  const paymentId = await insertRowReturningId("koden_payments", {
    memorial_id: mid, donor_name: d.donorName, donor_company: d.donorCompany || null,
    amount_jpy: d.amount, charged_amount_jpy: charge, hyogaki, fee_payer: d.feePayer,
    message: d.message || null, is_amount_public: d.isAmountPublic === "on",
    status: "requires_payment", idempotency_key: idempotencyKey,
  });
  if (!paymentId) return { ok: false, errors: { _form: "受付処理に失敗しました。時間をおいてお試しください。" } };

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: charge, // JPYは最小単位=円（×100しない）
        currency: "jpy",
        automatic_payment_methods: { enabled: true },
        description: `お香典 ${hyogaki} / ${m.deceased?.nameKanji ?? ""}`,
        metadata: { koden_payment_id: paymentId, memorial_id: mid, slug: d.slug, donor_name: d.donorName, koden_amount: String(d.amount), fee_payer: d.feePayer },
      },
      { idempotencyKey }
    );
    await updateRowById("koden_payments", paymentId, { provider_payment_intent_id: intent.id, updated_at: new Date().toISOString() });
    return { ok: true, stripe: true, clientSecret: intent.client_secret!, amount: d.amount, chargedAmount: charge, feePayer: d.feePayer };
  } catch {
    await updateRowById("koden_payments", paymentId, { status: "failed", updated_at: new Date().toISOString() });
    return { ok: false, errors: { _form: "決済の準備に失敗しました。時間をおいて再度お試しください。" } };
  }
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
  if (dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (mid)
      await insertRow("rsvp", {
        memorial_id: mid,
        attendee_name: d.attendeeName,
        kana: d.kana || null,
        mode: d.mode,
        event: d.event || null,
        headcount: d.headcount,
      });
  }
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
