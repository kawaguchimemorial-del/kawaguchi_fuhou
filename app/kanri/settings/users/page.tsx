import { PageHeader } from "@/components/kanri/PageHeader";
export const metadata = { title: "ユーザー管理" };
export default function UsersPage(){
  const users=[{name:"松澤 覚",role:"管理者",email:"syo.san33@example.com"}];
  return (
    <div className="space-y-4">
      <PageHeader title="ユーザー管理" />
      <p className="text-sm text-gray-500">この葬儀管理ソフトを利用するユーザーと権限を管理します。</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["氏名","権限","メール"].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{users.map(u=>(<tr key={u.name}><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2">{u.role}</td><td className="px-3 py-2 text-gray-500">{u.email}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
