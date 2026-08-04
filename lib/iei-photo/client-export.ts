/**
 * ブラウザ内 Canvas での画像書き出しユーティリティ
 *
 * 重要方針:
 * - すべてブラウザ内の Canvas 処理のみ（サーバー・Vercel Functions では処理しない）。
 * - AI 生成・顔再生成・AI 補正は一切行わない。元写真のピクセルをそのまま使用した
 *   トリミング・サイズ変更・配置のみ。
 * - 手札・四つ切り・16:9 は、必ず「基準写真（base canvas）」を親データとして派生させる。
 *
 * このファイルはブラウザでのみ実行される想定です（document / Image / canvas を使用）。
 * モジュール読み込み時には何も実行しないため、SSR / ビルドでも安全です。
 */

import {
  IEI_PHOTO_EXPORT_FILENAMES,
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "./export-sizes";
import { createZipBlob, type ZipEntry } from "./zip";
import { clampAdjustments } from "./adjustments";
import {
  IEI_PHOTO_BACKGROUND_COLOR_GRADIENTS,
  IEI_PHOTO_BACKGROUND_GRADIENT,
  IEI_PHOTO_BACKGROUND_SOLID_COLORS,
  IEI_PHOTO_DEFAULT_BACKGROUND,
  backgroundImageSrc,
  isPhotoBackgroundType,
} from "./backgrounds";
import type {
  IeiPhotoAdjustments,
  IeiPhotoBackgroundSettings,
  IeiPhotoExportKind,
} from "./types";

const JPEG_TYPE = "image/jpeg";
const JPEG_QUALITY = 0.92;

/** 透過 PNG 対策などのための基準背景色（白） */
const BASE_BG_COLOR = "#ffffff";

/**
 * 背景設定に応じて Canvas 全面を塗る／敷く（フィルタ非適用）。
 * - bgImage があれば写真背景を cover で全面に敷く（人物はこの上に合成される）。
 * - 無ければ単色 or 縦方向グラデーション。画像系で未ロード時は白にフォールバック。
 * 人物の描き直しは行わず、背景の塗り/敷きのみ。
 */
function fillBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background?: IeiPhotoBackgroundSettings,
  bgImage?: HTMLImageElement | null,
): void {
  const settings = background ?? IEI_PHOTO_DEFAULT_BACKGROUND;
  ctx.filter = "none";
  if (bgImage) {
    drawCover(
      ctx,
      bgImage,
      bgImage.naturalWidth,
      bgImage.naturalHeight,
      width,
      height,
    );
    return;
  }
  if (settings.type === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, IEI_PHOTO_BACKGROUND_GRADIENT.from);
    gradient.addColorStop(1, IEI_PHOTO_BACKGROUND_GRADIENT.to);
    ctx.fillStyle = gradient;
  } else if (settings.gradient) {
    const colors = IEI_PHOTO_BACKGROUND_COLOR_GRADIENTS[settings.type];
    if (colors) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, colors.from);
      gradient.addColorStop(1, colors.to);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = BASE_BG_COLOR;
    }
  } else if (isPhotoBackgroundType(settings.type)) {
    // 写真背景なのに画像が未ロード（読み込み失敗等）の場合は白で代替。
    ctx.fillStyle = BASE_BG_COLOR;
  } else {
    ctx.fillStyle = IEI_PHOTO_BACKGROUND_SOLID_COLORS[settings.type];
  }
  ctx.fillRect(0, 0, width, height);
}

/** 背景画像のキャッシュ（同一 URL の再読み込みを防ぐ）。 */
const backgroundImageCache = new Map<string, HTMLImageElement>();

/**
 * 背景設定と向きに対応する写真背景画像を読み込む（写真系以外は null）。
 * 読み込み失敗時は null を返し、呼び出し側は単色フォールバックする（throw しない）。
 */
export async function resolveBackgroundImage(
  background: IeiPhotoBackgroundSettings | undefined,
  orientation: "vertical" | "wide",
): Promise<HTMLImageElement | null> {
  const settings = background ?? IEI_PHOTO_DEFAULT_BACKGROUND;
  const src = backgroundImageSrc(settings, orientation);
  if (!src) {
    return null;
  }
  const cached = backgroundImageCache.get(src);
  if (cached) {
    return cached;
  }
  try {
    const img = await loadImageElement(src);
    backgroundImageCache.set(src, img);
    return img;
  } catch {
    return null;
  }
}

