import { AlertTriangle } from "lucide-react";

/**
 * データベースに接続できず、画面がサンプルデータになっている旨の警告。
 * これが出ている間に見えている一覧・件数は実データではないため、
 * 「過去の案件が消えた」と誤解しないよう明示する。
 */
export function DegradedBanner({
  degraded,
  errorMessage,
}: {
  degraded: null | "unconfigured" | "error";
  errorMessage?: string;
}) {
  if (!degraded) return null;

  return (
    <div role="alert" className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle size={18} aria-hidden />
        表示中のデータはサンプルです（実際の葬儀データではありません）
      </p>
      <p className="mt-2 leading-relaxed">
        {degraded === "unconfigured"
          ? "データベースの接続設定がされていないため、サンプルデータを表示しています。"
          : "データベースに接続できないため、サンプルデータを表示しています。実際の葬儀データは消えていません。復旧すると自動的に表示されます。"}
      </p>
      {degraded === "error" && (
        <p className="mt-2 leading-relaxed">
          Supabase の停止（容量・請求超過など）が主な原因です。
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline"
          >
            ダッシュボードで状態を確認 ↗
          </a>
        </p>
      )}
      {errorMessage && (
        <p className="mt-2 break-all font-mono text-xs text-red-700">{errorMessage}</p>
      )}
    </div>
  );
}
