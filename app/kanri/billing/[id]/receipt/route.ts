import { getInvoice } from "@/lib/kanri/invoices";
import { listPaymentSlips } from "@/lib/kanri/payments";
import { mournerFullName } from "@/lib/kanri/estimates";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { KAKUIN_DATA_URL } from "@/lib/kanri/kakuin";

export const dynamic = "force-dynamic";

function esc(v?: string | number | null) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await getInvoice(id);
  if (!res) return new Response("not found", { status: 404 });
  const { invoice: iv, estimate: e, details } = res;
  const co = await getCompanyInfo();

  // 入金(内金/残金)ごとに領収証を出せるよう、対象の入金を特定する。
  // ?payment=<入金ID> があればその入金、無ければ最新の入金を対象にする。
  const slips = await listPaymentSlips(id);
  const payments = slips.flatMap((sl) => sl.payments);
  const paymentId = new URL(req.url).searchParams.get("payment");
  const byDate = [...payments].sort((a, b) =>
    String(a.paidOn ?? "").localeCompare(String(b.paidOn ?? "")),
  );
  const target = paymentId
    ? payments.find((p) => p.id === paymentId)
    : byDate[byDate.length - 1];

  // 入金種別ラベル(内金/残金)。一部入金→内金・完納→残金に寄せる。その他/未選択は表示しない。
  const catRaw = (target?.category ?? "").trim();
  const categoryLabel =
    catRaw === "内金" || catRaw === "一部入金"
      ? "内金"
      : catRaw === "残金" || catRaw === "完納"
        ? "残金"
        : "";

  const companyName = (co.company_name || "株式会社 川口典礼").trim();
  const telFmt = (t?: string) => {
    const d = (t || "").replace(/[^0-9]/g, "");
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    return t || "";
  };
  const companyAddr = [co.address_city, co.address_street, co.address_building].filter(Boolean).join("");
  const addrWithPref = [co.prefecture, companyAddr].filter(Boolean).join("");
  const to = iv.invoiceTargetName || iv.mournerName || iv.customerName || (e ? mournerFullName(e) : "");
  // 受領額: 対象入金があればその入金額、無ければ累計入金(無ければ請求総額)。
  const amount = target ? target.amount : (iv.paidTotal > 0 ? iv.paidTotal : iv.total);
  // 税抜/消費税の内訳。
  // ※ DBの tax_amount は移植データが不正(8%換算や0)のため信用しない。
  //   各明細の 税込金額(amount_including_tax) と 税抜金額(amount)、無ければ税率(tax)から実額を算出する。
  let exTax = 0, tax = 0;
  if (details.length) {
    for (const d of details) {
      const ex = d.amount ?? 0;
      const lineTax = (d.amountIncludingTax && d.amountIncludingTax > ex)
        ? d.amountIncludingTax - ex               // 税込金額との差＝実際の消費税額
        : Math.round(ex * (d.tax ?? 0.1));         // 税込が無ければ税率で計算
      exTax += ex; tax += lineTax;
    }
    // 入金額が請求総額と異なる場合は比率で按分（内訳が表示額に必ず一致するようにする）
    const total = iv.total || (exTax + tax);
    if (amount !== total && total > 0) { const r = amount / total; exTax = Math.round(exTax * r); tax = amount - exTax; }
  } else {
    exTax = Math.round(amount / 1.1); tax = amount - exTax;
  }
  // 但し書き: 種別(内金/残金)があれば末尾に付す。
  const provisoBase = iv.title || (iv.deceasedName ? `${iv.deceasedName}家　葬儀代` : "葬儀代");
  const proviso = categoryLabel ? `${provisoBase}（${categoryLabel}）` : provisoBase;
  // 領収証の日付は「入金日」を用いる（請求書の発行日ではない）。
  // 対象入金の入金日を優先。無ければ請求発行日→当日にフォールバック。
  const issued = fmt(target?.paidOn) || fmt(iv.billedOn) || fmt(new Date().toISOString());
  const no = iv.invoiceNo ?? iv.id.slice(0, 6);
  const invNo = co.invoice_no || "";

  const money = (n: number) => `¥${n.toLocaleString()}－`;

  const companyBlock = `<div class="company">
        <div class="cat">葬祭業務全般・仏壇仏具・霊園墓石販売</div>
        <div class="hall">川口メモリアルホール</div>
        <div class="cname">${esc(companyName)}</div>
        <div class="addr">${co.postcode ? `〒${esc(co.postcode)} ` : ""}${esc(addrWithPref)}</div>
        <div class="addr">${co.tel ? `TEL: ${esc(telFmt(co.tel))}` : ""}${co.fax ? `　FAX: ${esc(co.fax)}` : ""}</div>
      </div>`;
  const breakdownBlock = `<div class="breakdown">
        <div class="ttl">内&nbsp;訳</div>
        <table>
          <tr><td>税抜金額</td><td class="num">${exTax.toLocaleString()}</td></tr>
          <tr><td>消費税額</td><td class="num">${tax.toLocaleString()}</td></tr>
        </table>
      </div>`;
  const stampBlock = `<div class="stamp-box">印&nbsp;収<br>紙&nbsp;入</div>`;
  const tantouBlock = `<div class="tantou"><div class="h">担当</div><div class="b"></div></div>`;
  const halfBody = (isReceipt: boolean) => `
      <div class="title">${isReceipt ? "領&nbsp;収&nbsp;証" : "入&nbsp;金&nbsp;伝&nbsp;票"}</div>
      <div class="to-box"><span class="nm">${esc(to)}</span></div>
      <div class="sama">様</div>
      <div class="no">No.&nbsp;&nbsp;${esc(no)}</div>
      <div class="amount-box"><span class="amount">${money(amount)}</span><span class="taxlabel">（税込）</span>${categoryLabel ? `<span class="taxlabel">［${categoryLabel}］</span>` : ""}</div>
      <div class="tadashi">但し</div>
      <div class="prov">${esc(proviso)}</div>
      ${isReceipt && invNo ? `<div class="invno">事業者番号：${esc(invNo)}</div>` : ""}
      <div class="recv">${issued}&nbsp;&nbsp;&nbsp;上記正に領収いたしました。</div>
      ${breakdownBlock}
      ${stampBlock}
      ${companyBlock}
      ${tantouBlock}
      ${isReceipt ? `<img class="seal" src="${KAKUIN_DATA_URL}" alt="社印">` : ""}`;

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>領収証 ${esc(to)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Yu Gothic","Noto Sans JP",sans-serif; color: #1a1a1a; }
  .print { position: fixed; top: 6px; right: 6px; z-index: 10; } @media print { .print { display: none; } }
  .sheet { width: 210mm; height: 297mm; margin: 0 auto; padding-top: 30.6mm; }
  .half { position: relative; width: 210mm; height: 117.8mm; overflow: hidden; }
  .receipt::before, .copy::before { content: ""; position: absolute; left: 2.9mm; right: 2.9mm; top: 0; bottom: 0; z-index: 0; }
  .receipt::before { background: #eaf1e2; }
  .copy::before { background: #fff; }
  .half > * { position: absolute; z-index: 1; }
  .title { left: 2.9mm; top: 12.5mm; width: 54.4mm; text-align: center; font-size: 26px; font-weight: 700; letter-spacing: .3em; }
  .no { top: 14mm; right: 6mm; font-size: 13px; white-space: nowrap; }
  .to-box { left: 57.3mm; top: 12.5mm; width: 91.6mm; height: 14.5mm; border: .3mm solid #000; background: #fff; display: flex; align-items: center; justify-content: center; }
  .to-box .nm { font-size: 20px; letter-spacing: .15em; }
  .sama { left: 150mm; top: 12.5mm; height: 14.5mm; display: flex; align-items: center; font-size: 14px; }
  .amount-box { left: 14.4mm; top: 29.7mm; width: 181.1mm; height: 13.6mm; border: .3mm solid #000; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .receipt .amount-box { background: #fdf6d8; }
  .amount { font-size: 30px; font-weight: 700; letter-spacing: .06em; } .taxlabel { font-size: 16px; }
  .tadashi { left: 20.6mm; top: 46.4mm; font-size: 14px; }
  .prov { left: 32.1mm; top: 44.9mm; width: 114.9mm; height: 7.6mm; border: .3mm solid #000; display: flex; align-items: center; padding: 0 3mm; font-size: 13px; letter-spacing: .1em; }
  .invno { right: 14.3mm; top: 46.4mm; font-size: 13px; font-weight: 700; }
  .recv { left: 14.4mm; top: 54mm; font-size: 14px; }
  .breakdown { left: 14.6mm; top: 61.1mm; width: 68.2mm; }
  .breakdown > * { position: static; }
  .breakdown .ttl { height: 8.2mm; line-height: 8.2mm; text-align: center; letter-spacing: .4em; border: .3mm solid #000; border-bottom: none; font-size: 13px; }
  .breakdown table { width: 100%; table-layout: fixed; border-collapse: collapse; }
  .breakdown td { height: 8.1mm; padding: 0 2mm; border: .3mm solid #000; font-size: 13px; }
  .breakdown td:first-child { width: 36mm; } .breakdown td.num { text-align: right; }
  .stamp-box { left: 88.6mm; top: 61.1mm; width: 17.5mm; height: 16.6mm; border: .3mm solid #000; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; line-height: 1.4; letter-spacing: .3em; }
  .company { left: 110mm; top: 60mm; width: 68mm; font-size: 11px; line-height: 1.5; }
  .company > * { position: static; }
  .company .cat, .company .hall { font-weight: 700; white-space: nowrap; }
  .company .cname { font-size: 21px; font-weight: 800; letter-spacing: .04em; margin: 1px 0; white-space: nowrap; }
  .company .addr { white-space: nowrap; }
  .tantou { left: 180mm; top: 61.1mm; width: 15.6mm; height: 24.7mm; border: .3mm solid #000; display: flex; flex-direction: column; }
  .tantou > * { position: static; }
  .tantou .h { border-bottom: .3mm solid #000; text-align: center; font-size: 12px; padding: 1.5mm 0; }
  .tantou .b { flex: 1; }
  .seal { left: 170.3mm; top: 86.6mm; width: 25.6mm; height: 24.9mm; object-fit: contain; z-index: 2; }
  /* 下段(入金伝票)はオレンジ */
  .copy { color: #c8641f; }
  .copy .to-box, .copy .amount-box, .copy .prov, .copy .breakdown .ttl, .copy .breakdown td, .copy .stamp-box, .copy .tantou, .copy .tantou .h { border-color: #c8641f; }
  .copy .amount-box { background: #fff; }
</style>
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></head>
<body>
  <button class="print" onclick="window.print()">印刷</button>
  <div class="sheet">
    <div class="half receipt">${halfBody(true)}</div>
    <div class="half copy">${halfBody(false)}</div>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
