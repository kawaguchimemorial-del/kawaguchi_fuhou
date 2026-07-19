import "server-only";

/**
 * 印刷画面（見積書・請求書）に埋め込むPDF生成＋メール送信スクリプト。
 *
 * 顧客がコンビニ等でA4縦に印刷しても崩れないことを最優先にしている。
 *  - 画面幅ではなく「A4の本文幅(210mm - 余白)」で組んでから撮影する。
 *    画面幅のまま撮ると紙に合わせて縮尺がずれ、文字が細くなったり間延びする。
 *  - PDFには @page と同じ12mmの余白を入れる。余白ゼロだと家庭用・コンビニの
 *    プリンタが印刷できない領域に本文がかかり、端が欠ける。
 *  - 改ページは表の行や見出しの境界で行う。等間隔で切ると行が上下に割れる。
 *
 * 見積書・請求書で同じ処理を使うため共通化している（以前は各ルートに重複していた）。
 */

const MM_PER_PX = 25.4 / 96; // CSSピクセル → mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12; // print CSS の @page margin と揃える

export const PDF_SCRIPT = `
<script src="/vendor/html2canvas.min.js"></script>
<script src="/vendor/jspdf.umd.min.js"></script>
<script>
var PX_PER_MM = 96 / 25.4;
var PAGE_W = ${PAGE_W}, PAGE_H = ${PAGE_H}, MARGIN = ${MARGIN};
var CONTENT_W_MM = PAGE_W - MARGIN * 2;
var CONTENT_H_MM = PAGE_H - MARGIN * 2;
var CONTENT_W_PX = CONTENT_W_MM * PX_PER_MM;
var CONTENT_H_PX = CONTENT_H_MM * PX_PER_MM;

/** 行や見出しの下端＝ここで切ってよい位置、を集める */
function collectBreakpoints(){
  var bodyTop = document.body.getBoundingClientRect().top + window.scrollY;
  var seen = {}, pts = [];
  var els = document.querySelectorAll('tr, h1, h2, p, .head, .kingaku, .note, .sign, table, .breakdown');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.closest('.toolbar')) continue;
    // 見出し行の直後で切ると、ヘッダーだけが前ページの末尾に取り残されるため候補にしない
    if (el.closest('thead')) continue;
    var r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    var bottom = Math.round(r.bottom + window.scrollY - bodyTop);
    if (!seen[bottom]) { seen[bottom] = 1; pts.push(bottom); }
  }
  pts.sort(function(a, b){ return a - b; });
  return pts;
}

/** 1ページに収まる範囲で、行を割らない切れ目を決める */
function planPages(totalPx, pts){
  var offsets = [], cur = 0;
  var guard = 0;
  while (cur < totalPx && guard++ < 200) {
    var limit = cur + CONTENT_H_PX;
    if (limit >= totalPx) { offsets.push([cur, totalPx]); break; }
    // 直前の切れ目を探す。ページの2割未満しか進まない位置は選ばない（無限ループ防止）
    var best = -1, min = cur + CONTENT_H_PX * 0.2;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i] > min && pts[i] <= limit) best = pts[i];
    }
    if (best < 0) best = limit; // 適当な切れ目が無ければやむを得ず等間隔で切る
    offsets.push([cur, best]);
    cur = best;
  }
  return offsets;
}

/** A4縦のPDFを作って dataURL を返す */
async function buildPdf(){
  var body = document.body;
  // A4本文幅で組み直してから撮影する（画面幅のままだと紙上で縮尺がずれる）
  var prev = { width: body.style.width, margin: body.style.margin, padding: body.style.padding };
  body.style.width = CONTENT_W_PX + 'px';
  body.style.margin = '0';
  body.style.padding = '0';
  // レイアウト確定を待つ
  await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });

  var totalPx = body.scrollHeight;
  var pts = collectBreakpoints();
  var pages = planPages(totalPx, pts);

  var scale = 2;
  var canvas = await html2canvas(body, {
    scale: scale,
    backgroundColor: '#ffffff',
    windowWidth: CONTENT_W_PX,
    width: CONTENT_W_PX,
    height: totalPx,
    scrollX: 0,
    scrollY: 0
  });

  // 撮影が終わったら画面表示を元に戻す
  body.style.width = prev.width; body.style.margin = prev.margin; body.style.padding = prev.padding;

  var jsPDF = window.jspdf.jsPDF;
  var pdf = new jsPDF('p', 'mm', 'a4');
  for (var i = 0; i < pages.length; i++) {
    var startPx = pages[i][0], endPx = pages[i][1];
    var hPx = Math.max(1, Math.round((endPx - startPx) * scale));
    var slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = hPx;
    var ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(startPx * scale), canvas.width, hPx, 0, 0, canvas.width, hPx);
    var img = slice.toDataURL('image/jpeg', 0.92);
    var hMm = (hPx / scale) * ${MM_PER_PX};
    if (i > 0) pdf.addPage();
    // 余白の内側に、本文幅ぴったりで配置する
    pdf.addImage(img, 'JPEG', MARGIN, MARGIN, CONTENT_W_MM, Math.min(hMm, CONTENT_H_MM));
  }
  return pdf.output('datauristring');
}

async function sendMail(){
  var btn = document.getElementById('mailBtn');
  if (!btn || btn.disabled) return;
  var old = btn.textContent;
  btn.disabled = true; btn.textContent = '作成中…';
  try {
    var dataUrl = await buildPdf();
    btn.textContent = '送信中…';
    var res = await fetch('./send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: dataUrl })
    });
    var d = await res.json().catch(function(){ return { ok:false, error:'応答が不正です' }; });
    if (d.ok) { alert('メールを送信しました: ' + (d.to || '')); }
    else { alert('送信できませんでした\\n' + (d.error || '')); }
  } catch (err) {
    alert('エラー: ' + err);
  } finally {
    btn.disabled = false; btn.textContent = old;
  }
}

/** PDFをその場でダウンロード（送信前に仕上がりを確かめる用） */
async function downloadPdf(name){
  var btn = document.getElementById('pdfBtn');
  var old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '作成中…'; }
  try {
    var dataUrl = await buildPdf();
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = (name || 'document') + '.pdf';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (err) {
    alert('エラー: ' + err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old; }
  }
}
</script>`;
