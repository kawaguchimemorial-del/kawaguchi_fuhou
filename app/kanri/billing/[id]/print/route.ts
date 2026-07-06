import { getInvoice } from "@/lib/kanri/invoices";
import { mournerFullName } from "@/lib/kanri/estimates";
import { getCompanyInfo } from "@/lib/kanri/masters";

export const dynamic = "force-dynamic";

function esc(v?: string | number | null): string { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function fmtd(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }
function yen(n: number) { return `${n.toLocaleString()}円`; }
function neg(n: number) { return `▲${Math.abs(n).toLocaleString()}円`; }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await getInvoice(id);
  if (!res) return new Response("not found", { status: 404 });
  const { invoice: iv, estimate: e, details } = res;
  const co = await getCompanyInfo();
  const companyName = co.company_name || "株式会社 川口典礼";
  const companyAddr = [co.address_city, co.address_street, co.address_building].filter(Boolean).join("");
  // 明細: 請求書明細(実データ)があればそれを優先。無ければ見積明細。
  // セット内訳(isSetItem)は「表示しない」チェック(hiddenPaper)を除き、数値なしでセット直下にグループ表示する。
  const fromDetails = details.length > 0;
  type Row = { name: string; unitPrice: number; quantity: number; taxRate: number; amount: number; incTax: number; isSetItem?: boolean; divideTitle?: string };
  // 「請求書に非表示」はセット内訳・オプションを問わず印刷から除外
  const allRows: Row[] = fromDetails
    ? details.filter((d) => !d.hiddenPaper).map((d) => ({ name: d.title, unitPrice: d.price, quantity: d.quantity, taxRate: d.tax, amount: d.amount, incTax: d.amountIncludingTax, isSetItem: d.isSetItem, divideTitle: d.divideTitle }))
    : (e?.items ?? []).filter((it) => !it.hiddenPaper).map((it) => ({ name: it.name, unitPrice: it.unitPrice, quantity: it.quantity, taxRate: it.taxRate, amount: it.amount, incTax: Math.round(it.amount * (1 + it.taxRate)), isSetItem: it.isSetItem, lineKind: it.lineKind })) as (Row & { lineKind?: string })[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = allRows.filter((r: any) => (fromDetails ? r.amount >= 0 : r.lineKind !== "discount") || r.isSetItem);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts = allRows.filter((r: any) => (fromDetails ? r.amount < 0 : r.lineKind === "discount") && !r.isSetItem);
  const on = fmtd(iv.billedOn) || fmtd(iv.createdAt);
  const mournerName = iv.invoiceTargetName || iv.mournerName || iv.customerName || (e ? mournerFullName(e) : "");
  const mournerAddr = e ? [e.mourner.prefecture, e.mourner.addressCity, e.mourner.addressStreet, e.mourner.addressBuilding].filter(Boolean).join("") : "";

  const itemsExTax = items.reduce((a, it) => a + it.amount, 0);
  const itemsIncTax = items.reduce((a, it) => a + it.incTax, 0);
  const itemsTax = itemsIncTax - itemsExTax;
  const discExTax = discounts.reduce((a, it) => a + it.amount, 0);
  const discIncTax = discounts.reduce((a, it) => a + it.incTax, 0);
  const grandIncTax = itemsIncTax + discIncTax;
  const grandTax = itemsTax + (discIncTax - discExTax);

  // セット内訳グループ書式: セット行→【セットに含まれるもの】→内訳(数値なし)→【ここまでセットに含まれる】→以降オプション
  let itemRows = "";
  let inSetGroup = false;
  for (const it of items) {
    if (it.isSetItem) {
      if (!inSetGroup) { itemRows += `<tr class="setmark"><td colspan="6">【セットに含まれるもの】</td></tr>`; inSetGroup = true; }
      itemRows += `<tr><td></td><td class="l">　${esc(it.name)}</td><td class="c"></td><td class="r"></td><td class="r"></td><td class="r"></td></tr>`;
      continue;
    }
    if (inSetGroup) { itemRows += `<tr class="setmark"><td colspan="6">【ここまでセットに含まれる】</td></tr>`; inSetGroup = false; }
    itemRows += `<tr>
    <td>${on}</td><td class="l">${esc(it.name)}</td><td class="c">${it.quantity}</td>
    <td class="r">${yen(it.unitPrice)}</td><td class="r">${yen(it.amount)}</td><td class="r">${yen(it.incTax)}</td></tr>`;
    // 区切りタイトル: 行の後に差し込む
    if (it.divideTitle) itemRows += `<tr class="sep"><td colspan="6">${esc(it.divideTitle)}</td></tr>`;
  }
  if (inSetGroup) itemRows += `<tr class="setmark"><td colspan="6">【ここまでセットに含まれる】</td></tr>`;
  const discRows = discounts.map((it) => `<tr>
    <td>${on}</td><td class="l">${esc(it.name)}</td><td class="c">${it.quantity}</td>
    <td class="r">${neg(it.unitPrice)}</td><td class="r">${neg(it.amount)}</td><td class="r">${neg(it.incTax)}</td></tr>`).join("");

  const bankType = co.bank_account_type || "普通";
  const bankLine = [co.bank_name, co.bank_branch, [bankType, co.bank_account_no].filter(Boolean).join(" "), co.bank_account_name].filter(Boolean);

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>請求書 ${esc(mournerName)}</title>
<style>
  @page{size:A4;margin:12mm;} body{font-family:"Noto Sans JP","Yu Gothic",sans-serif;color:#222;font-size:12px;}
  .print{position:fixed;top:6px;left:6px;} @media print{.print{display:none;}}
  .head{display:flex;justify-content:space-between;}
  h1{text-align:center;font-size:22px;letter-spacing:.3em;margin:6px 0 18px;}
  .addr{font-size:11px;color:#555;} .to{font-size:18px;margin-top:4px;}
  .company{text-align:left;font-size:11px;} .company .nm{font-weight:bold;font-size:13px;}
  .kingaku{font-size:22px;font-weight:bold;border-bottom:2px solid #333;padding-bottom:6px;margin:6px 0 16px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #999;padding:5px 7px;}
  th{background:#eee;text-align:center;} td.r{text-align:right;} td.c{text-align:center;} td.l{text-align:left;}
  .sep td{background:#eee;text-align:center;font-weight:bold;}
  .setmark td{background:#f7f7f7;font-weight:bold;font-size:11px;color:#555;}
  .breakdown{width:66%;margin-left:auto;margin-top:8px;}
  .note{font-size:11px;color:#444;margin-top:10px;}
  .bank{border:1px solid #333;padding:8px 10px;margin-top:6px;}
  .bank .ttl{font-weight:bold;margin-bottom:4px;}
  .bank .cols{display:flex;gap:32px;font-size:12px;}
</style><script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></head>
<body>
  <button class="print" onclick="window.print()">印刷</button>
  <div class="head">
    <div style="width:60%">
      <div class="addr">${esc(mournerAddr)}</div>
      <div class="to">${esc(mournerName)} 様</div>
    </div>
    <div style="text-align:right;font-size:11px">
      請求書番号 ${esc(iv.invoiceNo ?? iv.id.slice(0, 8))}<br>請求日 ${on}
    </div>
  </div>
  <h1>請求書</h1>
  <div class="head">
    <div style="width:55%">
      <table style="width:auto;border:none;margin:0">
        <tr><td style="border:none;padding:2px 20px 2px 0;font-weight:bold">件名</td><td style="border:none;padding:2px 0">${esc(e?.title ?? "")}</td></tr>
        <tr><td style="border:none;padding:2px 20px 2px 0;font-weight:bold">お支払い期限</td><td style="border:none;padding:2px 0">${fmtd(iv.dueOn)}</td></tr>
      </table>
      <div class="kingaku">合計金額　${yen(iv.total)}</div>
    </div>
    <div class="company">
      <div class="nm">${esc(companyName)}</div>
      ${co.postcode ? `〒${esc(co.postcode)}<br>` : ""}${esc([co.prefecture, companyAddr].filter(Boolean).join(""))}<br>${esc(co.tel ?? "")}
    </div>
  </div>

  <div class="note">請求書到着後1週間以内にお振り込み下さい${co.invoice_no ? `<br>適格事業者番号：${esc(co.invoice_no)}` : ""}</div>
  ${bankLine.length ? `<div class="bank"><div class="ttl">【振込先】</div><div class="cols">${bankLine.map((b) => `<span>${esc(b)}</span>`).join("")}</div></div>` : ""}

  <table>
    <thead><tr><th>取引日</th><th>項目名</th><th>数量</th><th>単価</th><th>税抜金額</th><th>税込金額</th></tr></thead>
    <tbody>
      ${itemRows || '<tr><td colspan="6" class="c" style="color:#999">明細なし</td></tr>'}
      <tr class="sep"><td colspan="6">その他オプション、お供えにかかる費用</td></tr>
      <tr><td colspan="4" class="r" style="font-weight:bold">小計</td><td class="r">${yen(itemsExTax)}</td><td class="r">${yen(itemsIncTax)}</td></tr>
    </tbody>
  </table>

  <table class="breakdown">
    <thead><tr><th>内訳</th><th>税込金額</th><th>消費税額</th></tr></thead>
    <tbody><tr><td class="c">10%対象計</td><td class="r">${yen(itemsIncTax)}</td><td class="r">${yen(itemsTax)}</td></tr></tbody>
  </table>

  ${discounts.length ? `
  <table>
    <thead><tr><th>取引日</th><th>割引・返品項目名</th><th>数量</th><th>単価</th><th>税抜金額</th><th>税込金額</th></tr></thead>
    <tbody>${discRows}</tbody>
  </table>
  <table class="breakdown">
    <thead><tr><th>内訳</th><th>税込金額</th><th>消費税額</th></tr></thead>
    <tbody><tr><td class="c">10%対象計</td><td class="r">${yen(grandIncTax)}</td><td class="r">${yen(grandTax)}</td></tr></tbody>
  </table>` : ""}
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
