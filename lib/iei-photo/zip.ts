/**
 * 依存なしの最小 ZIP 書き出し（無圧縮 / store のみ）。
 *
 * 目的: 複数サイズの遺影画像を「1つのダウンロード」にまとめるため。
 * ブラウザは1ページから複数ファイルを連続ダウンロードしようとすると
 * 「複数ファイルのダウンロード許可」を要求し、未許可だと2件目以降をブロックする。
 * ZIP にまとめれば単一ダウンロードになり、このブロックを回避できる。
 *
 * 無圧縮（method=0）なので JPEG/PNG など既に圧縮済みのデータに適する。
 * 外部ライブラリは使用しない（プロジェクト方針: 依存追加禁止）。
 */

/** ZIP に格納する1ファイル。name は ASCII 推奨（出力ファイル名は ASCII）。 */
export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

/** CRC32 テーブル（遅延生成）。 */
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

/**
 * エントリ群を無圧縮 ZIP（Blob）にまとめる。
 * ローカルファイルヘッダ + データ + セントラルディレクトリ + EOCD を組み立てる。
 */
export function createZipBlob(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0; // 各ローカルヘッダの先頭オフセット

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    // ローカルファイルヘッダ（30 バイト + 名前）
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    writeUint32(lv, 0, 0x04034b50); // local file header signature
    writeUint16(lv, 4, 20); // version needed
    writeUint16(lv, 6, 0); // flags
    writeUint16(lv, 8, 0); // method = store
    writeUint16(lv, 10, 0); // mod time
    writeUint16(lv, 12, 0); // mod date
    writeUint32(lv, 14, crc); // crc32
    writeUint32(lv, 18, data.length); // compressed size
    writeUint32(lv, 22, data.length); // uncompressed size
    writeUint16(lv, 26, nameBytes.length); // file name length
    writeUint16(lv, 28, 0); // extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    // セントラルディレクトリヘッダ（46 バイト + 名前）
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    writeUint32(cv, 0, 0x02014b50); // central dir signature
    writeUint16(cv, 4, 20); // version made by
    writeUint16(cv, 6, 20); // version needed
    writeUint16(cv, 8, 0); // flags
    writeUint16(cv, 10, 0); // method = store
    writeUint16(cv, 12, 0); // mod time
    writeUint16(cv, 14, 0); // mod date
    writeUint32(cv, 16, crc); // crc32
    writeUint32(cv, 20, data.length); // compressed size
    writeUint32(cv, 24, data.length); // uncompressed size
    writeUint16(cv, 28, nameBytes.length); // file name length
    writeUint16(cv, 30, 0); // extra field length
    writeUint16(cv, 32, 0); // comment length
    writeUint16(cv, 34, 0); // disk number start
    writeUint16(cv, 36, 0); // internal attrs
    writeUint32(cv, 38, 0); // external attrs
    writeUint32(cv, 42, offset); // local header offset
    central.set(nameBytes, 46);

    centralParts.push(central);

    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const centralOffset = offset;

  // EOCD（End Of Central Directory, 22 バイト）
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeUint32(ev, 0, 0x06054b50); // EOCD signature
  writeUint16(ev, 4, 0); // disk number
  writeUint16(ev, 6, 0); // disk with central dir
  writeUint16(ev, 8, entries.length); // entries on this disk
  writeUint16(ev, 10, entries.length); // total entries
  writeUint32(ev, 12, centralSize); // central dir size
  writeUint32(ev, 16, centralOffset); // central dir offset
  writeUint16(ev, 20, 0); // comment length

  const blobParts: BlobPart[] = [
    ...localParts.map((p) => bufferOf(p)),
    ...centralParts.map((p) => bufferOf(p)),
    bufferOf(eocd),
  ];
  return new Blob(blobParts, { type: "application/zip" });
}

/** Uint8Array を、その範囲だけを指す ArrayBuffer に変換する（subarray の view を安全に Blob 化）。 */
function bufferOf(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer as ArrayBuffer;
  }
  return bytes.slice().buffer;
}
