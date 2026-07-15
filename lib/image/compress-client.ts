"use client";

// クライアント側で画像を縮小・圧縮してからアップロードするための共通処理。
// 長辺を maxEdge に収め、JPEG(quality) へ再エンコードして Storage 容量の肥大化を防ぐ。
// ブラウザ内(canvas)で完結するため追加依存なし。移植済みデータと同じ「長辺2048/品質80前後」を新規アップロードにも適用する。
export async function compressImageFile(
  file: File,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 2048;
  const quality = opts.quality ?? 0.82;

  // 画像以外・GIF(アニメ)・SVGは変換せずそのまま返す
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    // EXIF の向き情報を焼き込む（スマホ写真が横倒しになるのを防ぐ）
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // デコードできなければ元ファイルを使う
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // 透過PNGをJPEG化すると透過部が黒くなるため、白で下地を敷く
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  // 変換に失敗、または圧縮しても小さくならない場合は元ファイルを使う
  if (!blob || blob.size >= file.size) {
    return file;
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
}
