export function KanriStub({ title, items, note }: { title: string; items: string[]; note?: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">{title}</h1>
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
