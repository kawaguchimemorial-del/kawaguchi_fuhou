import { NextRequest } from "next/server";
import { getAdminMemorial } from "@/lib/admin/data";
import { toWarekiDate } from "@/lib/wareki";

export const dynamic = "force-dynamic";

function esc(v?: string | null): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function nl2br(v?: string | null): string {
  return esc(v).replace(/\n/g, "<br>");
}
function fmtEvent(e: { startAt?: string; datetimeLabel?: string }): string {
  if (e.datetimeLabel) return e.datetimeLabel;
  if (e.startAt) {
    const d = new Date(e.startAt);
    const t = isNaN(d.getTime()) ? "" : ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${toWarekiDate(e.startAt)}${t}`;
  }
  return "日程調整中";
}

function buildHtml(m: NonNullable<Awaited<ReturnType<typeof getAdminMemorial>>>, forPrint: boolean): string {
  const eventsHtml = m.events
    .map(
      (e) => `
      <tr><th>${esc(e.eventType)}</th><td>
        ${esc(fmtEvent(e))}${e.venueName ? `<br>会場：${esc(e.venueName)}` : ""}${e.venueAddress ? `<br>${esc(e.venueAddress)}` : ""}
      </td></tr>`
    )
    .join("");
  const printScript = forPrint
    ? `<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>訃報 ${esc(m.deceased.nameKanji)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif; color:#1b2a4a; line-height:1.9; }
  .wrap { max-width: 680px; margin: 0 auto; }
  h1 { text-align:center; font-size:22px; letter-spacing:.3em; margin-bottom:4px; }
  .sub { text-align:center; color:#a8842f; margin-bottom:24px; }
  .body { white-space:normal; font-size:15px; margin:20px 0; }
  .mourner { text-align:right; margin-top:16px; }
  table { width:100%; border-collapse:collapse; margin-top:16px; font-size:14px; }
  th,td { border:1px solid #ccc; padding:8px 10px; text-align:left; vertical-align:top; }
  th { width:7em; background:#faf8f3; white-space:nowrap; }
  .meta { margin-top:20px; font-size:13px; color:#555; }
</style>${printScript}
</head><body><div class="wrap">
  <h1>${esc(m.obituaryTitle || "訃報")}</h1>
  <p class="sub">故 ${esc(m.deceased.nameKanji)} 儀</p>
  ${m.deceased.deathDate ? `<p style="text-align:center;">没日：${esc(toWarekiDate(m.deceased.deathDate))}${m.deceased.ageKazoe ? `　享年${m.deceased.ageKazoe}` : ""}</p>` : ""}
  <div class="body">${nl2br(m.obituaryBody)}</div>
  ${m.chiefMourner?.nameKanji ? `<p class="mourner">喪主　${esc(m.chiefMourner.nameKanji)}</p>` : ""}
  ${eventsHtml ? `<table>${eventsHtml}</table>` : ""}
  <div class="meta">
    儀式形態：${esc(m.religionType)}<br>
    ${m.funeralHomeName ? `葬儀社：${esc(m.funeralHomeName)}${m.funeralHomeContact?.phone ? `　${esc(m.funeralHomeContact.phone)}` : ""}` : ""}
  </div>
</div></body></html>`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const fmt = (req.nextUrl.searchParams.get("fmt") ?? "pdf").toLowerCase();
  const m = await getAdminMemorial(id);
  if (!m) return new Response("not found", { status: 404 });

  if (fmt === "doc" || fmt === "word") {
    const html = buildHtml(m, false);
    return new Response("﻿" + html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="obituary_${id}.doc"`,
      },
    });
  }
  // PDF: ブラウザの印刷→PDF保存（日本語フォントを確実に描画）
  const html = buildHtml(m, true);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
