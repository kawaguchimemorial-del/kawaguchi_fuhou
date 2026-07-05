import { getEstimate, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";

export const dynamic = "force-dynamic";

function esc(v?: string | number | null): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtd(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }
function fmtdt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${fmtd(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const e = await getEstimate(id);
  if (!e) return new Response("not found", { status: 404 });
  const items = e.items ?? [];
  const rows = items.map((it) => `<tr><td>${esc(it.name)}${it.lineKind === "discount" ? "（値引）" : ""}</td><td class="r">${it.unitPrice.toLocaleString()}</td><td class="c">${it.quantity}</td><td class="c">${Math.round(it.taxRate * 100)}%</td><td class="r">${it.amount.toLocaleString()}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>見積書 ${esc(e.title || "")}</title>
<style>
  @page{size:A4;margin:18mm;} body{font-family:"Noto Sans JP","Yu Gothic",sans-serif;color:#222;font-size:13px;}
  .wrap{max-width:720px;margin:0 auto;}
  h1{text-align:center;font-size:24px;letter-spacing:.4em;margin-bottom:6px;}
  .head{display:flex;justify-content:space-between;margin-top:16px;font-size:12px;}
  .company{text-align:right;}
  table{width:100%;border-collapse:collapse;margin-top:14px;}
  th,td{border:1px solid #999;padding:6px 8px;} th{background:#f0eef5;}
  td.r{text-align:right;} td.c{text-align:center;}
  .total{margin-top:12px;margin-left:auto;width:260px;}
  .total div{display:flex;justify-content:space-between;padding:3px 0;}
  .total .grand{border-top:2px solid #333;font-size:16px;font-weight:bold;padding-top:6px;}
  .info{margin-top:10px;font-size:12px;color:#444;}
</style><script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></head>
<body><div class="wrap">
  <h1>御 見 積 書</h1>
  <div class="head">
    <div>
      <div style="font-size:16px;border-bottom:1px solid #333;padding-bottom:2px;">${esc(mournerFullName(e))} 様</div>
      <div class="info">件名：${esc(e.title || "")}</div>
      <div class="info">故 ${esc(deceasedFullName(e))} 儀${e.deceased.age ? `　享年${e.deceased.age}` : ""}</div>
    </div>
    <div class="company">
      <div>見積日：${fmtd(e.estimateOn) || "—"}</div>
      <div>有効期限：${fmtd(e.estimateLimitOn) || "—"}</div>
      <div style="margin-top:8px;font-weight:bold;">株式会社 川口典礼</div>
    </div>
  </div>
  <div class="info">
    通夜：${fmtdt(e.wakeAt) || "—"}／葬儀：${fmtdt(e.funeralAt) || "—"}<br>
    式場：${esc(e.venueName) || "—"}　火葬場：${esc(e.crematoriumName) || "—"}
  </div>
  <table>
    <thead><tr><th>品名</th><th>単価</th><th>数量</th><th>税率</th><th>金額</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999;">明細なし</td></tr>'}</tbody>
  </table>
  <div class="total">
    <div><span>小計（税抜）</span><span>${e.subtotal.toLocaleString()} 円</span></div>
    <div><span>値引</span><span>-${e.discountTotal.toLocaleString()} 円</span></div>
    <div><span>消費税</span><span>${e.taxTotal.toLocaleString()} 円</span></div>
    <div class="grand"><span>合計（税込）</span><span>${e.total.toLocaleString()} 円</span></div>
    ${e.advancePayment > 0 ? `<div><span>前受金</span><span>${e.advancePayment.toLocaleString()} 円</span></div>` : ""}
  </div>
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
