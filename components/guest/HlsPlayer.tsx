"use client";

import { useEffect, useRef, useState } from "react";

// 過去式場のVimeo動画を当サイトのHLSプロキシ経由で再生する。
// クリックで初めて読み込む（一覧での無駄な帯域を避ける）。
export function HlsPlayer({ src, title, poster }: { src: string; title?: string; poster?: string }) {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!started) return;
    const video = videoRef.current;
    if (!video) return;
    let hls: import("hls.js").default | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari/iOS はネイティブHLS
      video.src = src;
      video.play().catch(() => {});
      return;
    }
    let cancelled = false;
    (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled) return;
      if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("動画を読み込めませんでした。");
        });
      } else {
        setError("お使いのブラウザはこの動画形式に対応していません。");
      }
    })();
    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [started, src]);

  return (
    <div className="relative w-full overflow-hidden rounded bg-black" style={{ paddingTop: "56.25%" }}>
      {started ? (
        <video
          ref={videoRef}
          controls
          playsInline
          poster={poster}
          className="absolute inset-0 h-full w-full bg-black"
        />
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white transition-colors hover:bg-black/70"
          aria-label={title ? `${title} を再生` : "動画を再生"}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <span className="ml-1 border-y-[12px] border-l-[20px] border-y-transparent border-l-white" />
          </span>
          <span className="text-sm">{title ? `${title}を再生` : "動画を再生"}</span>
        </button>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-900/80 px-3 py-2 text-center text-xs text-white">{error}</div>
      )}
    </div>
  );
}
