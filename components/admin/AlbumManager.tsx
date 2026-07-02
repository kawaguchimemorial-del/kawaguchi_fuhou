"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAlbumUploadUrl, saveVenuePhotos } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/client";

const PHOTO_BUCKET = "product-images"; // 公開読取バケット（album/ 配下）
const MAX_ALBUM = 30;
const MAX_MB = 5;

// 写真管理：最大30枚アップロードし、オンライン式場で公開する（アルバム／葬儀の様子で共用）。
export function AlbumManager({
  slug,
  initialPaths,
  field = "albumPaths",
  lead = "故人の思い出の写真",
  note = "アップロードした写真はオンライン式場のアルバムに表示されます。",
}: {
  slug: string;
  initialPaths: string[];
  field?: "albumPaths" | "scenePaths";
  lead?: string;
  note?: string;
}) {
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function persist(next: string[]) {
    setSaved(false);
    const res = await saveVenuePhotos(slug, field, next);
    if (res.ok) {
      setPaths(res.paths ?? next);
      setSaved(true);
      router.refresh();
    } else {
      setError(res.error ?? "保存に失敗しました。");
    }
  }

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = MAX_ALBUM - paths.length;
    if (room <= 0) {
      setError(`アルバムは最大${MAX_ALBUM}枚までです。`);
      return;
    }
    const targets = files.slice(0, room);
    if (files.length > room) {
      setError(`最大${MAX_ALBUM}枚まで。${files.length - room}枚は追加されませんでした。`);
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const file of targets) {
        if (!["image/jpeg", "image/png"].includes(file.type)) {
          setError("JPGまたはPNG画像のみアップロードできます。");
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`画像は${MAX_MB}MBまでです（${file.name}）。`);
          continue;
        }
        const ext = file.type === "image/png" ? "png" : "jpg";
        const sig = await createAlbumUploadUrl(ext);
        if (!sig.ok || !sig.path || !sig.token || !sig.publicUrl) {
          setError(sig.error ?? "アップロードURLの発行に失敗しました。");
          continue;
        }
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type });
        if (upErr) {
          setError("アップロードに失敗しました: " + upErr.message);
          continue;
        }
        uploaded.push(`${sig.publicUrl}?v=${Date.now()}`);
      }
      if (uploaded.length > 0) await persist([...paths, ...uploaded]);
    } catch (err) {
      setError("アップロード中にエラーが発生しました。" + (err instanceof Error ? `（${err.message}）` : ""));
    } finally {
      setUploading(false);
    }
  }

  async function remove(idx: number) {
    setError(null);
    const next = paths.filter((_, i) => i !== idx);
    setPaths(next);
    await persist(next);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-600">
        {lead}を最大{MAX_ALBUM}枚アップロードできます（JPG / PNG・{MAX_MB}MBまで）。
      </p>
      <p className="mt-1 text-xs text-gray-400">{note}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          className={
            "inline-block cursor-pointer rounded border border-[#9b2fae] px-4 py-2 text-sm text-[#9b2fae] " +
            (uploading || paths.length >= MAX_ALBUM ? "opacity-50" : "")
          }
        >
          {uploading ? "アップロード中…" : "写真を追加"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={onSelect}
            disabled={uploading || paths.length >= MAX_ALBUM}
            className="hidden"
          />
        </label>
        <span className="text-sm text-gray-500">
          {paths.length} / {MAX_ALBUM} 枚
        </span>
        {saved && !error && <span className="text-xs text-green-600">保存しました</span>}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {paths.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400">まだ写真がありません。「写真を追加」からアップロードしてください。</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {paths.map((src, i) => (
            <div key={src} className="group relative aspect-square overflow-hidden rounded border bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`アルバム写真${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={uploading}
                className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-40"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
