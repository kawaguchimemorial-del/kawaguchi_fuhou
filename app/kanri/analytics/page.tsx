import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "分析" };
export default function Page() {
  return <KanriStub title="分析" items={["売上分析", "顧客登録推移", "営業日報"]} note="売上・顧客・営業の分析（Phase6で実装）。" />;
}
