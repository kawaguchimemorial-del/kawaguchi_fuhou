/**
 * 端末への保存ユーティリティ（モバイル最適化）
 *
 * 方針:
 * - iPhone(Safari)/Android(Chrome) では `<a download>` が「写真」アプリ等へ確実に
 *   保存できないことがある。そこで Web Share API（ファイル共有）を優先して使い、
 *   OS 標準の共有シートから「画像を保存」できるようにする。
 * - 共有が使えない / 失敗した場合は従来どおり `downloadBlob`（ダウンロード）へフォールバック。
 * - サーバー保存・外部送信は一切行わない（端末内で完結）。すべて呼び出し側で
 *   生成済みの Blob を受け取るだけ。
 */

import { downloadBlob } from "./client-export";

export type SaveResult = "shared" | "downloaded" | "canceled";

type ShareCapableNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

function toFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type || "image/jpeg",
  });
}

/**
 * スマホ / タブレットなどのタッチ端末か。
 *
 * Windows の Edge/Chrome も Web Share API に対応しているため、共有シートを
 * 無条件に使うと PC で「共有」ダイアログが開き、従来のダウンロード保存が
 * できなくなる。共有はタッチ端末に限定し、PC ではダウンロードへ回す。
 */
function isTouchDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  // 細かいポインタ（マウス）が無く、粗いポインタ（指）が主なら端末とみなす。
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const hasTouch = navigator.maxTouchPoints > 0;
  return coarse && hasTouch;
}

/**
 * navigator.share でこれらのファイルを共有できるか。
 * iOS/Android などのタッチ端末でのみ true にし、共有シート経由で端末へ保存する。
 * PC（マウス環境）では false を返し、ダウンロード保存にフォールバックさせる。
 */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  if (!isTouchDevice()) {
    return false;
  }
  const nav = navigator as ShareCapableNavigator;
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") {
    return false;
  }
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * 共有シートを開く。
 * - 成功: "shared"
 * - ユーザーがキャンセル: "canceled"
 * - それ以外の失敗: null（呼び出し側でダウンロードへフォールバック）
 */
async function shareFiles(
  files: File[],
  title: string,
): Promise<SaveResult | null> {
  const nav = navigator as ShareCapableNavigator;
  if (typeof nav.share !== "function") {
    return null;
  }
  try {
    await nav.share({ files, title });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return "canceled";
    }
    return null;
  }
}

/**
 * 画像 1 枚を端末に保存する。
 * モバイル: 共有シート（「画像を保存」で写真アプリへ）。
 * PC/非対応: ダウンロード。
 */
export async function saveImageToDevice(
  blob: Blob,
  filename: string,
): Promise<SaveResult> {
  const file = toFile(blob, filename);
  if (canShareFiles([file])) {
    const result = await shareFiles([file], filename);
    if (result) {
      return result;
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

/**
 * 複数枚の画像を端末に保存する。
 * モバイル: 対応していれば全ファイルを 1 回の共有シートで保存できる。
 * PC/非対応: fallback（通常は ZIP ダウンロード）を実行する。
 */
export async function saveImagesToDevice(
  items: { blob: Blob; filename: string }[],
  fallback: () => Promise<void> | void,
): Promise<SaveResult> {
  const files = items.map((item) => toFile(item.blob, item.filename));
  if (canShareFiles(files)) {
    const result = await shareFiles(files, "遺影写真");
    if (result) {
      return result;
    }
  }
  await fallback();
  return "downloaded";
}
