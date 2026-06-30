import type { AltarConfig } from "@/lib/memorial/types";

// 実物の「祭壇設定」レイヤーを構造的に再現。
// 本番は各レイヤーの透過PNG素材を Storage に用意して重ねるが、
// 素材導入までは CSS/絵文字で配置・色を反映して構造を表現する（TODO: 素材差し替え）。

const FRAME_COLOR: Record<string, string> = {
  黒: "#1a1a1a",
  黒リボン: "#1a1a1a",
  白: "#f3f1ea",
  白花: "#f3f1ea",
  グレー: "#8a8a8a",
  紫: "#7e5aa2",
  ピンク: "#e6a6c0",
};

const BG_STYLE: Record<string, string> = {
  七宝: "repeating-conic-gradient(from 0deg, #f3efe4 0deg 90deg, #ece6d6 90deg 180deg)",
  菊: "radial-gradient(circle, #f1ead7 20%, #e9e0c9 21%) ",
  波: "linear-gradient(180deg, #f3efe4, #e9e2cf)",
  ドレープベージュ: "linear-gradient(90deg,#efe7d6,#e3d8be,#efe7d6)",
  ドレープピンク: "linear-gradient(90deg,#f6e7ec,#edcdd8,#f6e7ec)",
};

const CENTER_GLYPH: Record<string, string> = {
  焼香黒: "🕯️",
  焼香白: "🕯️",
  線香1: "🪔",
  線香2: "🪔",
  線香3: "🪔",
  花1: "💐",
  花2: "🌸",
  非表示: "",
};

export function AltarView({
  altar,
  portraitAlt,
}: {
  altar: AltarConfig;
  portraitAlt?: string;
}) {
  const frame = FRAME_COLOR[altar.frame] ?? "#1a1a1a";
  return (
    <div
      className="relative mx-auto flex aspect-[4/5] w-full max-w-md flex-col items-center justify-end overflow-hidden rounded-md sm:max-w-lg md:max-w-2xl"
      style={{ background: BG_STYLE[altar.background] ?? "#efe9da" }}
      role="img"
      aria-label="オンライン祭壇"
    >
      {/* 遺影＋額縁＋左右花 */}
      <div className="absolute top-[10%] flex items-end gap-2 sm:gap-3">
        <span className="text-4xl sm:text-5xl md:text-6xl" aria-hidden>
          {altar.sideFlower.startsWith("花") ? "💐" : "🏵️"}
        </span>
        <div
          className="flex h-48 w-40 items-center justify-center bg-[var(--card)] sm:h-64 sm:w-52 md:h-80 md:w-64"
          style={{ border: `8px solid ${frame}` }}
        >
          {altar.portraitPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={altar.portraitPath}
              alt={portraitAlt ?? "ご遺影"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-[var(--muted)]">ご遺影</span>
          )}
        </div>
        <span className="text-4xl sm:text-5xl md:text-6xl" aria-hidden>
          {altar.sideFlower.startsWith("花") ? "💐" : "🏵️"}
        </span>
      </div>

      {/* 祭壇（中央の焼香台/線香/花） */}
      {altar.center !== "非表示" && (
        <div className="absolute top-[55%] text-3xl" aria-hidden>
          {CENTER_GLYPH[altar.center]}
        </div>
      )}

      {/* 天板 */}
      <div
        className="h-[18%] w-[88%] rounded-t-sm"
        style={{
          background:
            altar.top === "木目"
              ? "linear-gradient(180deg,#d9c3a0,#c2a87f)"
              : "linear-gradient(180deg,#2a2a2a,#0f0f0f)",
        }}
      />
    </div>
  );
}
