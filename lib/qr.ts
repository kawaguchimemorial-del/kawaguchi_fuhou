import QRCode from "qrcode";

/** URL等の文字列からQRコードのSVG文字列を生成 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, width: 240 });
}
