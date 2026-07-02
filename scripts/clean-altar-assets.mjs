// オンライン祭壇の素材（public/tmp/オンライン祭壇/）は書き出し時にチェッカー柄が
// 焼き込まれた偽透過になっているため、実透過に戻して public/altar/ へ生成する。
//   実行: node scripts/clean-altar-assets.mjs
// 背景(bg)は不透明なのでコピーのみ。frame は額縁内側の開口も中央シードで抜く。
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "public/tmp/オンライン祭壇";
const OUT = "public/altar";

// チェッカー柄（ほぼ白〜薄灰・低彩度）を四辺＋（額縁は中央）からフラッド塗りで透過にする。
async function clean(inPath, outPath, { seedCenter = false } = {}) {
  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const idx = (x, y) => (y * W + x) * C;
  const isBg = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a === 0) return true;
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn >= 232 && mx - mn <= 14;
  };
  const visited = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (isBg(x, y)) stack.push(p);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  if (seedCenter) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) push((W >> 1) + dx * 4, (H >> 1) + dy * 4);
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p / W) | 0;
    data[idx(x, y) + 3] = 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // 透過余白をトリミングして配置しやすくする。
  const cleaned = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
  await sharp(cleaned).trim({ threshold: 1 }).png().toFile(outPath);
  console.log("  ✓", outPath);
}
function copy(inPath, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.copyFileSync(inPath, outPath);
  console.log("  =", outPath);
}

const jobs = [
  { dir: `${SRC}/額縁/png`, out: `${OUT}/frame`, seedCenter: true },
  { dir: `${SRC}/花飾り左右`, out: `${OUT}/side`, only: ["黒.png", "白.png", "花1.png", "花2.png"] },
  { dir: `${SRC}/祭壇/png`, out: `${OUT}/center` },
  { dir: `${SRC}/天板`, out: `${OUT}/top` },
];
for (const j of jobs) {
  console.log(j.out);
  for (const f of fs.readdirSync(j.dir)) {
    if (!f.endsWith(".png")) continue;
    if (j.only && !j.only.includes(f)) continue;
    await clean(path.join(j.dir, f), path.join(j.out, f), { seedCenter: j.seedCenter });
  }
}
console.log(`${OUT}/bg`);
for (const f of fs.readdirSync(`${SRC}/背景`)) if (f.endsWith(".png")) copy(`${SRC}/背景/${f}`, `${OUT}/bg/${f}`);
console.log("done");
