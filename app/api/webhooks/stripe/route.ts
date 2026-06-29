import { NextRequest, NextResponse } from "next/server";

// Stripe Webhook 受信口（決済確定の唯一の真実源）。
// フェーズ3で実装を有効化。現状は署名検証・冪等処理の骨組みのみ。
//
// 重要原則（docs/01 第3.5/3.6・第7.3）:
//  - 署名検証（stripe.webhooks.constructEvent）必須。生bodyで検証する。
//  - event.id を processed_webhook_events で dedup（二重処理防止）。
//  - payment_intent.succeeded → koden/payments を succeeded に更新（フロントのリダイレクト成功で確定しない）。
//  - charge.refunded / transfer.created / account.updated / payout.paid も処理。
//  - 金額はサーバ側で再計算済みの値と突合。

export const runtime = "nodejs"; // 生body取得のため Edge ではなく Node

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  // TODO(stripe): 実装
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // let event: Stripe.Event;
  // try {
  //   event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  // } catch (e) {
  //   return new NextResponse("invalid signature", { status: 400 });
  // }
  // if (await alreadyProcessed(event.id)) return NextResponse.json({ received: true });
  // switch (event.type) {
  //   case "payment_intent.succeeded": /* update koden/payments to succeeded */ break;
  //   case "charge.refunded": /* ... */ break;
  //   case "transfer.created":
  //   case "payout.paid":
  //   case "account.updated": /* ... */ break;
  // }
  // await markProcessed(event.id);

  if (!sig) {
    return new NextResponse("missing stripe-signature (webhook not yet configured)", {
      status: 501,
    });
  }
  void rawBody;
  return NextResponse.json({ received: true, note: "stub - phase 3" });
}
