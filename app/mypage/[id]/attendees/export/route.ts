import { assertMournerAccess } from "@/lib/mourner/auth";
import { listAllAttendees, type Attendee } from "@/lib/mourner/data";

// 芳名録のダウンロード。＠葬儀は Shift_JIS だが、本リポジトリの他エクスポートと揃えて
// UTF-8 + BOM とする（Excel 日本語版はどちらも正しく開ける）。

export const dynamic = "force-dynamic";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

function jpDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 「山田 太郎」→ ["山田","太郎"]。区切りが無ければ全体を姓として扱う。 */
function splitName(full: string): [string, string] {
  const parts = (full ?? "").trim().split(/[\s　]+/);
  return parts.length >= 2 ? [parts[0], parts.slice(1).join(" ")] : [parts[0] ?? "", ""];
}

function toCsv(rows: Attendee[]): string {
  const header = [
    "日時", "姓", "名", "姓(ふりがな)", "名(ふりがな)", "故人とのご関係", "会社名",
    "郵便番号", "住所", "メールアドレス", "電話番号", "メッセージ",
  ];
  const lines = [header.join(",")];
  for (const a of rows) {
    const [sei, mei] = splitName(a.name);
    const [seiK, meiK] = splitName(a.kana ?? "");
    lines.push([
      jpDateTime(a.createdAt), sei, mei, seiK, meiK, a.relation ?? "", a.company ?? "",
      a.postalCode ?? "", a.address ?? "", a.email ?? "", a.phone ?? "", a.body,
    ].map(esc).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function toTxt(rows: Attendee[]): string {
  const blocks = rows.map((a) => {
    const lines = [`日時: ${jpDateTime(a.createdAt)}`];
    lines.push(`お名前: ${a.name}${a.kana ? `（${a.kana}）` : ""}`);
    if (a.email) lines.push(`メールアドレス: ${a.email}`);
    if (a.phone) lines.push(`電話番号: ${a.phone}`);
    if (a.postalCode || a.address) lines.push(`住所: ${[a.postalCode, a.address].filter(Boolean).join(" ")}`);
    if (a.relation) lines.push(`故人とのご関係: ${a.relation}`);
    if (a.company) lines.push(`会社名: ${a.company}`);
    lines.push("メッセージ:", a.body);
    return lines.join("\r\n");
  });
  return "﻿" + blocks.join("\r\n\r\n" + "-".repeat(40) + "\r\n\r\n") + "\r\n";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const fmt = new URL(req.url).searchParams.get("fmt") === "txt" ? "txt" : "csv";
  const rows = await listAllAttendees(id);
  const body = fmt === "txt" ? toTxt(rows) : toCsv(rows);

  return new Response(body, {
    headers: {
      "Content-Type": fmt === "txt" ? "text/plain; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="houmeiroku_${id}.${fmt}"`,
      "Cache-Control": "no-store",
    },
  });
}
