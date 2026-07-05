import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "スケジュール管理" };
export default function Page() {
  return <KanriStub title="スケジュール管理" items={["予定カレンダー", "打合せ", "シフト（ローテーション）"]} note="施行スケジュール・打合せ・シフトを管理します（Phase6で実装）。" />;
}
