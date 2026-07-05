import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "請求管理" };
export default function Page() {
  return <KanriStub title="請求管理" items={["見積書", "請求書", "入金管理", "領収書", "売掛管理"]} note="見積・請求・入金・領収・売掛を管理します（Phase3〜4で実装）。" />;
}
