// 訃報紙(印刷物)のダウンロード。
// レイアウトは＠葬儀の出力物（public/tmp/オンライン祭壇/pdf_word/ 配下の実物PDF/Word）に合わせている。
//  - fmt=pdf : A4縦・全面に細い黒枠。中央に「訃報」→故人→本文→喪主→「記」→式一覧→儀式形態→下部2段(問い合わせ/詳細情報+QR)
//  - fmt=doc : 実体の .docx を生成（A4縦1枚に収まる密度を自動選択）。構成は（右上に発行日、■式名＋日時/場所/連絡先の表、儀式形態、【御用達】/【式の詳細情報】）
import { NextRequest } from "next/server";
import { getAdminMemorial } from "@/lib/admin/data";
import { getCompanyInfo, listMasterItems } from "@/lib/kanri/masters";
import { buildObituaryDocx } from "@/lib/memorial/obituary-docx";
import { qrPngBuffer, qrPngDataUrl } from "@/lib/qr";
import { getSiteOrigin } from "@/lib/site-url";
import { toWareki } from "@/lib/wareki";
import type { FuneralEvent, Memorial } from "@/lib/memorial/types";

export const dynamic = "force-dynamic";

function esc(v?: string | null): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** "18:00" 形式。時刻を持たない値は空文字。 */
function hm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (!/\d{2}:\d{2}/.test(iso)) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
/** 「令和8年7月25日（土） 18:00 〜 11:00」。＠葬儀は全角括弧で曜日、終了時刻は任意。 */
function fmtEventDatetime(e: FuneralEvent): string {
  if (e.datetimeLabel) return e.datetimeLabel;
  if (!e.startAt) return "日程調整中";
  const day = toWareki(e.startAt, true).replace("(", "（").replace(")", "）");
  const s = hm(e.startAt);
  const t = hm(e.endAt);
  if (!s) return day;
  return `${day}　${s} 〜${t ? ` ${t}` : ""}`;
}
/** 会場マスタから電話番号を引く（会場名の一致で照合）。 */
function venueTel(venueName: string | undefined, venues: { name: string; extra: Record<string, unknown> }[]): string {
  if (!venueName) return "";
  const hit = venues.find((v) => v.name === venueName) ?? venues.find((v) => venueName.includes(v.name));
  const tel = hit?.extra?.["tel"];
  return typeof tel === "string" ? tel : "";
}
/** 「7月25日（土）」＝供花の受付期限表記。 */
function fmtDeadline(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日（${wd}）`;
}

interface Ctx {
  m: Memorial;
  homeName: string;
  tel: string;
  email: string;
  url: string;
  venues: { name: string; extra: Record<string, unknown> }[];
  qr: string;
  deadline: string;
  acceptOffering: boolean;
}

/** 故人行「故　宋 城甲（松山 城一）　儀」（生テキスト） */
function deceasedLineText(m: Memorial): string {
  const paren = m.deceased.posthumousName || m.deceased.nameKana;
  return `故　${m.deceased.nameKanji}${paren ? `（${paren}）` : ""}　儀`;
}
/**
 * 訃報本文の行配列。先頭行が「〈故人名〉 儀」だけの場合は落とす。
 * （用紙では直前に故人行を必ず出すため、本文側に同じ行があると二重になる）
 */
function obituaryBodyTextLines(m: Memorial): string[] {
  const lines = String(m.obituaryBody ?? "").split(/\r?\n/);
  const bare = (s: string) => s.replace(/[\s　]/g, "");
  const name = bare(m.deceased.nameKanji);
  const head = bare(lines[0] ?? "").replace(/^故/, "").replace(/儀$/, "");
  if (lines.length > 1 && name && head === name) lines.shift();
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}

// ===== PDF（ブラウザの印刷→PDF保存。日本語フォントを確実に描画するためHTMLを返す） =====
function buildPdfHtml(c: Ctx, autoPrint: boolean): string {
  const { m } = c;
  // 式の行: 左に式名、右に日時。会場と電話番号は最後の式のあとに1ブロックで置く（＠葬儀と同じ）。
  const rows = m.events
    .map(
      (e) => `
      <tr>
        <td class="k">${esc(e.eventType)}</td>
        <td class="v">${esc(fmtEventDatetime(e))}</td>
      </tr>`
    )
    .join("");
  const last = m.events[m.events.length - 1];
  const tel = venueTel(last?.venueName, c.venues);
  const place = last
    ? `
      <tr>
        <td class="k"></td>
        <td class="v small">
          ${[esc(last.venueAddress), esc(last.venueName)].filter(Boolean).join("　")}
          ${tel ? `<br>電話番号 ${esc(tel)}` : ""}
        </td>
      </tr>`
    : "";

  const printScript = autoPrint
    ? `<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>${esc(c.m.chiefMourner?.nameKanji || c.m.deceased.nameKanji)}様_訃報紙</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#fff; }
  body {
    font-family: "Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif;
    color:#000; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { width:190mm; min-height:277mm; margin:0 auto; border:1px solid #000; padding:14mm 12mm 10mm; display:flex; flex-direction:column; }
  .title { text-align:center; font-size:27pt; letter-spacing:.28em; padding-left:.28em; font-weight:400; margin:6mm 0 0; }
  .lead { text-align:center; font-size:11pt; line-height:2.0; margin-top:12mm; }
  .mourner { text-align:right; font-size:11pt; margin-top:10mm; }
  .ki { text-align:center; font-size:12pt; margin-top:12mm; }
  hr { border:none; border-top:1px solid #000; margin:3mm 0 0; }
  table.detail { width:100%; border-collapse:collapse; margin-top:6mm; }
  table.detail td { vertical-align:top; padding:1.2mm 0; }
  td.k { width:32mm; font-size:10.5pt; }
  td.v { font-size:13pt; letter-spacing:.02em; }
  td.v.small { font-size:10pt; line-height:1.7; }
  .spacer { flex:1 1 auto; min-height:12mm; }
  table.foot { width:100%; border-collapse:collapse; }
  table.foot > tbody > tr > td { width:50%; vertical-align:top; padding:0 2mm 0 0; }
  table.foot > tbody > tr > td + td { padding-left:4mm; }
  .fh { font-size:10.5pt; margin:0 0 2.5mm; }
  .fname { font-size:13pt; margin:0 0 2.5mm; }
  .fline { font-size:10pt; line-height:1.85; }
  .qrbox { width:100%; border-collapse:collapse; }
  .qrbox td { vertical-align:top; padding:0; }
  .qr { width:22mm; height:22mm; display:block; }
  .note { font-size:8.5pt; line-height:1.9; vertical-align:top; }
</style>${printScript}
</head><body>
<div class="sheet">
  <div class="title">${esc(m.obituaryTitle || "訃報")}</div>

  <div class="lead">
    ${esc(deceasedLineText(m))}<br><br>
    ${obituaryBodyTextLines(m).map(esc).join("<br>")}
  </div>

  ${m.chiefMourner?.nameKanji ? `<div class="mourner">喪主 ${esc(m.chiefMourner.nameKanji)}</div>` : ""}

  <div class="ki">記</div>
  <hr>
  <table class="detail"><tbody>
    ${rows}
    ${place}
  </tbody></table>
  <hr>
  <table class="detail"><tbody>
    <tr><td class="k">儀式形態</td><td class="v small" style="font-size:10.5pt;padding-top:0.6mm;">${esc(m.religionType)}</td></tr>
  </tbody></table>
  <hr>

  <div class="spacer"></div>

  <table class="foot"><tbody><tr>
    <td>
      <p class="fh">【ご葬儀に関するお問い合わせ】</p>
      <p class="fname">${esc(c.homeName)}</p>
      <div class="fline">
        ${c.tel ? `電話：${esc(c.tel)}<br>` : ""}
        ${c.email ? `メール：${esc(c.email)}<br>` : ""}
        ${c.url ? `URL：${esc(c.url)}` : ""}
      </div>
    </td>
    <td>
      <p class="fh">【ご葬儀の詳細情報】</p>
      <table class="qrbox"><tbody>
        <tr><td colspan="2" class="note">詳細はインターネットでもご確認いただけます。<br>&nbsp;</td></tr>
        <tr>
          <td class="note">
            ${c.acceptOffering ? "供花のご注文を受け付けております。<br>" : ""}
            ${c.acceptOffering && c.deadline ? `受付期限：${esc(c.deadline)}まで` : ""}
          </td>
          <td rowspan="2" style="width:23mm;"><img class="qr" src="${c.qr}" alt="QR"></td>
        </tr>
        <tr><td class="note" style="padding-top:2.5mm;">右のQRコードを読み取ってください。</td></tr>
      </tbody></table>
    </td>
  </tr></tbody></table>
</div>
</body></html>`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const fmt = (req.nextUrl.searchParams.get("fmt") ?? "pdf").toLowerCase();
  const m = await getAdminMemorial(id);
  if (!m) return new Response("not found", { status: 404 });

  const [origin, co, venueMaster] = await Promise.all([getSiteOrigin(), getCompanyInfo(), listMasterItems("venue")]);
  const target = `${origin}/m/${id}`;
  const [qr, qrBuf] = await Promise.all([qrPngDataUrl(target, 300), qrPngBuffer(target, 300)]);
  const c: Ctx = {
    m,
    homeName: m.funeralHomeName || co.company_name || "",
    tel: m.funeralHomeContact?.phone || co.tel || "",
    email: m.funeralHomeContact?.email || co.email || "",
    url: m.funeralHomeContact?.url || co.url || "",
    venues: venueMaster.map((v) => ({ name: v.name, extra: (v.extra ?? {}) as Record<string, unknown> })),
    qr,
    deadline: fmtDeadline(m.offeringAcceptUntil),
    acceptOffering: !m.flowerDecline,
  };

  const base = `${m.chiefMourner?.nameKanji || m.deceased.nameKanji}様_訃報紙_${Math.floor(Date.now() / 1000)}`;

  if (fmt === "doc" || fmt === "word" || fmt === "docx") {
    const now = new Date();
    const buf = buildObituaryDocx({
      issuedLabel: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
      title: m.obituaryTitle || "訃報",
      deceasedLine: deceasedLineText(m),
      bodyLines: obituaryBodyTextLines(m),
      mournerLine: m.chiefMourner?.nameKanji ? `喪主 ${m.chiefMourner.nameKanji}` : undefined,
      events: m.events.map((e) => ({
        eventType: e.eventType,
        datetime: fmtEventDatetime(e),
        venueName: e.venueName,
        venueAddress: e.venueAddress,
        tel: venueTel(e.venueName, c.venues) || undefined,
      })),
      religionType: m.religionType,
      homeName: c.homeName,
      tel: c.tel || undefined,
      email: c.email || undefined,
      url: c.url || undefined,
      detailLines: [
        "詳細はインターネットでもご確認いただけます。",
        ...(c.acceptOffering && c.deadline ? [`受付期限：${c.deadline}まで`] : []),
        ...(c.acceptOffering ? ["供花のご注文を受け付けております。"] : []),
        "下記のQRコードを読み取ってください",
      ],
      qrPng: qrBuf,
    });
    // 日本語ファイル名は RFC5987(filename*) で渡す（未対応UAはASCIIの filename= を使う）。
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="obituary_${id}.docx"; filename*=UTF-8''${encodeURIComponent(base + ".docx")}`,
        "Cache-Control": "no-store",
      },
    });
  }
  // PDF: 印刷ダイアログを自動で開き「PDFに保存」で出力（タイトルが既定ファイル名になる）
  return new Response(buildPdfHtml(c, true), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
