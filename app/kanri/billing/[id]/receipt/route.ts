import { getInvoice } from "@/lib/kanri/invoices";
import { deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
export const dynamic = "force-dynamic";
function esc(v?: string|number|null){ return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function fmt(iso?: string){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`; }
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }){
  const { id } = await ctx.params;
  const res = await getInvoice(id);
  if(!res) return new Response("not found",{status:404});
  const { invoice: iv, estimate: e } = res;
  const name = e ? mournerFullName(e) : "";
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>領収書</title>
<style>@page{size:A4 landscape;margin:20mm;}body{font-family:"Noto Serif JP",serif;color:#222;}
.wrap{max-width:700px;margin:0 auto;border:2px solid #333;padding:30px;}
h1{text-align:center;letter-spacing:.5em;font-size:28px;margin:0 0 20px;}
.amount{text-align:center;font-size:32px;font-weight:bold;border-bottom:2px solid #333;padding:8px 0;margin:16px 0;}
.row{margin:10px 0;font-size:15px;} .company{text-align:right;margin-top:24px;font-weight:bold;}
</style><script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></head>
<body><div class="wrap">
<h1>領 収 書</h1>
<div class="row">${esc(name)} 様</div>
<div class="amount">金 ${iv.paidTotal>0?iv.paidTotal.toLocaleString():iv.total.toLocaleString()} 円也</div>
<div class="row">但し　故 ${esc(e?deceasedFullName(e):"")} 儀 葬儀費用として</div>
<div class="row">上記正に領収いたしました。</div>
<div class="row">発行日：${fmt(iv.billedOn)||fmt(new Date().toISOString())}</div>
<div class="company">株式会社 川口典礼</div>
</div></body></html>`;
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}});
}