/** 画像 URL（ObjectURL など）から HTMLImageElement を読み込む。 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("画像の読み込みに失敗しました。別の画像でお試しください。"));
    img.decoding = "async";
    img.src = src;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("出力サイズが不正です。");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas の描画コンテキストを取得できませんでした。");
  }
  // 拡大・縮小時の品質を確保
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** 中央基準のトリミング（cover: 描画先を埋め、はみ出しは切り取る）。 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): void {
  if (!srcWidth || !srcHeight) {
    throw new Error("画像サイズを取得できませんでした。");
  }
  const scale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (destWidth - drawWidth) / 2;
  const dy = (destHeight - drawHeight) / 2;
  ctx.drawImage(src, dx, dy, drawWidth, drawHeight);
}

/**
 * 中央 cover に zoom / offset を加味して描画する（手動トリミング）。
 * - zoom 100 は cover と同じ。100 未満で縮小、100 超で拡大。
 * - offsetX / offsetY は描画先サイズに対するパーセント移動（中央=0）。
 * - 画像外が見える部分は、呼び出し側で塗った背景色で埋まる。
 */
function drawAdjustedCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): void {
  if (!srcWidth || !srcHeight) {
    throw new Error("画像サイズを取得できませんでした。");
  }
  const baseScale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
  const scale = baseScale * (zoom / 100);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (destWidth - drawWidth) / 2 + (offsetX / 100) * destWidth;
  const dy = (destHeight - drawHeight) / 2 + (offsetY / 100) * destHeight;
  ctx.drawImage(src, dx, dy, drawWidth, drawHeight);
}

function sourceSize(
  image: HTMLImageElement | HTMLCanvasElement,
): { width: number; height: number } {
  if (image instanceof HTMLImageElement) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  return { width: image.width, height: image.height };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("画像の書き出しに失敗しました。"));
          }
        },
        JPEG_TYPE,
        JPEG_QUALITY,
      );
    } catch {
      reject(
        new Error(
          "画像の書き出し中にエラーが発生しました。画像が大きすぎる可能性があります。",
        ),
      );
    }
  });
}

/**
 * 読み込み済み画像から「基準写真」（縦長 3:4）の Canvas を作成する（同期処理）。
 *
 * - 明るさ / コントラスト / 彩度は CanvasRenderingContext2D.filter で適用し、描画後に必ず reset する。
 * - zoom / offsetX / offsetY を中央 cover に加味して手動トリミングする。
 * - 画像外が見える部分は背景色（白）で埋める。AI で背景生成はしない。
 * - 元写真のピクセルをそのまま使用し、顔・肌・髪・服などの描き直しは行わない。
 *
 * @param img 読み込み済みの画像要素
 * @param adjustments 手動補正値（範囲外はクランプ、未指定は無補正）
 * @returns 基準写真の Canvas（以降の派生処理の親データ）
 */
export function renderBasePhotoCanvas(
  img: HTMLImageElement,
  adjustments?: Partial<IeiPhotoAdjustments>,
  background?: IeiPhotoBackgroundSettings,
  bgImage?: HTMLImageElement | null,
): HTMLCanvasElement {
  const a = clampAdjustments(adjustments);
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.base.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);

  // 背景はフィルタ非適用で塗る／敷く（選択した背景を反映。人物切り抜きはしない）。
  fillBackground(ctx, width, height, background, bgImage);

  // 明るさ・コントラスト・彩度を適用して描画。
  ctx.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
  drawAdjustedCover(
    ctx,
    img,
    img.naturalWidth,
    img.naturalHeight,
    width,
    height,
    a.zoom,
    a.offsetX,
    a.offsetY,
  );

  // フィルタが他描画に残らないよう必ず reset する。
  ctx.filter = "none";
  return canvas;
}

/**
 * アップロード画像（File / ObjectURL）から基準写真 Canvas を作成する。
 * 画像読み込み → renderBasePhotoCanvas を行う非同期ヘルパー。
 *
 * @param source File または ObjectURL 文字列
 * @param adjustments 手動補正値
 * @returns 基準写真の Canvas（以降の派生処理の親データ）
 */
export async function createBasePhotoFromImage(
  source: File | string,
  adjustments?: Partial<IeiPhotoAdjustments>,
  background?: IeiPhotoBackgroundSettings,
): Promise<HTMLCanvasElement> {
  const ownsUrl = typeof source !== "string";
  const url = ownsUrl ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImageElement(url);
    // 基準写真（縦）に焼き込む写真背景を読み込む（写真系以外は null）。
    const bgImage = await resolveBackgroundImage(background, "vertical");
    return renderBasePhotoCanvas(img, adjustments, background, bgImage);
  } finally {
    // 自前で作成した ObjectURL のみ解放（呼び出し側所有の URL は解放しない）。
    if (ownsUrl) {
      URL.revokeObjectURL(url);
    }
  }
}

/** 基準写真そのものを JPEG 出力する。 */
export async function exportBaseFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  return canvasToJpegBlob(base);
}

