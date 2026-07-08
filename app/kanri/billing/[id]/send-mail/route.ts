import { getInvoice } from "@/lib/kanri/invoices";
import { getCustomer } from "@/lib/kanri/data";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { sendMailWithPdf } from "@/lib/kanri/mail";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await getInvoice(id);
  if (!res) return Response.json({ ok: false, error: "請求書が見つかりません。" }, { status: 404 });
  const { invoice: iv } = res;
  const cust = iv.customerId ? await getCustomer(iv.customerId) : null;
  const to = cust?.email;
  if (!to) return Response.json({ ok: false, error: "顧客にメールアドレスが登録されていません。" }, { status: 400 });

  let pdfBase64: string | undefined;
  try {
    const body = await req.json();
    const dataUrl: string = body?.pdfBase64 ?? "";
    pdfBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl || undefined;
  } catch { /* 添付なしで続行 */ }

  const co = await getCompanyInfo();
  const company = co.company_name || "株式会社 川口典礼";
  const subject = `【${company}】ご請求書${iv.invoiceNo ? `（No.${iv.invoiceNo}）` : ""}のご送付`;
  const html = `<p>${cust?.lastName ?? ""}${cust?.firstName ?? ""} 様</p>`
    + `<p>いつもお世話になっております。${company}でございます。<br>ご請求書を添付にてお送りいたします。ご確認のほどよろしくお願い申し上げます。</p>`
    + (iv.title ? `<p>件名：${iv.title}</p>` : "")
    + `<p>ご請求金額：${iv.total.toLocaleString()}円（税込）</p>`
    + `<p>――――――――――<br>${company}<br>${[co.prefecture, co.address_city, co.address_street].filter(Boolean).join("")}<br>${co.tel ? "TEL: " + co.tel : ""}</p>`;

  const r = await sendMailWithPdf({ to, subject, html, pdfBase64, filename: `請求書_${iv.invoiceNo || id.slice(0, 6)}.pdf` });
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({ ok: true, to });
}
