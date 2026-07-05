import { listProducts } from "@/lib/kanri/products";
export const dynamic = "force-dynamic";
const COLS=["商品種別","商品名","カナ","単価","原価","税率","単位","発注先","備考"];
function esc(v:string|number|null|undefined){const s=String(v??"");return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
export async function GET(){
  const rows=await listProducts();
  const lines=[COLS.join(",")];
  for(const p of rows) lines.push([p.productKind,p.name,p.kana,p.unitPrice,p.costPrice,p.taxRate,p.unit,p.supplier,p.note].map(esc).join(","));
  return new Response("﻿"+lines.join("\r\n")+"\r\n",{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="products.csv"'}});
}
