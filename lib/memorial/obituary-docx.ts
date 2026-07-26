// 訃報紙(Word)の docx 生成。＠葬儀のdocx（public/tmp/オンライン祭壇/pdf_word/）と同じ構成。
// A4縦1枚に必ず収めるため、行送り・余白・QRサイズを段階的に詰める密度プリセットを持つ。
import { buildDocx, inlineImage, x } from "@/lib/docx";

export interface ObituaryEventRow {
  eventType: string;
  datetime: string;
  venueName?: string;
  venueAddress?: string;
  tel?: string;
}

export interface ObituaryDocData {
  issuedLabel: string; // 右上の発行日
  title: string; // 「訃報」
  deceasedLine: string; // 「故　○○（かな）　儀」
  bodyLines: string[]; // 訃報本文（1行1要素）
  mournerLine?: string; // 「喪主 ○○」
  events: ObituaryEventRow[];
  religionType: string;
  homeName: string;
  tel?: string;
  email?: string;
  url?: string;
  detailLines: string[]; // 【式の詳細情報】の案内文
  qrPng?: Buffer;
}

/**
 * 密度プリセット。上から順に試し、A4縦1枚に収まる最初のものを使う。
 * 行送りはすべて lineRule="exact"（絶対値）で指定する。WordのYu Gothicは既定の行送りが
 * 1.6〜1.7em と極端に広く、フォントサイズから高さを予測できない。行の高さを固定することで
 * 「積み上げた高さ＝実際のページ上の高さ」となり、1枚に収まるかを確実に判定できる。
 */
interface Density {
  leadSz: number; // 訃報本文のサイズ(ハーフポイント)
  leadMul: number; // 訃報本文の行送り倍率
  gapSz: number; // 余白段落の高さ(ハーフポイント相当)
  bigGap: number; // 「記」前後の余白段落
  qrPt: number; // QR画像の一辺(pt)
  titleSz: number; // 「訃報」のサイズ
  bodySz: number; // 式一覧など本体のサイズ
  footSz: number; // 下段2列のサイズ
  mul: number; // 本体の行送り倍率
}
const DENSITIES: Density[] = [
  { leadSz: 22, leadMul: 1.95, gapSz: 22, bigGap: 26, qrPt: 76, titleSz: 52, bodySz: 21, footSz: 19, mul: 1.5 },
  { leadSz: 22, leadMul: 1.7, gapSz: 18, bigGap: 20, qrPt: 70, titleSz: 48, bodySz: 21, footSz: 18, mul: 1.38 },
  { leadSz: 21, leadMul: 1.5, gapSz: 14, bigGap: 16, qrPt: 62, titleSz: 44, bodySz: 20, footSz: 17, mul: 1.3 },
  { leadSz: 20, leadMul: 1.38, gapSz: 10, bigGap: 12, qrPt: 54, titleSz: 40, bodySz: 19, footSz: 16, mul: 1.24 },
  { leadSz: 19, leadMul: 1.28, gapSz: 7, bigGap: 8, qrPt: 46, titleSz: 34, bodySz: 18, footSz: 15, mul: 1.2 },
  { leadSz: 18, leadMul: 1.2, gapSz: 5, bigGap: 5, qrPt: 38, titleSz: 30, bodySz: 17, footSz: 14, mul: 1.16 },
];

// A4縦 / 余白は上下左右 2.0cm(1134twips)。枠線は用紙端から24ptに置く。
const PG_W = 11906;
const PG_H = 16838;
const MARGIN = 1134;
/** 本文が使える高さ(twips)。改ページ判定に僅かな余裕をみる。 */
const AVAIL_TW = Math.round((PG_H - MARGIN * 2) * 0.985);
/** 本文欄の幅(twips)と、表のラベル/値セル・下段2列セルの幅 */
const CONTENT_W = PG_W - MARGIN * 2;
const KEY_W = 1800;
const VAL_W = 7500;
const FOOT_COL = 4650;
const FOOT_W = FOOT_COL - 140;

