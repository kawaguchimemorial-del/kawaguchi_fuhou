import "server-only";
import { getPublicMemorial } from "./data";
import { resolveMemorialId } from "./db";
import { createFlowerOrderInvoice } from "@/lib/kanri/flower-invoice";
import { sendMailWithPdf } from "@/lib/kanri/mail";
import { getCompanyInfo, getAppSetting } from "@/lib/kanri/masters";
import { fillSlot, ORDER_NOTIFY_DEFAULT_TO } from "./mail-template";

// カード決済の確定処理で使う、注文フォームの内容一式（offering_orders.pending_payload に保存）。
export interface OfferingPayload {
  slug: string;
  productId: string; productName: string; unitPriceJpy: number; quantity: number;
  ordererLast: string; ordererFirst: string; ordererKana: string; ordererKanaMei: string;
  company: string; postalCode: string; prefecture: string; city: string; street: string; building: string;
  phone: string; email: string; namePlateText: string; oldChar: boolean;
  invoiceName: string; memo: string; paymentMethod: string;
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://kawaguchi-fuhou.vercel.app").replace(/\/$/, "");
}

// 供花・供物注文の確定：社内請求書を作成し、注文者への確認メールと葬儀社への通知メールを送る。
// 銀行振込/当日払いは submitOrder から即時、カード決済は決済成功Webhookから呼ばれる。
export async function fulfillOfferingOrder(p: OfferingPayload): Promise<{ invoiceId?: string }> {
  const fullName = [p.ordererLast, p.ordererFirst].filter(Boolean).join(" ");
  const fullKana = [p.ordererKana, p.ordererKanaMei].filter(Boolean).join(" ");
  const fullAddress = [p.prefecture, p.city, p.street, p.building].filter(Boolean).join("");
  const total = p.unitPriceJpy * p.quantity;
  const isCard = p.paymentMethod === "クレジットカード";

  const m = await getPublicMemorial(p.slug);
  const mid = await resolveMemorialId(p.slug);

  // 社内管理用の請求書(fk_invoices)を作成
  let invoiceId: string | undefined;
  if (mid) {
    try {
      const r = await createFlowerOrderInvoice({
        memorialId: mid, productName: p.productName, unitPriceIncTax: p.unitPriceJpy,
        quantity: p.quantity, paymentMethod: p.paymentMethod, invoiceName: p.invoiceName || undefined,
        orderer: { lastName: p.ordererLast, firstName: p.ordererFirst, kana: fullKana, company: p.company || undefined, postcode: p.postalCode, prefecture: p.prefecture, city: p.city, street: p.street, building: p.building || undefined, phone: p.phone, email: p.email },
      });
      if (r.ok) invoiceId = r.invoiceId;
    } catch { /* 請求書作成失敗でも注文自体は成立 */ }
  }

  try {
    const co = await getCompanyInfo();
    const company = co.company_name || "株式会社 川口典礼";
    const tel = co.tel || "";
    const addr = [co.prefecture, co.address_city, co.address_street].filter(Boolean).join("");
    const deceasedNm = m?.deceased?.nameKanji || "";
    const mournerNm = m?.chiefMourner?.nameKanji || "";
    const [notifySetting, tmpl] = await Promise.all([getAppSetting("order_notify"), getAppSetting("order_mail_template")]);
    const vars = { company, tel };
    const noReplyNote = `<p style="color:#888;font-size:12px;line-height:1.6">${fillSlot("footer_note", tmpl.footer_note, vars, { html: true })}</p>`;
    const signature = `<p>――――――――――<br>${company}<br>${addr}<br>${tel ? "TEL: " + tel : ""}</p>`;
    const orderLines = `商品：${p.productName}<br>数量：${p.quantity}<br>札名：${p.namePlateText}<br>`
      + `旧字体希望：${p.oldChar ? "あり" : "なし"}<br>合計：${total.toLocaleString()}円（税込）<br>お支払い方法：${p.paymentMethod}`;
    const ordererInfo = `お名前：${fullName}<br>フリガナ：${fullKana || "—"}<br>`
      + (p.company ? `法人・団体：${p.company}<br>` : "")
      + `ご住所：〒${p.postalCode} ${fullAddress}<br>お電話：${p.phone}<br>メール：${p.email}`
      + (p.invoiceName ? `<br>請求書・領収書宛名：${p.invoiceName}` : "")
      + (p.memo ? `<br>備考：${p.memo}` : "");

    // 1) 注文者への確認メール
    const subject = fillSlot("subject", tmpl.subject, vars);
    const payBlock = isCard
      ? `<p>クレジットカードでのお支払いが完了しました。誠にありがとうございます。</p>`
      : (p.paymentMethod === "当日現地払い"
        ? `<p>${fillSlot("pay_onsite", tmpl.pay_onsite, vars, { html: true })}</p>`
        : (invoiceId
          ? `<p>${fillSlot("pay_invoice", tmpl.pay_invoice, vars, { html: true })}<br><a href="${baseUrl()}/kanri/billing/${invoiceId}/print">▶ 請求書を表示・印刷する</a></p>`
          : `<p>${fillSlot("pay_pending", tmpl.pay_pending, vars, { html: true })}</p>`));
    const html = `<p>${fullName} 様</p>`
      + `<p>${fillSlot("greeting", tmpl.greeting, vars, { html: true })}</p>`
      + `<p>${orderLines}</p>` + payBlock + noReplyNote + signature;
    const mailRes = await sendMailWithPdf({ to: p.email, subject, html });
    if (!mailRes.ok) console.error("[flower-order] 確認メール送信失敗:", mailRes.error);

    // 2) 葬儀社への注文通知メール
    const notifyTo = (notifySetting.to ?? "").trim() || process.env.ORDER_NOTIFY_TO || ORDER_NOTIFY_DEFAULT_TO;
    const nsubject = `【供花注文${isCard ? "・カード決済完了" : ""}】${deceasedNm ? `故${deceasedNm}様　` : ""}${fullName}様より`;
    const nhtml = `<p>オンライン供花・供物のご注文が入りました。${isCard ? "（クレジットカード決済 完了）" : ""}</p>`
      + `<p><b>■ 対象</b><br>故人：${deceasedNm || "—"}<br>喪主：${mournerNm || "—"}</p>`
      + `<p><b>■ ご注文内容</b><br>${orderLines}</p>`
      + `<p><b>■ ご注文者</b><br>${ordererInfo}</p>`
      + (invoiceId ? `<p><b>■ 請求書（社内管理用に自動作成済み）</b><br><a href="${baseUrl()}/kanri/billing/${invoiceId}/print">請求書を表示・印刷する</a></p>` : "")
      + signature;
    const notifyRes = await sendMailWithPdf({ to: notifyTo, subject: nsubject, html: nhtml });
    if (!notifyRes.ok) console.error("[flower-order] 注文通知メール送信失敗:", notifyRes.error);
  } catch (e) { console.error("[flower-order] メール処理例外:", e instanceof Error ? e.message : e); }

  return { invoiceId };
}

