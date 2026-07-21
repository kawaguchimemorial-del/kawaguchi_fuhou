import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// Stripe Webhook 受信口（決済確定の唯一の真実源）。
// 原則:
//  - 署名検証（stripe.webhooks.constructEvent）必須。生bodyで検証する。
//  - event.id を processed_webhook_events で dedup（二重処理防止）。
//  - payment_intent.succeeded → koden_payments を succeeded に更新。
//    （フロントの return_url リダイレクトでは確定しない）
export const runtime = "nodejs"; // 生body取得のため Edge ではなく Node

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!stripe || !secret) {
    return new NextResponse("stripe not configured", { status: 501 });
  }
  if (!sig) return new NextResponse("missing stripe-signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return new NextResponse("invalid signature", { status: 400 });
  }

  const c = db();
  if (c) {
    // 冪等: 既処理イベントは何もしない
    const { data: seen } = await c.from("processed_webhook_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (seen) return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (c) {
          const patch = { status: "succeeded", updated_at: new Date().toISOString() };
          const kid = pi.metadata?.koden_payment_id;
          if (kid) await c.from("koden_payments").update(patch).eq("id", kid);
          else await c.from("koden_payments").update(patch).eq("provider_payment_intent_id", pi.id);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (c) await c.from("koden_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("provider_payment_intent_id", pi.id);
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        if (c && ch.payment_intent) await c.from("koden_payments").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("provider_payment_intent_id", ch.payment_intent as string);
        break;
      }
      default:
        break;
    }
  } catch {
    // 処理失敗時は 500 を返し Stripe に再送させる（markProcessed しない）
    return new NextResponse("handler error", { status: 500 });
  }

  if (c) await c.from("processed_webhook_events").insert({ event_id: event.id });
  return NextResponse.json({ received: true });
}
