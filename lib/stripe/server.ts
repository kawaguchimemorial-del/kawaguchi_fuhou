import "server-only";
import Stripe from "stripe";

// STRIPE_SECRET_KEY が設定されているときだけ有効。未設定なら香典決済は「準備中」動作にフォールバック。
export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

// 日本のカード決済手数料の目安(約3.6%)。送り主が手数料を負担する場合の上乗せ計算に使う。
export const CARD_FEE_RATE = 0.036;

// 送り主が手数料負担 → 遺族に香典額(amount)が丸ごと残るよう、請求額を割り増す。
// 遺族負担(通常) → 請求額はそのまま(手数料は入金時に差し引かれる)。
export function chargedAmount(amountJpy: number, feePayer: string): number {
  if (feePayer === "sender") return Math.ceil(amountJpy / (1 - CARD_FEE_RATE));
  return amountJpy;
}
