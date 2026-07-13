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
  // 式次第: 各儀式を「式名・日時・会場」の縦リズムで上品に。行間に金の極細罫。
  const eventsHtml = m.events
    .map(
      (e, i) => `
      <tr>
        <td style="padding:14px 6px;${i > 0 ? "border-top:1px solid #e7ddc7;" : ""}text-align:center;vertical-align:top;width:34%;">
          <div style="font-family:'Noto Serif JP','Yu Mincho',serif;font-size:15px;color:#8a6d24;letter-spacing:.15em;">${esc(e.eventType)}</div>
        </td>
        <td style="padding:14px 6px;${i > 0 ? "border-top:1px solid #e7ddc7;" : ""}vertical-align:top;">
          <div style="font-size:16px;color:#1a1a1a;letter-spacing:.06em;">${esc(fmtEvent(e))}</div>
          ${e.venueName ? `<div style="font-size:13px;color:#555;margin-top:3px;">会場　${esc(e.venueName)}</div>` : ""}
          ${e.venueAddress ? `<div style="font-size:12px;color:#888;margin-top:1px;">${esc(e.venueAddress)}</div>` : ""}
        </td>
      </tr>`
    )
    .join("");

  const printScript = forPrint
    ? `<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>`
    : "";

  // 喪の黒縁(mourning border)＋温白の料紙＋明朝＋金の細罫。Word/印刷いずれも崩れにくいテーブル基調。
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>訃報 ${esc(m.deceased.nameKanji)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN","MS PMincho",serif; color:#1a1a1a; margin:0; background:#f3efe6; }
  * { box-sizing:border-box; }
  .frame { border:3px solid #1a1a1a; }
  .inner { border:1px solid #b89b52; }
</style>${printScript}
</head><body>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;">
<tr><td align="center" style="padding:22px 12px;">
  <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;background:#fbf9f2;" class="frame">
  <tr><td style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="inner"><tr><td style="padding:40px 46px 34px;">

      <!-- 標題 -->
      <div style="text-align:center;">
        <span style="display:inline-block;font-size:12px;letter-spacing:.4em;color:#8a6d24;">謹んでご通知申し上げます</span>
        <h1 style="font-size:40px;letter-spacing:.5em;margin:12px 0 0;padding-left:.5em;font-weight:600;color:#111;">${esc(m.obituaryTitle || "訃報")}</h1>
        <div style="width:56px;height:1px;background:#b89b52;margin:16px auto 0;"></div>
      </div>

      <!-- 故人 -->
      <div style="text-align:center;margin-top:26px;">
        <div style="font-size:15px;color:#555;letter-spacing:.3em;">故</div>
        <div style="font-size:30px;letter-spacing:.28em;padding-left:.28em;margin:6px 0 4px;color:#111;">${esc(m.deceased.nameKanji)}<span style="font-size:18px;color:#555;margin-left:.4em;letter-spacing:.1em;">儀</span></div>
        ${m.deceased.nameKana ? `<div style="font-size:12px;color:#999;letter-spacing:.2em;">${esc(m.deceased.nameKana)}</div>` : ""}
        ${m.deceased.deathDate ? `<div style="font-size:13px;color:#555;margin-top:10px;letter-spacing:.08em;">${esc(toWarekiDate(m.deceased.deathDate))}　永眠${m.deceased.ageKazoe ? `　享年 ${esc(String(m.deceased.ageKazoe))}` : ""}</div>` : ""}
      </div>

      ${m.obituaryBody ? `<div style="width:100%;height:1px;background:#e7ddc7;margin:26px 0;"></div>
      <div style="font-size:15px;line-height:2.05;letter-spacing:.04em;color:#2a2a2a;text-align:left;">${nl2br(m.obituaryBody)}</div>` : ""}

      ${m.chiefMourner?.nameKanji ? `<div style="text-align:right;margin-top:22px;font-size:15px;letter-spacing:.1em;color:#1a1a1a;">喪主　${esc(m.chiefMourner.nameKanji)}</div>` : ""}

      ${eventsHtml ? `
      <div style="margin-top:30px;">
        <div style="text-align:center;font-size:13px;letter-spacing:.35em;color:#8a6d24;padding-left:.35em;">式 次 第</div>
        <div style="width:36px;height:1px;background:#b89b52;margin:10px auto 6px;"></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${eventsHtml}</table>
      </div>` : ""}

      <!-- 差出（葬儀社） -->
      <div style="margin-top:34px;border-top:1px solid #1a1a1a;padding-top:14px;text-align:center;">
        ${m.religionType ? `<div style="font-size:12px;color:#888;letter-spacing:.12em;">${esc(m.religionType)}</div>` : ""}
        ${m.funeralHomeName ? `<div style="font-size:14px;color:#1a1a1a;letter-spacing:.1em;margin-top:6px;">${esc(m.funeralHomeName)}</div>` : ""}
        ${m.funeralHomeContact?.phone ? `<div style="font-size:13px;color:#555;letter-spacing:.08em;margin-top:2px;">TEL　${esc(m.funeralHomeContact.phone)}</div>` : ""}
      </div>

    </td></tr></table>
  </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
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
