// オンライン祭壇の各レイヤー素材（透過PNG）。設定値→画像パスの対応。
// 素材は public/tmp/オンライン祭壇/ 配下に配置（透過維持のためPNGのまま参照）。

// 透過復元済みの素材（public/altar/）。元素材は public/tmp/オンライン祭壇/。
const BASE = "/altar";

// 日本語パスはブラウザ用にエンコードして返す。
function src(rel: string): string {
  return encodeURI(`${BASE}/${rel}`);
}

/* ===== 背景 ===== */
const BG_FILE: Record<string, string> = {
  七宝: "七宝",
  菊: "菊",
  波: "波",
  "ドレープ(ベージュ)": "ドレープベージュ",
  "ドレープ（ベージュ）": "ドレープベージュ",
  ドレープベージュ: "ドレープベージュ",
  "ドレープ(ピンク)": "ドレープピンク",
  "ドレープ（ピンク）": "ドレープピンク",
  ドレープピンク: "ドレープピンク",
};
export function backgroundSrc(key?: string): string {
  return src(`bg/${BG_FILE[key ?? ""] ?? "七宝"}.png`);
}

/* ===== 天板 ===== */
const TOP_FILE: Record<string, string> = { 黒: "黒", 木目: "木目" };
export function topSrc(key?: string): string {
  return src(`top/${TOP_FILE[key ?? ""] ?? "黒"}.png`);
}

/* ===== 花飾り（左右） ===== */
const SIDE_FILE: Record<string, string> = {
  黒: "黒",
  白: "白",
  "花(1)": "花1",
  "花（1）": "花1",
  花1: "花1",
  "花(2)": "花2",
  "花（2）": "花2",
  花2: "花2",
};
export function sideFlowerSrc(key?: string): string {
  return src(`side/${SIDE_FILE[key ?? ""] ?? "黒"}.png`);
}

/* ===== 祭壇（中央：焼香台／線香／花） ===== */
const CENTER_FILE: Record<string, string> = {
  "焼香(黒)": "黒焼香",
  焼香黒: "黒焼香",
  黒焼香: "黒焼香",
  "焼香(白)": "白焼香",
  焼香白: "白焼香",
  白焼香: "白焼香",
  "線香(1本)": "線香1本",
  線香1本: "線香1本",
  線香1: "線香1本",
  "線香(2本)": "線香2本",
  線香2本: "線香2本",
  線香2: "線香2本",
  "線香(3本)": "線香3本",
  線香3本: "線香3本",
  線香3: "線香3本",
  "花(1)": "花1",
  花1: "花1",
  "花(2)": "花2",
  花2: "花2",
  非表示: "非表示",
};
export function centerFile(key?: string): string {
  return CENTER_FILE[key ?? ""] ?? "黒焼香";
}
export function centerSrc(key?: string): string {
  return src(`center/${centerFile(key)}.png`);
}
export function centerHidden(key?: string): boolean {
  return centerFile(key) === "非表示";
}

// 中央素材の種別（サイズ・配置の出し分けに使用）。
export function centerKind(key?: string): "焼香" | "線香" | "花" | "非表示" {
  const f = centerFile(key);
  if (f === "非表示") return "非表示";
  if (f.startsWith("線香")) return "線香";
  if (f.startsWith("花")) return "花";
  return "焼香";
}

// 焼香・線香を選んでいるときだけ煙を立ちのぼらせる（花・非表示は煙なし）。
export function centerHasSmoke(key?: string): boolean {
  const f = centerFile(key);
  return f === "黒焼香" || f === "白焼香" || f.startsWith("線香");
}

// お参りボタンの文言（焼香＝お焼香をする／線香＝お線香をあげる）。
export function worshipButtonLabel(key?: string): string {
  const f = centerFile(key);
  if (f.startsWith("線香")) return "お線香をあげる";
  if (f === "黒焼香" || f === "白焼香") return "お焼香をする";
  return "お参りをする";
}
