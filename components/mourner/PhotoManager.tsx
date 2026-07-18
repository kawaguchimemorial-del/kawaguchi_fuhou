"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/image/compress-client";
import { createPhotoUploadUrl, registerPhoto, savePhotoOrder } from "@/lib/mourner/actions";
import { photoPublicUrl } from "@/lib/mourner/storage";

type Photo = { id: string; path: string; caption: string | null; sortOrder: number };

const MAX = 30;

/** 葬儀の写真／アルバム 共通の編集UI。＠葬儀の「追加・並び替え・削除・保存」に相当。 */
export function PhotoManager({
  memorialId,
  kind,
  initial,
}: {
  memorialId: string;
  kind: "funeral" | "album";
  initial: Photo[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const dirty = deleted.length > 0 || photos.some((p, i) => p.sortOrder !== i);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 同じファイルを選び直せるようにする
    if (!files.length) return;
    if (photos.length + files.length > MAX) {
      setMsg({ kind: "err", text: `登録できるのは最大${MAX}枚までです。` });
      return;
    }

    setUploading(true);
    setMsg(null);
    const supabase = createClient();
    try {
      for (const raw of files) {
        // Storage肥大化を防ぐため、アップロード前にブラウザ側で圧縮する
        const file = await compressImageFile(raw);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const signed = await createPhotoUploadUrl(memorialId, kind, ext);
        if (!signed.ok) {
          setMsg({ kind: "err", text: signed.error });
          break;
        }
        const { error } = await supabase.storage
          .from(signed.bucket)
          .uploadToSignedUrl(signed.path, signed.token, file);
        if (error) {
          setMsg({ kind: "err", text: "アップロードに失敗しました: " + error.message });
          break;
        }
        const reg = await registerPhoto(memorialId, kind, signed.path);
        if (!reg.ok) {
          setMsg({ kind: "err", text: reg.error ?? "登録に失敗しました。" });
          break;
        }
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...photos];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setPhotos(next);
  }

  function remove(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    setDeleted((d) => [...d, id]);
  }

  function save() {
    setMsg(null);
    start(async () => {
      const r = await savePhotoOrder(memorialId, kind, photos.map((p) => p.id), deleted);
      if (!r.ok) {
        setMsg({ kind: "err", text: r.error ?? "保存に失敗しました。" });
        return;
      }
      setDeleted([]);
      setPhotos((ps) => ps.map((p, i) => ({ ...p, sortOrder: i })));
      setMsg({ kind: "ok", text: "保存しました。" });
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm text-[#6b6b6b]">最大{MAX}枚まで登録可能です。（現在 {photos.length} 枚）</p>

      {msg && (
        <p role="alert" className={`mb-4 rounded px-3 py-2 text-sm ${
          msg.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <label className={`mb-5 inline-flex cursor-pointer items-center gap-1.5 rounded bg-[#1b2a4a] px-4 py-2.5 text-sm text-white ${
        uploading || photos.length >= MAX ? "pointer-events-none opacity-60" : ""}`}>
        <Plus size={16} /> {uploading ? "アップロード中…" : "追加"}
        <input type="file" accept="image/*" multiple className="hidden"
               onChange={onPick} disabled={uploading || photos.length >= MAX} />
      </label>

      {photos.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8a8a8a]">まだ写真が登録されていません。</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPublicUrl(p.path)} alt="" className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                          aria-label="左へ移動"
                          className="rounded border px-2 py-1 text-xs disabled:opacity-30">
                    <ArrowLeft size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1}
                          aria-label="右へ移動"
                          className="rounded border px-2 py-1 text-xs disabled:opacity-30">
                    <ArrowRight size={14} />
                  </button>
                </div>
                <button type="button" onClick={() => remove(p.id)} aria-label="削除"
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || pending}
                className="rounded bg-[#1b2a4a] px-6 py-2.5 text-sm text-white disabled:opacity-50">
          {pending ? "保存中…" : "保存"}
        </button>
        {dirty && <span className="text-xs text-[#a8842f]">未保存の変更があります</span>}
      </div>
    </section>
  );
}
