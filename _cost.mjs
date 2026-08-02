// 実際のAPI応答に含まれる usage を読み、トークン数を実測する
import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")]}));
const key=env.OPENAI_API_KEY, model=env.OPENAI_IMAGE_MODEL||"gpt-image-2";
const img = new File([fs.readFileSync("tmp/hair-src.jpg")], "input.jpg", {type:"image/jpeg"});
const cloth = new File([fs.readFileSync("public/iei-clothing/male_casual_04.webp")], "clothing.webp", {type:"image/webp"});
async function run(label, fidelity, withCloth){
  const f=new FormData();
  f.append("model",model);
  if(withCloth){ f.append("image[]",img); f.append("image[]",cloth); } else { f.append("image",img); }
  f.append("prompt","遺影写真として自然に整えてください。顔・髪型はそのまま。");
  if(fidelity) f.append("input_fidelity",fidelity);
  f.append("n","1"); f.append("output_format","png"); f.append("quality","high"); f.append("size","1024x1536");
  const t=Date.now();
  const r=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:f,signal:AbortSignal.timeout(280000)});
  const j=await r.json();
  if(!r.ok){ console.log(label,"ERR",r.status,JSON.stringify(j.error?.message||j).slice(0,200)); return; }
  console.log(label, JSON.stringify(j.usage), `${((Date.now()-t)/1000).toFixed(0)}秒`);
}
await run("[細部あり 1枚]","high",false);
await run("[細部なし 1枚]",null,false);
await run("[細部あり 服見本つき]","high",true);
await run("[細部なし 服見本つき]",null,true);
