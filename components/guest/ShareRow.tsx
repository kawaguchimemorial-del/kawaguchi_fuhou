"use client";

import { useState } from "react";

/** 「知人にお知らせ」SNS共有行 */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const items = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: "/share/facebook.webp" },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, icon: "/share/x.webp" },
    { label: "LINE", href: `https://line.me/R/msg/text/?${t}%0A${u}`, icon: "/share/line.webp" },
    { label: "メール", href: `mailto:?subject=${t}&body=${u}`, icon: "/share/mail.webp" },
    { label: "SMS", href: `sms:?body=${t}%20${u}`, icon: "/share/sms.webp" },
  ];
  return (
    <div className="flex items-center justify-between border-t py-5">
      <span className="text-[var(--primary)]">知人にお知らせ</span>
      <div className="flex items-center gap-3">
        {items.map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label}で知らせる`}
            className="transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt={label} className="h-10 w-10" />
          </a>
        ))}
        <InstagramShare url={url} title={title} />
      </div>
    </div>
  );
}

/**
 * Instagram共有。
 * Instagramはウェブから本文・URLを事前入力して投稿する仕組みが無いため、
 * リンクをクリップボードにコピーしたうえでInstagramを開く方式にする。
 * モバイルでWeb Share APIが使える場合は共有シート経由でInstagramを選べる。
 */
function InstagramShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // 共有シートがキャンセルされた等はコピー動作にフォールバックしない
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の場合はそのままInstagramを開く
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Instagramで知らせる（リンクをコピー）"
      className="relative transition-opacity hover:opacity-80"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[22%] bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white" strokeWidth={2}>
          <rect x="2" y="2" width="20" height="20" rx="5.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="17.6" cy="6.4" r="1.2" className="fill-white stroke-none" />
        </svg>
      </span>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white">
          リンクをコピーしました
        </span>
      )}
    </button>
  );
}
