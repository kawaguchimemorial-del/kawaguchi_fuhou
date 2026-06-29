export function Stub({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-bold">{title}</h1>
      <div className="rounded-lg bg-white p-10 text-center text-gray-400 shadow-sm">
        {note ?? "準備中です。Supabase接続後に表示されます。"}
      </div>
    </div>
  );
}