const BORDER = 'w:val="single" w:color="auto" w:sz="6" w:space="0"';

/** 行の高さ(twips)。フォントサイズ(ハーフポイント)×倍率。 */
function tw(szHalfPt: number, mul: number): number {
  return Math.round((szHalfPt / 2) * mul * 20);
}

/** xml と高さ(twips)を一緒に持ち回るブロック。見積りと出力を必ず一致させるための型。 */
interface Block {
  xml: string;
  h: number;
}

function run(text: string, sz: number): string {
  return `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}
/** 段落内改行 */
function br(sz: number): string {
  return `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:br/></w:r>`;
}
/** 文字列の表示幅(twips)。全角=1em、半角=0.52em で近似。 */
function textW(s: string, szHalfPt: number): number {
  const em = (szHalfPt / 2) * 20;
  let w = 0;
  for (const ch of s) w += /[\x20-\x7e]/.test(ch) ? em * 0.52 : em;
  return w;
}
/** 幅 colTw の欄に流したときの行数 */
function wrapLines(s: string, szHalfPt: number, colTw: number): number {
  return Math.max(1, Math.ceil(textW(s, szHalfPt) / colTw));
}

/**
 * 段落。行の高さを exact で固定するので、返り値の h がそのまま実際の高さになる。
 * lines には折り返しを含めた行数を渡す。画像を含む段落だけ autoLine + extraH を使う。
 */
function para(
  content: string,
  o: {
    sz: number;
    lineTw: number;
    lines?: number;
    jc?: "left" | "center" | "right";
    borderTop?: boolean;
    autoLine?: boolean;
    extraH?: number;
  }
): Block {
  const spacing = o.autoLine
    ? `<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>`
    : `<w:spacing w:before="0" w:after="0" w:line="${o.lineTw}" w:lineRule="exact"/>`;
  const pPr =
    (o.borderTop ? `<w:pBdr><w:top ${BORDER}/></w:pBdr>` : "") +
    (o.jc ? `<w:jc w:val="${o.jc}"/>` : "") +
    spacing +
    `<w:rPr><w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/></w:rPr>`;
  return {
    xml: `<w:p><w:pPr>${pPr}</w:pPr>${content}</w:p>`,
    h: (o.autoLine ? 0 : o.lineTw * (o.lines ?? 1)) + (o.extraH ?? 0),
  };
}
/** 空段落（高さ＝指定サイズ分だけ空ける） */
function gapBlock(sz: number): Block {
  return para("", { sz, lineTw: tw(sz, 1) });
}
/** 区切り罫線（＠葬儀は空段落の上罫線で区切る） */
function hrBlock(): Block {
  return para("", { sz: 8, lineTw: 100, borderTop: true });
}

/** 罫線なしテーブルの外枠 */
function tbl(leftW: number, rightW: number, trs: string, rightMar: number): string {
  return (
    `<w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="${leftW + rightW}"/><w:tblLayout w:type="fixed"/>` +
    `<w:tblBorders><w:top w:val="none" w:sz="0"/><w:left w:val="none" w:sz="0"/><w:bottom w:val="none" w:sz="0"/><w:right w:val="none" w:sz="0"/><w:insideH w:val="none" w:sz="0"/><w:insideV w:val="none" w:sz="0"/></w:tblBorders>` +
    `<w:tblCellMar><w:top w:type="dxa" w:w="0"/><w:left w:type="dxa" w:w="0"/><w:bottom w:type="dxa" w:w="0"/><w:right w:type="dxa" w:w="${rightMar}"/></w:tblCellMar>` +
    `</w:tblPr><w:tblGrid><w:gridCol w:w="${leftW}"/><w:gridCol w:w="${rightW}"/></w:tblGrid>${trs}</w:tbl>`
  );
}

/** ラベル+値の2列テーブル（＠葬儀の 日時/場所/連絡先 と同じ形） */
function labelTable(rows: { key: string; values: string[] }[], sz: number, mul: number): Block {
  const line = tw(sz, mul);
  let h = 0;
  const trs = rows
    .map((r) => {
      const keyP = para(run(r.key, sz), { sz, lineTw: line });
      const cells = r.values.map((v) =>
        para(run(v, sz), { sz, lineTw: line, lines: wrapLines(v, sz, VAL_W) })
      );
      h += Math.max(
        keyP.h,
        cells.reduce((n, c) => n + c.h, 0)
      );
      return (
        `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
        `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${KEY_W}"/></w:tcPr>${keyP.xml}</w:tc>` +
        `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${VAL_W}"/></w:tcPr>${cells.map((c) => c.xml).join("")}</w:tc></w:tr>`
      );
    })
    .join("");
  return { xml: tbl(KEY_W, VAL_W, trs, 80), h };
}

