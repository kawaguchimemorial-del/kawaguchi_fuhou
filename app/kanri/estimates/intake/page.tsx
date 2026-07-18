import { EstimateCreateForm } from "@/components/kanri/EstimateCreateForm";

export const metadata = { title: "お客様入力" };
export const dynamic = "force-dynamic";

// タブレットをお客様に渡して、対象者(故人)・顧客・喪主情報を直接入力してもらう画面。
// 「入力完了」を押すと入力内容を保持したまま見積もり作成画面(/kanri/estimates/new)へ進む。
export default function EstimateIntake() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">お客様情報の入力</h1></div>
      <p className="mb-3 text-sm text-gray-600">
        お手数ですが、以下の項目をご入力ください。<br />
        <span className="text-xs text-gray-400">お名前の漢字など、間違いのないようご本人にご入力いただけます。入力後「入力完了」を押してください。</span>
      </p>
      <EstimateCreateForm intakeMode products={[]} productSets={[]} osonae={[]} discounts={[]} memorialServices={[]} purposes={[]} templates={[]} />
    </div>
  );
}
