import { getEstimate, deceasedFullName } from "@/lib/kanri/estimates";
import { getCustomer } from "@/lib/kanri/data";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { sendMailWithPdf } from "@/lib/kanri/mail";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const e = await getEstimate(id);
  if (!e) return Response.json({ ok: false, error: "見積が見つかりません。" }, { status: 404 });
  const cust = e.customerId ? await getCustomer(e.customerId) : null;
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
  const target = deceasedFullName(e);
  const subject = `【${company}】お見積書${target ? `（${target}様）` : ""}のご送付`;
  const html = `<p>${cust?.lastName ?? ""}${cust?.firstName ?? ""} 様</p>`
    + `<p>いつもお世話になっております。${company}でございます。<br>お見積書を添付にてお送りいたします。ご確認のほどよろしくお願い申し上げます。</p>`
    + (e.title ? `<p>件名：${e.title}</p>` : "")
    + `<p>合計金額：${e.total.toLocaleString()}円（税込）</p>`
    + `<p>――――――――――<br>${company}<br>${[co.prefecture, co.address_city, co.address_street].filter(Boolean).join("")}<br>${co.tel ? "TEL: " + co.tel : ""}</p>`;

  const r = await sendMailWithPdf({ to, subject, html, pdfBase64, filename: `見積書_${target || id.slice(0, 6)}.pdf` });
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({ ok: true, to });
}