/**
 * 本体を組み立てる。返り値の h が積み上げ高さ(twips)。
 * fillTw を渡すと、下段2列の直前に余りの高さ分の空段落を入れて用紙下端に寄せる
 * （＠葬儀のPDFと同じく問い合わせ欄が下に来る。上下に間延びした空白が出ないようにする）
 */
function buildBody(d: ObituaryDocData, k: Density, fillTw = 0): Block {
  const B = k.bodySz;
  const F = k.footSz;
  const bs: Block[] = [];

  bs.push(para(run(d.issuedLabel, B), { sz: B, lineTw: tw(B, k.mul), jc: "right" }));
  bs.push(para(run(d.title, k.titleSz), { sz: k.titleSz, lineTw: tw(k.titleSz, 1.3), jc: "center" }));
  bs.push(gapBlock(k.gapSz));

  // 故人行 → 空行 → 本文（すべて中央寄せの1段落）
  const leadRuns = [run(d.deceasedLine, k.leadSz), br(k.leadSz), br(k.leadSz)];
  d.bodyLines.forEach((t, i) => {
    if (i > 0) leadRuns.push(br(k.leadSz));
    leadRuns.push(run(t, k.leadSz));
  });
  const leadLines =
    wrapLines(d.deceasedLine, k.leadSz, CONTENT_W) +
    1 +
    d.bodyLines.reduce((n, t) => n + wrapLines(t, k.leadSz, CONTENT_W), 0);
  bs.push(
    para(leadRuns.join(""), {
      sz: k.leadSz,
      lineTw: tw(k.leadSz, k.leadMul),
      lines: leadLines,
      jc: "center",
    })
  );

  bs.push(gapBlock(k.gapSz));
  if (d.mournerLine) bs.push(para(run(d.mournerLine, B), { sz: B, lineTw: tw(B, k.mul), jc: "right" }));
  bs.push(gapBlock(k.bigGap));
  bs.push(para(run("記", 24), { sz: 24, lineTw: tw(24, k.mul), jc: "center" }));
  bs.push(hrBlock());

  for (const e of d.events) {
    bs.push(para(run(`■${e.eventType}`, B), { sz: B, lineTw: tw(B, k.mul) }));
    const rows = [{ key: "日時", values: [e.datetime] }];
    const place = [e.venueName, e.venueAddress].filter(Boolean) as string[];
    if (place.length) rows.push({ key: "場所", values: place });
    if (e.tel) rows.push({ key: "連絡先", values: [`TEL:${e.tel}`] });
    bs.push(labelTable(rows, B, k.mul));
    bs.push(gapBlock(k.gapSz));
    bs.push(hrBlock());
  }

  bs.push(labelTable([{ key: "儀式形態", values: [d.religionType] }], B, k.mul));
  bs.push(gapBlock(k.gapSz));
  bs.push(hrBlock());

  if (fillTw > 0) bs.push(para("", { sz: 2, lineTw: fillTw }));

  // 下段2列: 【御用達】 / 【式の詳細情報】
  const fline = tw(F, k.mul);
  const contact = [
    d.tel && `TEL：${d.tel}`,
    d.email && `メールアドレス：${d.email}`,
    d.url && `URL：${d.url}`,
  ].filter(Boolean) as string[];
  const leftBlocks = [
    para(run("【御用達】", F), { sz: F, lineTw: fline }),
    para(run(d.homeName, F + 3), {
      sz: F + 3,
      lineTw: tw(F + 3, k.mul),
      lines: wrapLines(d.homeName, F + 3, FOOT_W),
    }),
    ...contact.map((t) => para(run(t, F), { sz: F, lineTw: fline, lines: wrapLines(t, F, FOOT_W) })),
  ];
  const rightBlocks = [
    para(run("【式の詳細情報】", F), { sz: F, lineTw: fline }),
    ...d.detailLines.map((t) => para(run(t, F), { sz: F, lineTw: fline, lines: wrapLines(t, F, FOOT_W) })),
  ];
  // QRは画像なので exact だと切れる。自動行送りにして高さは実寸で足す。
  if (d.qrPng) {
    rightBlocks.push(
      para(inlineImage(k.qrPt), {
        sz: F,
        lineTw: fline,
        autoLine: true,
        extraH: Math.round(k.qrPt * 20 * 1.08),
      })
    );
  }
  const footH = Math.max(
    leftBlocks.reduce((n, b) => n + b.h, 0),
    rightBlocks.reduce((n, b) => n + b.h, 0)
  );
  bs.push({
    xml: tbl(
      FOOT_COL,
      FOOT_COL,
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
        `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${FOOT_COL}"/></w:tcPr>${leftBlocks.map((b) => b.xml).join("")}</w:tc>` +
        `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${FOOT_COL}"/></w:tcPr>${rightBlocks.map((b) => b.xml).join("")}</w:tc></w:tr>`,
      140
    ),
    h: footH,
  });

  // 用紙設定：A4縦・全面に細い黒枠（枠は用紙端から24pt）
  const bd = BORDER.replace('w:space="0"', 'w:space="24"');
  const sectPr =
    `<w:sectPr><w:pgSz w:w="${PG_W}" w:h="${PG_H}" w:orient="portrait"/>` +
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="0" w:footer="0" w:gutter="0"/>` +
    `<w:pgBorders w:offsetFrom="page"><w:top ${bd}/><w:left ${bd}/><w:bottom ${bd}/><w:right ${bd}/></w:pgBorders>` +
    `<w:docGrid w:type="default" w:linePitch="240"/></w:sectPr>`;

  return { xml: bs.map((b) => b.xml).join("") + sectPr, h: bs.reduce((n, b) => n + b.h, 0) };
}

/** 選ばれた密度プリセットの番号と積み上げ高さ。レイアウト検証用。 */
export function pickDensity(d: ObituaryDocData): { index: number; heightTw: number; availTw: number } {
  const heights = DENSITIES.map((k) => buildBody(d, k).h);
  const found = heights.findIndex((h) => h <= AVAIL_TW);
  const index = found < 0 ? DENSITIES.length - 1 : found;
  return { index, heightTw: heights[index], availTw: AVAIL_TW };
}

/** 訃報紙(Word)を生成。A4縦1枚に収まる範囲で最も余裕のある密度を選ぶ。 */
export function buildObituaryDocx(d: ObituaryDocData): Buffer {
  const k = DENSITIES[pickDensity(d).index];
  const plain = buildBody(d, k);
  // 余りは下段2列の直前に入れて下端に寄せる（詰め切りにならないよう少しだけ残す）
  // 400twips(=20pt)は詰め切り防止の安全マージン。Wordの実測で、この余裕があれば改ページしない。
  const fill = Math.max(0, AVAIL_TW - plain.h - 400);
  const body = fill > 200 ? buildBody(d, k, fill) : plain;
  return buildDocx(body.xml, d.qrPng);
}
