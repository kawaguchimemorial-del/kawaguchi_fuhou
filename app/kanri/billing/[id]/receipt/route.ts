import { getInvoice } from "@/lib/kanri/invoices";
import { mournerFullName } from "@/lib/kanri/estimates";
import { getCompanyInfo } from "@/lib/kanri/masters";

export const dynamic = "force-dynamic";

function esc(v?: string | number | null) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }

// 角印（赤・篆書風の近似）。会社名に重ねる用。
function hankoSvg(color = "#c0392b") {
  // 3列×3行に「株式会社川口典礼」を配置した近似角印
  const chars = [["株", "式", "会"], ["社", "川", "口"], ["典", "礼", ""]];
  let cells = "";
  for (let ci = 0; ci < chars.length; ci++) {
    for (let ri = 0; ri < chars[ci].length; ri++) {
      const ch = chars[ci][ri];
      if (!ch) continue;
      const x = 62 - ci * 24; // 右列から（右→左）
      const y = 20 + ri * 24;
      cells += `<text x="${x}" y="${y}" font-size="20" font-family="'Yu Mincho','Noto Serif JP',serif" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${ch}</text>`;
    }
  }
  return `<svg viewBox="0 0 84 84" width="84" height="84" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="78" height="78" fill="none" stroke="${color}" stroke-width="4"/>
    <rect x="8" y="8" width="68" height="68" fill="none" stroke="${color}" stroke-width="1.5"/>
    ${cells}
  </svg>`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await getInvoice(id);
  if (!res) return new Response("not found", { status: 404 });
  const { invoice: iv, estimate: e, details } = res;
  const co = await getCompanyInfo();

  const companyName = (co.company_name || "株式会社川口典礼").replace(/\s|　/g, "");
  const companyAddr = [co.address_city, co.address_street, co.address_building].filter(Boolean).join("");
  const addrWithPref = [co.prefecture, companyAddr].filter(Boolean).join("");
  const to = iv.invoiceTargetName || iv.mournerName || iv.customerName || (e ? mournerFullName(e) : "");
  const amount = iv.paidTotal > 0 ? iv.paidTotal : iv.total;
  // 税抜/消費税の内訳（明細があれば税率別集計、無ければ10%で逆算）
  let exTax = 0, tax = 0;
  if (details.length) {
    for (const d of details) { exTax += d.amount; tax += d.taxAmount; }
    // 入金額が請求総額と異なる場合は比率で按分
    const total = iv.total || (exTax + tax);
    if (amount !== total && total > 0) { const r = amount / total; exTax = Math.round(exTax * r); tax = amount - exTax; }
  } else {
    exTax = Math.round(amount / 1.1); tax = amount - exTax;
  }
  const proviso = iv.title || (iv.deceasedName ? `${iv.deceasedName}家　葬儀内金` : "葬儀代");
  const issued = fmt(iv.billedOn) || fmt(new Date().toISOString());
  const no = iv.invoiceNo ?? iv.id.slice(0, 6);
  const invNo = co.invoice_no || "";
  const hankoRed = hankoSvg("#c0392b");

  const money = (n: number) => `¥${n.toLocaleString()}－`;

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>領収書 ${esc(to)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Yu Gothic","Noto Sans JP",sans-serif; color: #1a1a1a; }
  .print { position: fixed; top: 6px; right: 6px; z-index: 10; } @media print { .print { display: none; } }
  .sheet { width: 210mm; height: 297mm; margin: 0 auto; }
  .half { height: 148.5mm; padding: 14mm 12mm; position: relative; }
  .receipt { background: #eaf1e2; }
  .copy { background: #fff; color: #c8641f; }
  .row1 { display: flex; align-items: flex-start; justify-content: space-between; }
  h1 { font-size: 34px; letter-spacing: .35em; margin: 0; font-weight: 700; }
  .to-box { flex: 1; margin: 0 14px; text-align: center; }
  .to-box .nm { font-size: 30px; letter-spacing: .2em; }
  .receipt .to-box { background: #fff; padding: 4px 0; }
  .no { font-size: 15px; white-space: nowrap; padding-top: 8px; }
  .amount-box { text-align: center; margin: 14px 0 6px; }
  .receipt .amount-box { background: #fff; padding: 10px 0; display: flex; align-items: baseline; justify-content: center; gap: 20px; }
  .amount { font-size: 40px; font-weight: 700; }
  .taxlabel { font-size: 20px; }
  .provrow { display: flex; align-items: baseline; gap: 24px; margin: 6px 0 2px; font-size: 17px; }
  .prov { margin-left: 40px; }
  .invno { margin-left: auto; font-weight: 700; font-size: 15px; }
  .recv { font-size: 17px; margin: 4px 0 10px; }
  .mid { display: flex; align-items: flex-start; gap: 18px; margin-top: 8px; }
  .breakdown { width: 38%; }
  .breakdown .ttl { text-align: center; letter-spacing: 1em; padding-left: 1em; border-bottom: 2px solid currentColor; padding-bottom: 2px; }
  .breakdown table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .breakdown td { padding: 4px 6px; font-size: 15px; }
  .breakdown tr { border-bottom: 2px solid currentColor; }
  .stamp-box { width: 76px; height: 76px; flex: 0 0 76px; border: 1px solid #555; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 14px; line-height: 1.5; letter-spacing: .3em; }
  .company { flex: 1; position: relative; padding-left: 10px; font-size: 14px; line-height: 1.7; }
  .company .cat { font-weight: 700; }
  .company .hall { font-weight: 700; }
  .company .cname { position: relative; display: inline-block; white-space: nowrap; font-size: 23px; font-weight: 800; letter-spacing: .04em; margin: 2px 0; }
  .company .cname .hanko { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); opacity: .92; }
  .tantou { width: 90px; flex: 0 0 90px; border: 1px solid #555; }
  .tantou .h { text-align: center; letter-spacing: .6em; padding-left: .6em; border-bottom: 1px solid #555; font-size: 14px; padding: 3px 0; }
  .tantou .b { height: 66px; }
  .copy .amount-box { margin-top: 20px; }
  .copy-hanko { position: absolute; right: 20mm; bottom: 12mm; }
</style>
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></head>
<body>
  <button class="print" onclick="window.print()">印刷</button>
  <div class="sheet">

    <!-- 上半分: 領収書 -->
    <div class="half receipt">
      <div class="row1">
        <h1>領&nbsp;収&nbsp;書</h1>
        <div class="to-box"><span class="nm">${esc(to)}</span> 様</div>
        <div class="no">No.&nbsp;&nbsp;${esc(no)}</div>
      </div>
      <div class="amount-box"><span class="amount">${money(amount)}</span><span class="taxlabel">（税込）</span></div>
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
          <div class="cname">${esc(companyName)}<span class="hanko">${hankoRed}</span></div>
          <div>${co.postcode ? `〒${esc(co.postcode)} ` : ""}${esc(addrWithPref)}</div>
          <div>${co.tel ? `TEL: ${esc(co.tel)}　` : ""}${co.fax ? `FAX: ${esc(co.fax)}` : ""}</div>
        </div>
        <div class="tantou"><div class="h">担当</div><div class="b"></div></div>
      </div>
    </div>

    <!-- 下半分: 入金伝票（控え） -->
    <div class="half copy">
      <div class="row1">
        <h1>入金伝票</h1>
        <div class="to-box"><span class="nm">${esc(to)}</span> 様</div>
        <div class="no">No.&nbsp;&nbsp;${esc(no)}</div>
      </div>
      <div class="amount-box"><span class="amount">${money(amount)}</span></div>
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
      <div class="copy-hanko">${hankoRed}</div>
    </div>

  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
