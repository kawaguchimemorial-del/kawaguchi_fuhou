"use server";

import { z } from "zod";
import { getPublicMemorial } from "./data";
import { religionVocab } from "./religion";
import { store, nextId } from "./store";
import { OFFERING_PRODUCTS } from "./products";
import { dbEnabled, resolveMemorialId, insertRow, getPublicProducts } from "./db";
import { createFlowerOrderInvoice } from "@/lib/kanri/flower-invoice";
import { sendMailWithPdf } from "@/lib/kanri/mail";
import { getCompanyInfo } from "@/lib/kanri/masters";

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
    paymentMethod: z.enum(["請求書払い（銀行振込）", "当日現地払い"]).optional(),
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

  if (dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (mid)
      await insertRow("offering_orders", {
        memorial_id: mid,
        product_id: d.productId,
        product_name: product.name,
        quantity: d.quantity,
        unit_price_jpy: product.priceJpy,
        orderer_name: fullName,
        orderer_kana: fullKana,
        company: d.company || null,
        postal_code: d.postalCode,
        address: fullAddress,
        phone: d.phone,
        email: d.email,
        name_plate_text: d.namePlateText,
        old_char: d.oldChar === "on",
        invoice_name: d.invoiceName || null,
        memo: d.memo || null,
        payment_method: d.paymentMethod || "請求書払い（銀行振込）",
        status: "pending_confirm",
      });
  }
  store.orders.push({
    id: nextId("ord"),
    memorialSlug: d.slug,
    productId: d.productId,
    quantity: d.quantity,
    unitPriceAtOrder: product.priceJpy, // 注文時価格をスナップショット
    ordererName: fullName,
    ordererKana: fullKana,
    company: d.company || null,
    postalCode: d.postalCode,
    address: fullAddress,
    phone: d.phone,
    email: d.email,
    namePlateText: d.namePlateText,
    oldCharRequested: d.oldChar === "on",
    invoiceName: d.invoiceName || null,
    memo: d.memo || null,
    status: "pending_confirm",
    createdAt: new Date().toISOString(),
  });
  const total = product.priceJpy * d.quantity;
  const paymentMethod = d.paymentMethod || "請求書払い（銀行振込）";
  // 社内管理用に請求書(fk_invoices)を作成。請求先=注文者・種別=オンライン供花注文。
  let invoiceId: string | undefined;
  if (dbEnabled()) {
    const mid = await resolveMemorialId(d.slug);
    if (mid) {
      try {
        const r = await createFlowerOrderInvoice({
          memorialId: mid, productName: product.name, unitPriceIncTax: product.priceJpy,
          quantity: d.quantity, paymentMethod,
          orderer: { lastName: d.ordererName, firstName: d.ordererFirstName, kana: fullKana, company: d.company || undefined, postcode: d.postalCode, prefecture: d.prefecture, city: d.city, street: d.street, building: d.building || undefined, phone: d.phone, email: d.email },
        });
        if (r.ok) invoiceId = r.invoiceId;
      } catch { /* 請求書作成失敗は注文自体は成立させる(社内で手動作成可) */ }
    }
  }
  // 注文確認メールを注文者へ送信(PDFなし)。未設定・失敗でも注文は成立。
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kawaguchi-fuhou.vercel.app").replace(/\/$/, "");
  try {
    const co = await getCompanyInfo();
    const company = co.company_name || "株式会社 川口典礼";
    const subject = `【${company}】供花・供物ご注文ありがとうございます`;
    const html = `<p>${fullName} 様</p>`
      + `<p>この度は供花・供物のご注文をいただき、誠にありがとうございます。以下の内容で承りました。</p>`
      + `<p>商品：${product.name}<br>数量：${d.quantity}<br>札名：${d.namePlateText}<br>合計：${total.toLocaleString()}円（税込）<br>お支払い方法：${paymentMethod}</p>`
      + (paymentMethod === "当日現地払い"
        ? `<p>当日、会場にてお支払いをお願いいたします。</p>`
        : (invoiceId
          ? `<p>下記より請求書を開き、印刷のうえお支払いをお願いいたします。<br><a href="${baseUrl}/kanri/billing/${invoiceId}/print">▶ 請求書を表示・印刷する</a></p>`
          : `<p>後ほど請求書のご案内をお送りいたします。</p>`))
      + `<p>――――――――――<br>${company}<br>${[co.prefecture, co.address_city, co.address_street].filter(Boolean).join("")}<br>${co.tel ? "TEL: " + co.tel : ""}</p>`;
    const mailRes = await sendMailWithPdf({ to: d.email, subject, html });
    if (!mailRes.ok) console.error("[flower-order] 確認メール送信失敗:", mailRes.error);
  } catch (e) { console.error("[flower-order] 確認メール例外:", e instanceof Error ? e.message : e); }
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
