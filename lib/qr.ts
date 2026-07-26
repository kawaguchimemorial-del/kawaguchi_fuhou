import QRCode from "qrcode";

/** URL等の文字列からQRコードのSVG文字列を生成 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, width: 240 });
}

/**
 * QRコードを PNG の data URI で生成。
 * 訃報紙(PDF/Word)は単一HTMLとして配布するため、外部参照にできない箇所で使う。
 * （WordのHTML取り込みはSVGを描画しないため、印刷物用途はPNGに寄せる）
 */
export async function qrPngDataUrl(text: string, width = 240): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width, errorCorrectionLevel: "M" });
}

/** QRコードのPNGバイト列（docxへ埋め込む画像パート用） */
export async function qrPngBuffer(text: string, width = 240): Promise<Buffer> {
  return QRCode.toBuffer(text, { margin: 1, width, errorCorrectionLevel: "M" });
}