// カード決済が失敗したときの通知。注文者・葬儀社の双方へ知らせる（請求書は作らない・一覧にも出さない）。
export async function notifyOfferingFailed(p: OfferingPayload): Promise<void> {
  const fullName = [p.ordererLast, p.ordererFirst].filter(Boolean).join(" ");
  const total = p.unitPriceJpy * p.quantity;
  try {
    const co = await getCompanyInfo();
    const company = co.company_name || "株式会社 川口典礼";
    const tel = co.tel || "";
    const addr = [co.prefecture, co.address_city, co.address_street].filter(Boolean).join("");
    const signature = `<p>――――――――――<br>${company}<br>${addr}<br>${tel ? "TEL: " + tel : ""}</p>`;
    const orderLines = `商品：${p.productName}<br>数量：${p.quantity}<br>合計：${total.toLocaleString()}円（税込）`;

    // 1) 注文者へ失敗のお知らせ
    const html = `<p>${fullName} 様</p>`
      + `<p>この度はお申し込みをいただき、ありがとうございます。<br>誠に恐れ入りますが、クレジットカードでのお支払いが完了しませんでした。ご注文は確定しておりません。</p>`
      + `<p>${orderLines}</p>`
      + `<p>お手数ですが、下記より再度お手続きいただくか、お電話にてお問い合わせください。<br><a href="${baseUrl()}/m/${p.slug}/flower">▶ 供花・供物のお申し込みへ戻る</a></p>`
      + (tel ? `<p>お問い合わせ：${company}　TEL: ${tel}</p>` : "")
      + signature;
    await sendMailWithPdf({ to: p.email, subject: "【お支払い未完了】供花・供物のお申し込みについて", html });

    // 2) 葬儀社へ失敗通知
    const notifySetting = await getAppSetting("order_notify");
    const notifyTo = (notifySetting.to ?? "").trim() || process.env.ORDER_NOTIFY_TO || ORDER_NOTIFY_DEFAULT_TO;
    const m = await getPublicMemorial(p.slug);
    const deceasedNm = m?.deceased?.nameKanji || "";
    const nhtml = `<p>オンライン供花・供物で、クレジットカード決済が<b>失敗</b>しました（注文は未確定・請求書は未作成）。</p>`
      + `<p><b>■ 対象</b><br>故人：${deceasedNm || "—"}</p>`
      + `<p><b>■ ご注文内容</b><br>${orderLines}</p>`
      + `<p><b>■ ご注文者</b><br>お名前：${fullName}<br>お電話：${p.phone}<br>メール：${p.email}</p>`
      + `<p>必要に応じて注文者へお電話等でご連絡ください。</p>` + signature;
    await sendMailWithPdf({ to: notifyTo, subject: `【供花・カード決済失敗】${deceasedNm ? `故${deceasedNm}様　` : ""}${fullName}様`, html: nhtml });
  } catch (e) { console.error("[flower-order] 失敗通知の例外:", e instanceof Error ? e.message : e); }
}
