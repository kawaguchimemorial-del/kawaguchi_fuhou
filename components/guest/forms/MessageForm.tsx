"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitMessage } from "@/lib/memorial/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function MessageForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const errs: string[] = [];
    const valid: File[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) { errs.push(`${f.name}: 画像ファイルのみ`); continue; }
      if (f.size > MAX_SIZE) { errs.push(`${f.name}: 5MBを超えています`); continue; }
      valid.push(f);
    }
    if (files.length + valid.length > MAX_FILES) errs.push(`画像は最大${MAX_FILES}枚までです`);
    setFiles([...files, ...valid].slice(0, MAX_FILES));
    setErrors((e) => ({ ...e, images: errs.join(" / ") || "" }));
  }

  function removeFile(i: number) {
    setFiles((fs) => fs.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const senderName = String(fd.get("senderName") || "").trim();
    const body = String(fd.get("body") || "").trim();
    const nextErr: Record<string, string> = {};
    if (!senderName) nextErr.senderName = "お名前をご入力ください";
    if (!body) nextErr.body = "メッセージをご入力ください";
    if (Object.keys(nextErr).length) { setErrors(nextErr); return; }

    setPending(true);
    setErrors({});
    try {
      const urls: string[] = [];
      if (files.length) {
        const sb = createClient();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
          const path = `${slug}/${Date.now()}-${i}.${ext}`;
          const { error } = await sb.storage.from("condolence").upload(path, f, { contentType: f.type, upsert: false });
          if (error) throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
          urls.push(sb.storage.from("condolence").getPublicUrl(path).data.publicUrl);
        }
      }
      const payload = new FormData();
      payload.set("slug", slug);
      payload.set("senderName", senderName);
      payload.set("body", body);
      payload.set("imagePaths", JSON.stringify(urls));
      const res = await submitMessage(null, payload);
      if (res.ok) {
        router.push(`/m/${slug}/messages?submitted=1`);
        return;
      }
      setErrors(res.errors);
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : "送信に失敗しました。" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors._form && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{errors._form}</p>
      )}

      <Field label="お名前" name="senderName" error={errors.senderName} required>
        <input id="senderName" name="senderName" type="text" autoComplete="name"
          className="mt-1 w-full border-b border-[var(--border)] bg-transparent py-2 focus:border-[var(--accent)] focus:outline-none" />
      </Field>

      <Field label="メッセージ" name="body" error={errors.body} required>
        <textarea id="body" name="body" rows={6} maxLength={1000}
          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
          placeholder="ご遺族・故人へのお悔やみのお気持ちをお書きください。" />
      </Field>

      {/* 画像アップロード（任意・最大3枚/各5MBまで） */}
      <div>
        <label className="block text-sm text-[var(--muted)]">
          お写真（任意）<span className="ml-2 text-xs">最大{MAX_FILES}枚・各5MBまで</span>
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt={`選択画像${i + 1}`} className="h-20 w-20 rounded object-cover" />
              <button type="button" onClick={() => removeFile(i)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white">×</button>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border border-dashed border-[var(--border)] text-2xl text-[var(--muted)]">
              ＋
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {errors.images && <p className="mt-1 text-sm text-[var(--danger)]">{errors.images}</p>}
      </div>

      <p className="text-xs text-[var(--muted)]">
        ※ お預かりしたメッセージ・お写真は、ご遺族の確認後に式場に公開されます。
      </p>

      <button type="submit" disabled={pending}
        className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60">
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}

function Field({ label, name, error, required, children }: {
  label: string; name: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-[var(--muted)]">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]">必須</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
