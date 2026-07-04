import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 過去施行のオンライン式場動画（Vimeo）は at-sougi ドメインにリファラ制限されており、
// 当サイトからは直接再生できない。管理者確認用に、サーバー側で at-sougi リファラを付与して
// HLS(マニフェスト＋セグメント)を中継し、hls.js で再生可能にする。
const REFERER = "https://app.at-sougi.com/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const UP_HEADERS: Record<string, string> = { Referer: REFERER, "User-Agent": UA, Origin: "https://app.at-sougi.com" };

// SSRF対策: 中継先は Vimeo のホストのみ許可
function allowedHost(u: string): boolean {
  try {
    const h = new URL(u).hostname;
    return h === "player.vimeo.com" || h === "vimeo.com" || h.endsWith(".vimeocdn.com") || h.endsWith(".vimeo.com");
  } catch {
    return false;
  }
}

async function getMasterUrl(id: string): Promise<string | null> {
  const r = await fetch(`https://player.vimeo.com/video/${id}`, { headers: UP_HEADERS });
  if (!r.ok) return null;
  const html = await r.text();
  const mm =
    html.match(/window\.playerConfig\s*=\s*(\{[\s\S]+?\})\s*<\/script>/) ||
    html.match(/var config = (\{[\s\S]+?\});/);
  if (!mm) return null;
  try {
    const cfg = JSON.parse(mm[1]);
    const hls = cfg?.request?.files?.hls;
    if (!hls?.cdns) return null;
    const cdn = hls.default_cdn && hls.cdns[hls.default_cdn] ? hls.default_cdn : Object.keys(hls.cdns)[0];
    return hls.cdns[cdn]?.url ?? null;
  } catch {
    return null;
  }
}

function toProxy(id: string, base: string, u: string): string {
  try {
    const abs = new URL(u, base).href;
    return `/api/vid/${id}?f=${encodeURIComponent(abs)}`;
  } catch {
    return u;
  }
}

function rewriteManifest(id: string, base: string, text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        // EXT-X-KEY / MAP / MEDIA / I-FRAME-STREAM-INF の URI="..." を書き換え
        return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${toProxy(id, base, u)}"`);
      }
      return toProxy(id, base, t);
    })
    .join("\n");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new Response("bad id", { status: 400 });

  const f = req.nextUrl.searchParams.get("f");
  let target = f;
  if (target) {
    if (!allowedHost(target)) return new Response("forbidden host", { status: 403 });
  } else {
    target = await getMasterUrl(id);
    if (!target) return new Response("video not available", { status: 502 });
  }

  const range = req.headers.get("range");
  const up = await fetch(target, { headers: range ? { ...UP_HEADERS, Range: range } : UP_HEADERS });
  if (!up.ok && up.status !== 206) return new Response("upstream error", { status: up.status || 502 });

  const ct = up.headers.get("content-type") || "";
  const isM3u8 = /mpegurl/i.test(ct) || target.split("?")[0].toLowerCase().endsWith(".m3u8");

  if (isM3u8) {
    const text = await up.text();
    const body = rewriteManifest(id, target, text);
    return new Response(body, {
      headers: { "content-type": "application/vnd.apple.mpegurl", "cache-control": "no-store" },
    });
  }

  // セグメント/キー等はバイナリ中継（Range対応）
  const headers = new Headers();
  headers.set("content-type", ct || "application/octet-stream");
  for (const h of ["content-range", "accept-ranges", "content-length"]) {
    const v = up.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("cache-control", "public, max-age=3600");
  return new Response(up.body, { status: up.status, headers });
}
