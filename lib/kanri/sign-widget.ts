// 見積書/請求書 印刷画面の手書きサイン共通ウィジェット(8専門家仕様)。
// - Pointer Events一本(touch-action:none必須)・内部解像度600×200固定・透明PNG
// - 保存は /kanri/api/sign へPOSTし、成功後にreloadせずDOM差し替え
// - hint/モーダルは印刷(@media print)とメールPDF(data-html2canvas-ignore)の両方から除外

export interface SignState { sign?: string | null; signedAt?: string | null; inherited?: boolean }

function fmtd(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
  return s.replace(/-/g, "/");
}

// 署名テーブル(署名日/喪主様サイン/施主サイン)
export function signTableHtml(mourner: SignState, owner: SignState): string {
  const dateTxt = fmtd(mourner.signedAt) || fmtd(owner.signedAt) || "　　年　　月　　日";
  const box = (role: "mourner" | "owner", st: SignState) => `
      <td class="sign-box" id="signBox-${role}" onclick="openSign('${role}')">
        <img class="sign-img" id="signImg-${role}" src="${st.sign ?? ""}" alt="" style="${st.sign ? "" : "display:none"}">
        <span class="sign-hint" id="signHint-${role}" data-html2canvas-ignore="true" style="${st.sign ? "display:none" : ""}">ここをタップすると、手書きでサインを書くことができます。</span>
        ${st.inherited ? `<span class="sign-hint" data-html2canvas-ignore="true" style="display:block">※見積書のサインを表示中。タップで請求書用に署名し直せます。</span>` : ""}
      </td>`;
  return `
  <table class="sign">
    <tr><th style="width:7em">署名日</th><td id="signDate">${dateTxt}</td></tr>
    <tr><th>喪主様サイン</th>${box("mourner", mourner)}</tr>
    <tr><th>施主サイン</th>${box("owner", owner)}</tr>
  </table>`;
}

export const SIGN_CSS = `
  .sign-box{position:relative;cursor:pointer;height:46px;vertical-align:middle;}
  .sign-img{max-width:100%;max-height:44px;object-fit:contain;display:block;}
  .sign-hint{font-size:10px;color:#999;}
  @media print{.sign-hint{display:none !important;}.sign-box{cursor:auto;}}
  #signModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;}
  #signModal .panel{background:#fff;border-radius:12px;padding:16px;width:min(92vw,660px);}
  #signModal h2{margin:0 0 8px;font-size:15px;}
  #signCanvas{width:100%;max-width:600px;aspect-ratio:3/1;border:1.5px dashed #aaa;border-radius:8px;touch-action:none;display:block;background:#fafafa;}
  #signModal .btns{display:flex;gap:10px;justify-content:flex-end;margin-top:12px;}
  #signModal button{min-height:48px;padding:0 20px;border-radius:8px;border:1px solid #ccc;background:#fff;font-size:14px;cursor:pointer;}
  #signModal button.save{background:#2c8c6f;color:#fff;border-color:#2c8c6f;}
  #signModal button.save:disabled{opacity:.5;}
`;

// target: "estimate" | "invoice", id: 対象UUID
export function signWidgetHtml(target: string, id: string): string {
  return `
  <div id="signModal" data-html2canvas-ignore="true">
    <div class="panel">
      <h2 id="signTitle">サイン</h2>
      <canvas id="signCanvas" width="600" height="200"></canvas>
      <div class="btns">
        <button type="button" onclick="signClear()">クリア</button>
        <button type="button" onclick="signClose()">キャンセル</button>
        <button type="button" class="save" id="signSaveBtn" onclick="signSave()" disabled>保存</button>
      </div>
    </div>
  </div>
  <script>
  (function(){
    var CFG={target:${JSON.stringify(target)},id:${JSON.stringify(id)}};
    var role=null, strokes=0, drawing=false, prev=null;
    var modal, cv, ctx;
    function init(){
      modal=document.getElementById('signModal'); cv=document.getElementById('signCanvas'); ctx=cv.getContext('2d');
      ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#1a1a8c';
      cv.addEventListener('pointerdown',function(e){ e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing=true; prev=pt(e); });
      cv.addEventListener('pointermove',function(e){ if(!drawing)return; e.preventDefault();
        var pts=(e.getCoalescedEvents?e.getCoalescedEvents():[e]);
        for(var i=0;i<pts.length;i++){ var p=pt(pts[i]);
          ctx.beginPath(); ctx.moveTo(prev.x,prev.y);
          ctx.quadraticCurveTo(prev.x,prev.y,(prev.x+p.x)/2,(prev.y+p.y)/2);
          ctx.stroke(); prev=p; strokes++; }
        upd(); });
      function end(e){ if(!drawing)return; drawing=false;
        var p=pt(e); if(strokes===0||Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y)<1){ ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fillStyle='#1a1a8c'; ctx.fill(); strokes++; }
        upd(); }
      cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',function(){drawing=false;});
    }
    function pt(e){ var r=cv.getBoundingClientRect(); return { x:(e.clientX-r.left)*cv.width/r.width, y:(e.clientY-r.top)*cv.height/r.height }; }
    function upd(){ document.getElementById('signSaveBtn').disabled = strokes===0; }
    window.openSign=function(r){
      if(!modal) init();
      var img=document.getElementById('signImg-'+r);
      if(img && img.src && img.style.display!=='none'){
        if(!confirm('既存のサインを書き直しますか？保存すると上書きされます。')) return;
      }
      role=r; strokes=0; ctx.clearRect(0,0,cv.width,cv.height); upd();
      document.getElementById('signTitle').textContent=(r==='mourner'?'喪主様サイン':'施主サイン');
      modal.style.display='flex'; document.body.style.overflow='hidden';
    };
    window.signClear=function(){ ctx.clearRect(0,0,cv.width,cv.height); strokes=0; upd(); };
    window.signClose=function(){ modal.style.display='none'; document.body.style.overflow=''; };
    window.signSave=async function(){
      if(strokes===0) return;
      var btn=document.getElementById('signSaveBtn'); btn.disabled=true; btn.textContent='保存中…';
      try{
        var dataUrl=cv.toDataURL('image/png');
        var res=await fetch('/kanri/api/sign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:CFG.target,id:CFG.id,role:role,image:dataUrl})});
        var d=await res.json();
        if(!d.ok){ alert('保存に失敗しました: '+(d.error||'')); return; }
        var img=document.getElementById('signImg-'+role);
        img.src=dataUrl; img.style.display='block';
        var hint=document.getElementById('signHint-'+role); if(hint) hint.style.display='none';
        var box=document.getElementById('signBox-'+role);
        box.querySelectorAll('.sign-hint').forEach(function(el){ el.style.display='none'; });
        if(d.signedAt){ var dt=new Date(d.signedAt); var f=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(dt).replace(/-/g,'/');
          document.getElementById('signDate').textContent=f; }
        signClose();
      }catch(err){ alert('保存に失敗しました: '+err); }
      finally{ btn.disabled=false; btn.textContent='保存'; }
    };
  })();
  </script>`;
}
