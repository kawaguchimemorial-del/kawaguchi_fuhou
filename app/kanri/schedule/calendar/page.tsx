import { listEstimates, deceasedFullName } from "@/lib/kanri/estimates";
import { Calendar } from "@/components/kanri/Calendar";
export const metadata = { title: "カレンダー" };
export const dynamic = "force-dynamic";
export default async function CalendarPage(){
  const estimates = await listEstimates();
  const events = estimates.flatMap(e=>{const r:{date:string;label:string;type:string}[]=[]; if(e.wakeAt)r.push({date:e.wakeAt,label:`通夜 ${deceasedFullName(e)}`,type:"通夜"}); if(e.funeralAt)r.push({date:e.funeralAt,label:`葬儀 ${deceasedFullName(e)}`,type:"葬儀"}); return r;});
  return (<div className="space-y-4"><h1 className="text-xl font-bold">カレンダー</h1><Calendar events={events} /></div>);
}
