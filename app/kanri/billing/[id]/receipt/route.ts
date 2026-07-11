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
  const seal = `<img class="seal" src="${KAKUIN_DATA_URL}" alt="社印">`;
  // 領収証の日付は「入金日」を用いる（請求書の発行日ではない）。
  // 対象入金の入金日を優先。無ければ請求発行日→当日にフォールバック。
  const issued = fmt(target?.paidOn) || fmt(iv.billedOn) || fmt(new Date().toISOString());
  const no = iv.invoiceNo ?? iv.id.slice(0, 6);
  const invNo = co.invoice_no || "";

  const money = (n: number) => `¥${n.toLocaleString()}－`;

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>領収証 ${esc(to)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Yu Gothic","Noto Sans JP",sans-serif; color: #1a1a1a; }
  @media print { .receipt { background: #eaf1e2 !important; } }
  .print { position: fixed; top: 6px; right: 6px; z-index: 10; } @media print { .print { display: none; } }
  .sheet { width: 210mm; height: 297mm; margin: 0 auto; padding-top: 30.6mm; box-sizing: border-box; }
  .half { height: 117.8mm; padding: 9mm 14mm; position: relative; overflow: hidden; }
  .receipt { background: #eaf1e2; }
  .copy { background: #fff; color: #c8641f; }
  .row1 { display: flex; align-items: center; justify-content: space-between; }
  h1 { font-size: 29px; letter-spacing: .35em; margin: 0; font-weight: 700; }
  .to-box { flex: none; width: 52%; margin: 0 auto; border: 1px solid #000; background: #fff; min-height: 10mm; display: flex; align-items: center; justify-content: center; padding: 3px 0; }
  .to-box .nm { font-size: 22px; letter-spacing: .2em; }
  .receipt .to-box { background: #fff; padding: 0; }
  .copy .to-box { border-color: #c8641f; }
  .no { font-size: 13px; white-space: nowrap; }
  .amount-box { text-align: center; margin: 9px 0 5px; }
  .receipt .amount-box { border: 1px solid #000; background: #fdf6d8; padding: 0; height: 12mm; display: flex; align-items: center; justify-content: center; gap: 12px; }
  .copy .amount-box { border: 1px solid #c8641f; height: 12mm; display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 13px; }
  .amount { font-size: 30px; font-weight: 700; line-height: 1; }
  .taxlabel { font-size: 17px; }
  .provrow { display: flex; align-items: baseline; gap: 20px; margin: 7px 0 3px; font-size: 14px; }
  .prov { margin-left: 34px; }
  .invno { margin-left: auto; font-weight: 700; font-size: 13px; }
  .recv { font-size: 14px; margin: 5px 0 8px; }
  .mid { display: flex; align-items: flex-start; gap: 18px; margin-top: 9px; }
  .breakdown { width: 38%; }
  .breakdown .ttl { border: 1px solid #000; border-bottom: none; text-align: center; letter-spacing: .6em; padding: 3px 0; font-size: 13px; }
  .breakdown table { width: 100%; border-collapse: collapse; margin-top: 0; }
  .breakdown td { border: 1px solid #000; padding: 4px 6px; font-size: 13px; }
  .breakdown td:first-child { width: 55%; white-space: nowrap; }
  .breakdown td:last-child { text-align: right; }
  .copy .breakdown .ttl, .copy .breakdown td { border-color: #c8641f; }
  .stamp-box { width: 14mm; height: 14mm; flex: 0 0 14mm; border: 1px solid #000; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; line-height: 1.3; letter-spacing: .3em; }
  .copy .stamp-box { border-color: #c8641f; }
  .company { flex: 1; position: relative; padding-left: 8px; padding-right: 6mm; font-size: 11px; line-height: 1.55; }
  .company .cat { font-weight: 700; white-space: nowrap; }
  .company .hall { font-weight: 700; }
  .company .addr { white-space: nowrap; }
  .company .cname { position: relative; display: inline-block; white-space: nowrap; font-size: 19px; font-weight: 800; letter-spacing: .04em; margin: 1px 0; }
  .tantou { width: 20mm; flex: 0 0 20mm; border: 1px solid #000; }
  .copy .tantou { border-color: #c8641f; }
  .tantou .h { text-align: center; letter-spacing: .6em; padding-left: .6em; border-bottom: 1px solid #000; font-size: 13px; padding: 2px 0; }
  .copy .tantou .h { border-bottom-color: #c8641f; }
  .tantou .b { height: 44px; }
  .seal { position: absolute; right: 16mm; bottom: 10mm; width: 24mm; height: auto; opacity: .95; z-index: 2; }
</style>
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></head>
<body>
  <button class="print" onclick="window.print()">印刷</button>
  <div class="sheet">

    <!-- 上半分: 領収証 -->
    <div class="half receipt">
      <div class="row1">
        <h1>領&nbsp;収&nbsp;証</h1>
        <div class="to-box"><span class="nm">${esc(to)}</span> 様</div>
        <div class="no">No.&nbsp;&nbsp;${esc(no)}</div>
      </div>
      <div class="amount-box"><span class="amount">${money(amount)}</span><span class="taxlabel">（税込）</span>${categoryLabel ? `<span class="taxlabel">［${categoryLabel}］</span>` : ""}</div>
      <div class="provrow"><span>但し</span><span class="prov">${esc(proviso)}</span>${invNo ? `<span class="invno">事業者番号：${esc(invNo)}</span>` : ""}</div>
      <div class="recv">${issued}&nbsp;&nbsp;&nbsp;上記正に領収いたしました。</div>
      <div class="mid">
        <div class="breakdown">
          <div class="ttl">内訳</div>
          <table><tr><td>税抜金額</td><td style="text-align:right">${exTax.toLocaleString()}</td></tr>
          <tr><td>消費税額</td><td style="text-align:right">${tax.toLocaleString()}</td></tr></table>
        </div>
        <div class="stamp-box">印&nbsp;収<br>紙&nbsp;入</div>
        <div class="company">
          <div class="cat">葬祭業務全般・仏壇仏具・霊園墓石販売</div>
          <div class="hall">川口メモリアルホール</div>
          <div class="cname">${esc(companyName)}</div>
          <div class="addr">${co.postcode ? `〒${esc(co.postcode)} ` : ""}${esc(addrWithPref)}</div>
          <div class="addr">${co.tel ? `TEL: ${esc(telFmt(co.tel))}　` : ""}${co.fax ? `FAX: ${esc(co.fax)}` : ""}</div>
        </div>
        <div class="tantou"><div class="h">担当</div><div class="b"></div></div>
      </div>
      ${seal}
    </div>

    <!-- 下半分: 入金伝票（控え） -->
    <div class="half copy">
      <div class="row1">
        <h1>入金伝票</h1>
        <div class="to-box"><span class="nm">${esc(to)}</span> 様</div>
        <div class="no">No.&nbsp;&nbsp;${esc(no)}</div>
      </div>
      <div class="amount-box"><span class="amount">${money(amount)}</span>${categoryLabel ? `<span class="taxlabel">［${categoryLabel}］</span>` : ""}</div>
      <div class="provrow"><span>但し</span><span class="prov">${esc(proviso)}</span></div>
      <div class="recv">${issued}&nbsp;&nbsp;&nbsp;上記正に領収いたしました。</div>
      <div class="mid">
        <div class="breakdown">
          <div class="ttl">内訳</div>
          <table><tr><td>税抜金額</td><td style="text-align:right">${exTax.toLocaleString()}</td></tr>
          <tr><td>消費税額</td><td style="text-align:right">${tax.toLocaleString()}</td></tr></table>
        </div>
        <div style="flex:1"></div>
        <div class="tantou"><div class="h" style="color:#c8641f;border-color:#c8641f">担当</div><div class="b"></div></div>
      </div>
      ${seal}
    </div>

  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
