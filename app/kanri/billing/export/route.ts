import { listInvoices, INVOICE_STATUS_LABEL } from "@/lib/kanri/invoices";
export const dynamic = "force-dynamic";
const COLS=["請求日","故人","喪主","請求額","入金額","残高","ステータス"];
function esc(v:string|number|null|undefined){const s=String(v??"");return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function fmt(iso?:string){if(!iso)return"";const d=new Date(iso);if(isNaN(d.getTime()))return"";return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;}
export async function GET(){
  const rows=await listInvoices();
  const lines=[COLS.join(",")];
  for(const i of rows) lines.push([fmt(i.billedOn),i.deceasedName,i.mournerName,i.total,i.paidTotal,i.total-i.paidTotal,INVOICE_STATUS_LABEL[i.status]??i.status].map(esc).join(","));
  return new Response("﻿"+lines.join("\r\n")+"\r\n",{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="invoices.csv"'}});
}