/** 基準写真から手札サイズ（縦長, cover）を書き出す。 */
export async function exportTesatsuFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.tesatsu.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.fillStyle = BASE_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, base, base.width, base.height, width, height);
  return canvasToJpegBlob(canvas);
}

/** 基準写真から四つ切りサイズ（縦長, cover）を書き出す。 */
export async function exportYotsugiriFromBase(
  base: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.yotsugiri.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.fillStyle = BASE_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, base, base.width, base.height, width, height);
  return canvasToJpegBlob(canvas);
}

/**
 * 16:9 モニター用の親画像を作る。
 *
 * 経緯: もともとは横長をAIに生成させていたが、gpt-image は mask を渡しても画像全体を
 * 描き直すため、中央の人物まで作り替えられ、実データで別人が出力された（2026-08-04）。
 * そこで、人物にはAIを一切触らせず、ブラウザ内で組み立てる方式にした。
 *
 * 作り方:
 *   1. 縦写真の左端・右端の帯を、そのまま左右へ引き伸ばして背景にする。
 *      背景が単色・グラデーションならそのまま連続し、情景系でも色と明るさが途切れない。
 *      （以前は写真全体をぼかして敷いていたため、左右に人物の影がぼんやり出て不自然だった）
 *   2. 中央に縦写真を原寸比で置く。左右の端だけ薄くぼかしてつなぐので、継ぎ目が見えない。
 * 人物は縦写真のピクセルそのままなので、別人化は起こらない。
 */
export async function exportMonitor169FromBase(
  base: HTMLCanvasElement,
  background?: IeiPhotoBackgroundSettings,
): Promise<Blob> {
  return canvasToJpegBlob(renderMonitor169Canvas(base, background));
}

/**
 * 縦写真の上部左右の隅から、実際の背景色を読み取る。
 * 遺影の構図では上の隅はほぼ確実に背景なので、人物の色を拾わずに済む。
 * 単調にならないよう、下側はわずかに沈めた色を返す。
 */
function sampleTopCornersColor(
  base: HTMLCanvasElement,
): { top: string; bottom: string } | null {
  try {
    const ctx = base.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const w = Math.max(1, Math.round(base.width * 0.08));
    const h = Math.max(1, Math.round(base.height * 0.06));
    const patches = [
      ctx.getImageData(0, 0, w, h).data,
      ctx.getImageData(base.width - w, 0, w, h).data,
    ];
    let r = 0, g = 0, b = 0, n = 0;
    for (const d of patches) {
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    }
    if (!n) return null;
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    const dim = (v: number) => Math.max(0, Math.round(v * 0.94));
    return {
      top: `rgb(${r}, ${g}, ${b})`,
      bottom: `rgb(${dim(r)}, ${dim(g)}, ${dim(b)})`,
    };
  } catch {
    // 別オリジンの画像が混ざると getImageData が失敗する。その場合は選んだ背景で塗る。
    return null;
  }
}

