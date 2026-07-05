import { PageHeader } from "@/components/kanri/PageHeader";
export function KanriStub({ title, items, note }: { title: string; items: string[]; note?: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">{note ?? "このモジュールは順次実装します。"}</p>
        {items.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <li key={it} className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">{it}<span className="ml-2 text-xs text-gray-400">準備中</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
