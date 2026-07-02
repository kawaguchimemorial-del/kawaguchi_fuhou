// オンライン祭壇の額縁（遺影に重ねる透過PNG）。ファイル名＝キーで統一。
// 画像は public/tmp/オンライン祭壇/額縁/png/ に配置（透過維持のためPNGのまま扱う）。

export const FRAME_KEYS = ["黒", "黒リボン", "白", "白花", "グレー", "ピンク", "ブルー"] as const;
export type FrameKey = (typeof FRAME_KEYS)[number];

// 旧仕様の額縁名を現行キーへ寄せる（データ互換）。
const FRAME_ALIAS: Record<string, FrameKey> = {
  "黒(リボン)": "黒リボン",
  "黒（リボン）": "黒リボン",
  "白(花)": "白花",
  "白（花）": "白花",
  紫: "黒", // 素材が無いため黒でフォールバック
};

export function normalizeFrameKey(raw?: string): FrameKey {
  if (!raw) return "黒";
  if ((FRAME_KEYS as readonly string[]).includes(raw)) return raw as FrameKey;
  return FRAME_ALIAS[raw] ?? "黒";
}

// 額縁PNGの公開URL（透過復元済みの public/altar/frame/）。日本語パスはエンコード。
export function frameImageSrc(raw?: string): string {
  const key = normalizeFrameKey(raw);
  return encodeURI(`/altar/frame/${key}.png`);
}
