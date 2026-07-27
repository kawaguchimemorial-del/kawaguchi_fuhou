"use server";

import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

/**
 * 供花・供物のカード決済の返金。
 *
 * 管理画面から誰でも押せてしまうと事故になるため、実行前に返金用パスワードの
 * 再入力を必須にしている（ログインしていることとは別に、その操作の実行権限を確認する）。
 * パスワードはコードに埋め込まず環境変数で持つ（REFUND_ADMIN_PASSWORD）。
 */
export type RefundResult = { ok: true; refundId: string; amount: number } | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

/** 総当たり対策の簡易ロック。連続失敗を数え、5回でしばらく受け付けない。 */
let fails = { n: 0, until: 0 };
const LOCK_MS = 5 * 60 * 1000;

function checkPassword(password: string): string | null {
  const expect = process.env.REFUND_ADMIN_PASSWORD;
  if (!expect) return "返金機能が未設定です（管理者にお問い合わせください）。";

  if (fails.until > Date.now()) return "パスワードを続けて間違えたため、しばらく返金操作を受け付けません。";

  // 長さの差で早期returnしないよう、単純比較ではなく全文字を走査する
  if (!safeEqual(password, expect)) {
    const n = fails.n + 1;
    fails = { n, until: n >= 5 ? Date.now() + LOCK_MS : 0 };
    return "パスワードが違います。";
  }
  fails = { n: 0, until: 0 };
  return null;
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function refundOfferingOrder(orderId: string, password: string): Promise<RefundResult> {
  const credErr = checkPassword(password ?? "");
  if (credErr) return { ok: false, error: credErr };

  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "決済が未設定のため返金できません。" };
  const c = db();
  if (!c) return { ok: false, error: "データベースに接続できません。" };

  const { data: row } = await c
    .from("offering_orders")
    .select("id,status,payment_method,provider_payment_intent_id,charged_amount_jpy,unit_price_jpy,quantity,refunded_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!row) return { ok: false, error: "対象の注文が見つかりません。" };
  if (row.refunded_at) return { ok: false, error: "この注文はすでに返金済みです。" };
  if (row.status !== "captured") return { ok: false, error: "決済が完了していない注文は返金できません。" };
  if (!row.provider_payment_intent_id) return { ok: false, error: "カード決済以外の注文は返金できません（銀行振込・当日払いは個別にご対応ください）。" };

  const amount = row.charged_amount_jpy ?? (row.unit_price_jpy ?? 0) * (row.quantity ?? 1);

  let refundId: string;
  try {
    // 同じ注文を二重に返金しないよう冪等キーを付ける
    const refund = await stripe.refunds.create(
      { payment_intent: row.provider_payment_intent_id, reason: "requested_by_customer" },
      { idempotencyKey: `refund_offering_${orderId}` }
    );
    refundId = refund.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return { ok: false, error: `Stripeでの返金に失敗しました：${msg}` };
  }

  const now = new Date().toISOString();
  await c
    .from("offering_orders")
    .update({
      status: "refunded",
      refunded_at: now,
      refund_id: refundId,
      refunded_amount_jpy: amount,
      updated_at: now,
    })
    .eq("id", orderId);

  revalidatePath("/fuhou/orders");
  revalidatePath(`/fuhou/orders/${orderId}`);
  return { ok: true, refundId, amount };
}
