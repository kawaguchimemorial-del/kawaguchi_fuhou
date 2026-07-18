"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export function CopyLinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // クリップボードAPIが使えない環境（古いiOS Safari等）へのフォールバック
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-2 font-bold">{label}</p>
      <p className="mb-4 break-all text-sm text-[#6b6b6b]">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded bg-[#1b2a4a] px-4 py-2.5 text-sm text-white"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "コピーしました" : "URLをコピーする"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded border border-[#ccc] px-4 py-2.5 text-sm text-[#333]"
        >
          <ExternalLink size={16} /> ページを開く
        </a>
      </div>
    </section>
  );
}