/** 16:9 親画像の描画本体（ZIP・プレビュー・各サイズの派生元で共用する）。 */
export function renderMonitor169Canvas(
  base: HTMLCanvasElement,
  background?: IeiPhotoBackgroundSettings,
): HTMLCanvasElement {
  const { width, height } = IEI_PHOTO_EXPORT_SIZES.monitor169.pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);

  const bw = base.width;
  const bh = base.height;
  // 縦写真は上下を切らずに高さいっぱいに置く（頭や胸元が欠けないようにする）。
  const scale = height / bh;
  const pw = Math.round(bw * scale);
  const px = Math.round((width - pw) / 2);

  // 1) 左右も含めた全面の背景。
  //    写真の端を引き伸ばす方法は、端に花束や服がかかっていると横に伸びて汚れたため不採用。
  //    選んだ背景で塗るだけだと、AIが実際に描いた背景と色がずれて縦の継ぎ目が見えたため、
  //    まず「写真そのものの上の左右隅」から実際の背景色を読み取り、それで塗る。
  //    読み取れないときだけ、選んだ背景の色にフォールバックする。
  const sampled = sampleTopCornersColor(base);
  if (sampled) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, sampled.top);
    g.addColorStop(1, sampled.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  } else {
    fillBackground(ctx, width, height, background);
  }

  // 2) 中央に縦写真。左右の端だけ透明へ落として、背景となじませる。
  // ぼかし幅。狭いと縦の継ぎ目が線として見える。実データで確認し、写真幅の12%とした。
  const feather = Math.max(8, Math.round(pw * 0.12));
  const center = createCanvas(pw, height);
  const cctx = get2dContext(center);
  cctx.drawImage(base, 0, 0, bw, bh, 0, 0, pw, height);
  const fade = cctx.createLinearGradient(0, 0, pw, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(feather / pw, "rgba(0,0,0,1)");
  fade.addColorStop(1 - feather / pw, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  cctx.globalCompositeOperation = "destination-in";
  cctx.fillStyle = fade;
  cctx.fillRect(0, 0, pw, height);
  cctx.globalCompositeOperation = "source-over";
  ctx.drawImage(center, px, 0);

  // 3) ごく弱いビネット（祭壇モニタとして人物を引き立てる）。
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.38,
    width / 2,
    height / 2,
    width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

export function renderWideMasterCanvas(
  wideMaster: HTMLImageElement | HTMLCanvasElement,
  adjustments: Partial<IeiPhotoAdjustments> | undefined,
  kind: IeiPhotoExportKind,
): HTMLCanvasElement {
  const a = clampAdjustments(adjustments);
  const { width, height } = IEI_PHOTO_EXPORT_SIZES[kind].pixelGuide;
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  const src = sourceSize(wideMaster);

  ctx.fillStyle = BASE_BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;

  if (kind === "monitor169") {
    drawCover(ctx, wideMaster, src.width, src.height, width, height);
  } else {
    drawAdjustedCover(
      ctx,
      wideMaster,
      src.width,
      src.height,
      width,
      height,
      a.zoom,
      a.offsetX,
      a.offsetY,
    );
  }

  ctx.filter = "none";
  return canvas;
}

export async function exportFromWideMasterByKind(
  wideMaster: HTMLImageElement | HTMLCanvasElement,
  adjustments: Partial<IeiPhotoAdjustments> | undefined,
  kind: IeiPhotoExportKind,
): Promise<Blob> {
  return canvasToJpegBlob(renderWideMasterCanvas(wideMaster, adjustments, kind));
}

/**
 * 種別に応じて基準写真から派生 Blob を生成する。
 * 未AI生成時は基準写真（縦・背景焼き込み済み）から派生する。
 * AI生成後は renderWideMasterCanvas / exportFromWideMasterByKind を使い、
 * 16:9親画像から手札・四つ切りも切り出す。
 */
export async function exportFromBaseByKind(
  base: HTMLCanvasElement,
  kind: IeiPhotoExportKind,
  background?: IeiPhotoBackgroundSettings,
): Promise<Blob> {
  switch (kind) {
    case "base":
      return exportBaseFromBase(base);
    case "tesatsu":
      return exportTesatsuFromBase(base);
    case "yotsugiri":
      return exportYotsugiriFromBase(base);
    case "monitor169":
      return exportMonitor169FromBase(base, background);
    default: {
      // 網羅性チェック
      const _exhaustive: never = kind;
      throw new Error(`未知の出力種別です: ${String(_exhaustive)}`);
    }
  }
}

/** 種別に対応する出力ファイル名を返す。 */
export function filenameForKind(kind: IeiPhotoExportKind): string {
  return IEI_PHOTO_EXPORT_FILENAMES[kind];
}

/**
 * すべての出力サイズを1つの ZIP にまとめて返す（単一ダウンロード）。
 * 複数ファイルの連続ダウンロードはブラウザにブロックされやすいため、
 * 一括ダウンロードは ZIP 化して単一ダウンロードにする。中身は各サイズの JPEG。
 */
export async function exportAllZipFromBase(
  base: HTMLCanvasElement,
  background?: IeiPhotoBackgroundSettings,
): Promise<Blob> {
  const entries: ZipEntry[] = [];
  for (const kind of IEI_PHOTO_EXPORT_ORDER) {
    const blob = await exportFromBaseByKind(base, kind, background);
    const data = new Uint8Array(await blob.arrayBuffer());
    entries.push({ name: filenameForKind(kind), data });
  }
  return createZipBlob(entries);
}

export async function exportAllZipFromWideMaster(
  wideMaster: HTMLImageElement | HTMLCanvasElement,
  adjustments: Partial<IeiPhotoAdjustments> | undefined,
): Promise<Blob> {
  const entries: ZipEntry[] = [];
  for (const kind of IEI_PHOTO_EXPORT_ORDER) {
    const blob = await exportFromWideMasterByKind(wideMaster, adjustments, kind);
    const data = new Uint8Array(await blob.arrayBuffer());
    entries.push({ name: filenameForKind(kind), data });
  }
  return createZipBlob(entries);
}

/**
 * Blob をダウンロードさせる。
 * 生成した ObjectURL はダウンロード開始後に解放する。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // クリック直後にアンカー削除/URL解放を行うと、ブラウザによっては
  // ダウンロードが中断される（特に連続ダウンロードの2件目以降）。
  // ダウンロードが確定するまで少し待ってから後始末する。
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}
