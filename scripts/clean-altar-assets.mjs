// オンライン祭壇の素材（public/tmp/オンライン祭壇/）は書き出し時にチェッカー柄が
// 焼き込まれた偽透過になっているため、実透過に戻して public/altar/ へ生成する。
//   実行: node scripts/clean-altar-assets.mjs
// 背景(bg)は不透明なのでコピーのみ。frame は額縁内側の開口も中央シードで抜く。
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "public/tmp/オンライン祭壇";
const OUT = "public/altar";

// 市松柄の2色を外周リングから推定する（明色はほぼ254、暗色はファイルごとに237〜245）。
function detectCheckerTones(data, W, H, C) {
  const hist = new Map();
  const add = (x, y) => {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 6) return; // 有彩色は柄ではない
    hist.set(r, (hist.get(r) ?? 0) + 1);
  };
  for (let x = 0; x < W; x++) for (let d = 0; d < 3; d++) { add(x, d); add(x, H - 1 - d); }
  for (let y = 0; y < H; y++) for (let d = 0; d < 3; d++) { add(d, y); add(W - 1 - d, y); }
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const hi = sorted[0][0];
  const lo = sorted.find(([v]) => hi - v >= 5 && hi - v <= 25)?.[0];
  return lo == null ? null : { hi, lo };
}

/**
 * 市松柄（偽透過）を実透過に戻す。
 *
 * 単純な「ほぼ白なら背景」判定では、白い額縁そのものを塗りつぶしてしまう
 * （白.png / 白花.png で枠が消えていた）。市松柄は2色ちょうどに値が集中するのに対し、
 * 白枠は木目により輝度が連続的に散らばる、という違いで両者を分離する。
 * 判定は窓内の分布で行い、積分画像でO(N)に落とす。
 */
async function clean(inPath, outPath, { seedCenter = false } = {}) {
  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const idx = (x, y) => (y * W + x) * C;

  // 既に本物の透過を持つ素材（ブルー等）は加工せずトリムのみ。
  let already = 0;
  for (let i = 3; i < data.length; i += C) if (data[i] < 50) already++;
  if (already / (W * H) > 0.05) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(inPath).trim({ threshold: 1 }).png().toFile(outPath);
    console.log("  ✓", outPath, "(既に透過済み・トリムのみ)");
    return;
  }

  const tones = detectCheckerTones(data, W, H, C);
  const TOL = 4;
  const near = (v, t) => Math.abs(v - t) <= TOL;

  // 各画素を「明色の柄 / 暗色の柄 / どちらでもない」に分類
  const N = W * H;
  const clsHi = new Uint8Array(N), clsLo = new Uint8Array(N);
  if (tones) {
    for (let p = 0; p < N; p++) {
      const i = p * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 6) continue;
      if (near(r, tones.hi) && near(g, tones.hi) && near(b, tones.hi)) clsHi[p] = 1;
      else if (near(r, tones.lo) && near(g, tones.lo) && near(b, tones.lo)) clsLo[p] = 1;
    }
  }
  // 積分画像（窓内の個数を定数時間で求める）
  const sum = (cls) => {
    const S = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let run = 0;
      for (let x = 0; x < W; x++) {
        run += cls[y * W + x];
        S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + run;
      }
    }
    return S;
  };
  const SH = sum(clsHi), SL = sum(clsLo);
  const R = 22; // 市松1マス(約33〜36px)より大きい窓にし、必ず両色が入るようにする
  const box = (S, x0, y0, x1, y1) =>
    S[(y1 + 1) * (W + 1) + x1 + 1] - S[y0 * (W + 1) + x1 + 1] - S[(y1 + 1) * (W + 1) + x0] + S[y0 * (W + 1) + x0];

  // 市松柄の条件: 窓内に明暗2色が両方とも十分な面積で現れること。
  // これが決め手になる。白枠は明色(254付近)が皆無なので必ず不成立になる。
  // マスの境界には中間色が出るため「どちらでもない」の許容は緩めに取る。
  const isChecker = (x, y) => {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R);
    const x1 = Math.min(W - 1, x + R), y1 = Math.min(H - 1, y + R);
    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
    const h = box(SH, x0, y0, x1, y1), l = box(SL, x0, y0, x1, y1);
    return h + l >= area * 0.6 && h >= area * 0.18 && l >= area * 0.18;
  };

  const isBg = (x, y) => {
    const i = idx(x, y);
    if (data[i + 3] === 0) return true;
    return tones ? isChecker(x, y) : false;
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
  const cleared = new Uint8Array(W * H);
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p / W) | 0;
    data[idx(x, y) + 3] = 0;
    cleared[p] = 1;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // 窓判定は柄と額縁の境目で必ず不成立になるため、上の塗りは柄を数十px残す。
  // そこで確定した柄の領域から、柄の2色に一致する画素へ1画素ずつ膨張させて縁を詰める。
  // 額縁側は2色に一致しないため、ここで膨張が止まる。
  if (tones) {
    const matches = (p) => {
      const i = p * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 6) return false;
      const m = (t) => near(r, t) && near(g, t) && near(b, t);
      return m(tones.hi) || m(tones.lo);
    };
    let frontier = [];
    for (let p = 0; p < N; p++) if (cleared[p]) frontier.push(p);
    while (frontier.length) {
      const next = [];
      for (const p of frontier) {
        const x = p % W, y = (p / W) | 0;
        const tryAt = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
          const q = ny * W + nx;
          if (cleared[q] || !matches(q)) return;
          cleared[q] = 1;
          data[q * C + 3] = 0;
          next.push(q);
        };
        tryAt(x + 1, y); tryAt(x - 1, y); tryAt(x, y + 1); tryAt(x, y - 1);
      }
      frontier = next;
    }
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
