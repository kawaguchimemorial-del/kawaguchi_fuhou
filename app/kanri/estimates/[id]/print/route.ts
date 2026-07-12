import { getEstimate, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { getCustomer } from "@/lib/kanri/data";
import { breakdownRows, hasReduced, lineIncTax } from "@/lib/kanri/print-breakdown";
import { KAKUIN_DATA_URL } from "@/lib/kanri/kakuin";
import { LOGO_DATA_URL } from "@/lib/kanri/logo";

export const dynamic = "force-dynamic";

function esc(v?: string | number | null): string { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function fmtd(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }
function yen(n: number) { return `${n.toLocaleString()}円`; }
function neg(n: number) { return `▲${Math.abs(n).toLocaleString()}円`; }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const e = await getEstimate(id);
  if (!e) return new Response("not found", { status: 404 });
  const cust = e.customerId ? await getCustomer(e.customerId) : null;
  const hasEmail = !!cust?.email;
  const co = await getCompanyInfo();
  const companyName = co.company_name || "株式会社 川口典礼";
  const companyAddr = [co.prefecture, co.address_city, co.address_street, co.address_building].filter(Boolean).join("");
  // 「請求書に非表示」はセット内訳・オプションを問わず印刷から除外。セット内訳は数値なしでグループ表示。
  // 割引・返品の分類は lineKind で行う(符号判定はしない)。各行の税率を保持し税率別内訳へ反映。
  const items = (e.items ?? []).filter((it) => it.lineKind === "item" && !it.hiddenPaper);
  const discounts = (e.items ?? []).filter((it) => it.lineKind === "discount");
  const on = fmtd(e.estimateOn) || fmtd(e.createdAt);
  const withTax = (amt: number, rate: number) => lineIncTax(amt, rate);
  const mournerAddr = [e.addresseePrefecture ?? e.mourner.prefecture, e.addresseeCity ?? e.mourner.addressCity, e.addresseeStreet ?? e.mourner.addressStreet, e.addresseeBuilding ?? e.mourner.addressBuilding].filter(Boolean).join("");
  // 宛名: 宛名情報 → 喪主 → 顧客名 の順で解決(移植データは宛名/顧客のみのことがある)
  const toName = [e.addresseeLastName, e.addresseeFirstName].filter(Boolean).join(" ") || mournerFullName(e) || e.customerName || "";
  const honorific = e.addresseeHonorific ?? "様";
  const staffName = e.staffName ?? "";
  const telFmt = (t?: string) => {
    const d = (t || "").replace(/[^0-9]/g, "");
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    return t || "";
  };

  // 税率別内訳用の行データ(税抜=amount, 税込=行確定値)
  const toBd = (it: { taxRate: number; amount: number }) => ({ taxRate: it.taxRate, amount: it.amount, incTax: lineIncTax(it.amount, it.taxRate) });
  const itemBd = items.map(toBd);
  const discBd = discounts.map(toBd);
  const reduced = hasReduced([...itemBd, ...discBd]); // 8%(軽減税率)の有無
  const itemsExTax = items.reduce((a, it) => a + it.amount, 0);
  const itemsIncTax = itemBd.reduce((a, it) => a + it.incTax, 0);
  const discExTax = discounts.reduce((a, it) => a + it.amount, 0); // 負
  const discIncTax = discBd.reduce((a, it) => a + it.incTax, 0);

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
    const mk = Math.abs(it.taxRate - 0.08) < 0.005 ? "● " : "";
    itemRows += `<tr>
    <td>${on}</td><td class="l">${mk}${esc(it.name)}</td><td class="c">${it.quantity}</td>
    <td class="r">${yen(it.unitPrice)}</td><td class="r">${yen(it.amount)}</td><td class="r">${yen(withTax(it.amount, it.taxRate))}</td></tr>`;
  }
  if (inSetGroup) itemRows += `<tr class="setmark"><td colspan="6">【ここまでセットに含まれる】</td></tr>`;
  const discRows = discounts.map((it) => {
    const mk = Math.abs(it.taxRate - 0.08) < 0.005 ? "●" : "";
    return `<tr>
    <td>${on}</td><td class="l">▲${mk}${esc(it.name)}</td><td class="c">${it.quantity}</td>
    <td class="r">${neg(it.unitPrice)}</td><td class="r">${neg(it.amount)}</td><td class="r">${neg(withTax(it.amount, it.taxRate))}</td></tr>`;
  }).join("");
  const discSubtotal = `<tr><td colspan="4" class="r" style="font-weight:bold">小計</td><td class="r">${neg(discExTax)}</td><td class="r">${neg(discIncTax)}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>お見積書 ${esc(toName)}</title>
<style>
  @page{size:A4;margin:12mm;} body{font-family:"Noto Sans JP","Yu Gothic",sans-serif;color:#222;font-size:12px;}
  .toolbar{position:fixed;top:6px;left:6px;display:flex;gap:8px;z-index:50;} @media print{.toolbar{display:none;}}
  .toolbar button{padding:8px 16px;font-size:14px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;}
  .toolbar button.mail{background:#2c8c6f;color:#fff;border-color:#2c8c6f;}
  .toolbar button:disabled{opacity:.5;cursor:not-allowed;}
  .head{display:flex;justify-content:space-between;}
  h1{text-align:center;font-size:22px;letter-spacing:.3em;margin:6px 0 18px;}
  .addr{font-size:11px;color:#555;} .to{font-size:18px;margin-top:4px;}
  .company{text-align:left;font-size:11px;position:relative;display:flex;align-items:flex-start;gap:6px;} .company .nm{font-weight:bold;font-size:13px;}
  .company .cbody{flex:1;} .company .tantou{margin-top:2px;}
  .company .clogo{width:15mm;height:auto;display:block;margin-bottom:2px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .company .cseal{width:18mm;height:18mm;object-fit:contain;margin-top:2px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .kingaku{font-size:22px;font-weight:bold;border-bottom:2px solid #333;padding-bottom:6px;margin:6px 0 16px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #999;padding:5px 7px;}
  th{background:#eee;text-align:center;} td.r{text-align:right;} td.c{text-align:center;} td.l{text-align:left;}
  .sep td{background:#eee;text-align:center;font-weight:bold;}
  .setmark td{background:#f7f7f7;font-weight:bold;font-size:11px;color:#555;}
  .breakdown{width:66%;margin-left:auto;margin-top:8px;}
  .sign{width:40%;margin-top:24px;margin-left:auto;}
  .note{text-align:right;font-size:11px;color:#666;margin-top:6px;}
</style></head>
<body>
  <div class="toolbar" data-html2canvas-ignore="true">
    <button onclick="window.print()">印刷</button>
    <button class="mail" id="mailBtn" onclick="sendMail()" ${hasEmail ? "" : "disabled title=\"顧客にメールアドレスが登録されていません\""}>${hasEmail ? "メール送信" : "メール送信（未登録）"}</button>
  </div>
  <div class="head">
    <div style="width:60%">
      <div class="addr">${esc(mournerAddr)}</div>
      <div class="to">${esc(toName)}${toName ? ` ${esc(honorific)}` : ""}</div>
    </div>
    <div style="text-align:right;font-size:11px">
      見積書番号 ${esc(e.estimateNo ?? "")}<br>見積日 ${on}
    </div>
  </div>
  <h1>お見積書</h1>
  <div class="head">
    <div style="width:55%">
      <table style="width:auto;border:none;margin:0"><tr><td style="border:none;padding:2px 20px 2px 0;font-weight:bold">件名</td><td style="border:none;padding:2px 0">${esc(e.title ?? "")}</td></tr></table>
      <div class="kingaku">合計金額　${yen(e.total)}</div>
    </div>
    <div class="company">
      <div class="cbody">
        <img class="clogo" src="${LOGO_DATA_URL}" alt="ロゴ">
        <div class="nm">${esc(companyName)}</div>
        ${co.postcode ? `〒${esc(co.postcode)}<br>` : ""}${esc(companyAddr)}<br>${co.tel ? `TEL: ${esc(telFmt(co.tel))}` : ""}
        ${staffName ? `<div class="tantou">担当：${esc(staffName)}</div>` : ""}
      </div>
      <img class="cseal" src="${KAKUIN_DATA_URL}" alt="社印">
    </div>
  </div>

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
    <tbody>${breakdownRows(itemBd, yen)}</tbody>
  </table>

  ${discounts.length ? `
  <table>
    <thead><tr><th>取引日</th><th>割引・返品項目名</th><th>数量</th><th>単価</th><th>税抜金額</th><th>税込金額</th></tr></thead>
    <tbody>${discRows}${discSubtotal}</tbody>
  </table>
  <table class="breakdown">
    <thead><tr><th>内訳</th><th>税込金額</th><th>消費税額</th></tr></thead>
    <tbody>${breakdownRows([...itemBd, ...discBd], yen)}</tbody>
  </table>` : ""}

  ${reduced ? `<div class="note">● 軽減税率(8%)対象</div>` : ""}
  <div style="text-align:center;margin-top:8px;font-weight:bold">摘要</div>
  <div style="min-height:24px;border-bottom:1px solid #ccc">${esc(e.memo ?? "")}</div>

  <table class="sign">
    <tr><th style="width:6em">署名日</th><td></td></tr>
    <tr><th>喪主様サイン</th><td style="height:40px"></td></tr>
    <tr><th>施主サイン</th><td style="height:40px"></td></tr>
  </table>
  <script src="/vendor/html2canvas.min.js"></script>
  <script src="/vendor/jspdf.umd.min.js"></script>
  <script>
  async function sendMail(){
    var btn=document.getElementById('mailBtn'); if(!btn||btn.disabled) return;
    var old=btn.textContent; btn.disabled=true; btn.textContent='作成中…';
    try{
      var canvas=await html2canvas(document.body,{scale:2,backgroundColor:'#ffffff',windowWidth:document.body.scrollWidth});
      var img=canvas.toDataURL('image/jpeg',0.92);
      var jsPDF=window.jspdf.jsPDF, pdf=new jsPDF('p','mm','a4');
      var pw=210, ph=297, iw=pw, ih=canvas.height*pw/canvas.width;
      if(ih<=ph){ pdf.addImage(img,'JPEG',0,0,iw,ih); }
      else { var page=0, rem=ih; while(rem>0){ if(page>0) pdf.addPage(); pdf.addImage(img,'JPEG',0,-(ph*page),iw,ih); rem-=ph; page++; } }
      var dataUrl=pdf.output('datauristring');
      btn.textContent='送信中…';
      var res=await fetch('./send-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pdfBase64:dataUrl})});
      var d=await res.json().catch(function(){return{ok:false,error:'応答が不正です'};});
      if(d.ok){ alert('メールを送信しました: '+(d.to||'')); } else { alert('送信できませんでした\\n'+(d.error||'')); }
    }catch(err){ alert('エラー: '+err); }
    finally{ btn.disabled=false; btn.textContent=old; }
  }
  </script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
