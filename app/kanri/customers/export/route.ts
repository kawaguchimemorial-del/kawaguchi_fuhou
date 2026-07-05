import { listCustomers } from "@/lib/kanri/data";
export const dynamic = "force-dynamic";
const COLS = ["顧客番号","氏","名","セイ","メイ","ステータス","流入経路","性別","生年月日","自宅番号","携帯番号","メールアドレス","郵便番号","都道府県","市区町村","番地","建物名","備考","登録日時"];
function esc(v: string|number|null|undefined){ const s=String(v??""); return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function fmt(iso?: string){ if(!iso)return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; const p=(n:number)=>String(n).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
export async function GET(){
  const rows = await listCustomers();
  const lines = [COLS.join(",")];
  for(const c of rows){
    lines.push([c.customerNo,c.lastName,c.firstName,c.lastNameKana,c.firstNameKana,c.status,c.inflow,c.gender,c.birthDate,c.telephoneNumber,c.mobileNumber,c.email,c.postcode,c.prefectureCode,c.addressCity,c.addressStreet,c.addressBuilding,c.note,fmt(c.createdAt)].map(esc).join(","));
  }
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  return new Response(csv, { headers: { "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":'attachment; filename="customers.csv"' } });
}
