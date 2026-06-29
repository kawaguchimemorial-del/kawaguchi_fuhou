// 訃報/オンライン式場のQRコード生成（SVG）。外部依存なしの簡易QR。
// ?url=<対象URL> を受け取りQRのSVGを返す。ダウンロード用に Content-Disposition 付与可(?dl=1)。
// 注: 簡易実装のため小〜中容量URL向け。将来 qrcode ライブラリ等へ差し替え可。
import { NextRequest } from "next/server";
import { qrSvg } from "@/lib/qr";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const dl = req.nextUrl.searchParams.get("dl") === "1";
  const svg = await qrSvg(url || "https://example.com");
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      ...(dl ? { "Content-Disposition": 'attachment; filename="qr.svg"' } : {}),
    },
  });
}
