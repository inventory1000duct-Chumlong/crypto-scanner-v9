
const $ = id => document.getElementById(id);
let morningPayload = null;
let fxRate = Number(localStorage.getItem("fxRate") || 36.5);

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmt(v,d=2){
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:0}) : "-";
}
function currency(){ return $("currencySelect")?.value || localStorage.getItem("currency") || "THB"; }
function moneyUSD(v,d=2){
  const n=Number(v);
  if(!Number.isFinite(n)) return "-";
  return "$"+n.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});
}
function money(v,d=2){
  const n=Number(v);
  if(!Number.isFinite(n)) return "-";
  if(currency()==="THB") return "฿"+(n*fxRate).toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});
  return moneyUSD(n,d);
}
async function api(url, timeout=30000){
  const c = new AbortController();
  const t = setTimeout(()=>c.abort(), timeout);
  try{
    const r = await fetch(url,{signal:c.signal,cache:"no-store"});
    const txt = await r.text();
    let data;
    try{ data = JSON.parse(txt); }catch(e){ throw new Error(txt.slice(0,180) || "Invalid JSON"); }
    if(!r.ok || data.ok===false) throw new Error(data.error || ("HTTP "+r.status));
    return data;
  }finally{ clearTimeout(t); }
}

function loadPortfolio(){
  try{return JSON.parse(localStorage.getItem("morningPortfolio")||"[]")}catch(e){return[]}
}
function savePortfolio(p){ localStorage.setItem("morningPortfolio", JSON.stringify(p)); }
function priceOf(sym){
  const op = (morningPayload?.opportunities||[]).find(x=>x.symbol===sym);
  return Number(op?.price || 0);
}
function portfolioRows(){
  return loadPortfolio().map(p=>{
    const price = priceOf(p.symbol) || Number(p.avgPrice || 0);
    const qty = Number(p.qty || 0), avg = Number(p.avgPrice || 0);
    const cost = qty*avg, value = qty*price, pnl = value-cost;
    return {...p,price,qty,avgPrice:avg,cost,value,pnl,pnlPct:cost?pnl/cost*100:0};
  });
}
function addOrUpdatePortfolio(){
  const sym = ($("pfSymbol")?.value || "").trim().toUpperCase();
  const qty = Number($("pfQty")?.value || 0);
  const avg = Number($("pfAvg")?.value || 0);
  if(!sym || qty<=0 || avg<=0){ alert("กรอก Symbol / จำนวน / ราคาเฉลี่ย ให้ครบก่อนครับ"); return; }
  const p = loadPortfolio();
  const i = p.findIndex(x=>x.symbol===sym);
  const item = {symbol:sym, qty, avgPrice:avg, updatedAt:new Date().toISOString()};
  if(i>=0) p[i]=item; else p.push(item);
  savePortfolio(p);
  renderMorningDashboard();
}
function clearPortfolio(){
  if(confirm("ล้างพอร์ตทั้งหมด?")){ savePortfolio([]); renderMorningDashboard(); }
}
function exportPortfolioCSV(){
  const rows=portfolioRows();
  const csv=["Symbol,Qty,Avg,Now,Cost,Value,PnL,PnL%"].concat(rows.map(r=>[
    r.symbol,r.qty,r.avgPrice,r.price,r.cost,r.value,r.pnl,r.pnlPct
  ].join(","))).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="morning-portfolio.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function mAction(a){
  const map={BUY_ZONE:"เข้าโซน",WATCH:"รอจังหวะ",WAIT:"รอ",AVOID:"เลี่ยง"};
  return `<span class="badge ${a==='BUY_ZONE'?'buy':a==='AVOID'?'sell':'hold'}">${map[a]||a}</span>`;
}

async function loadMorning(){
  const status=$("morningStatus");
  if(status) status.textContent="กำลังวิเคราะห์ตลาด...";
  try{
    morningPayload=await api("/api/morning",30000);
    renderMorningDashboard();
    if(status) status.textContent="อัปเดตล่าสุด "+new Date(morningPayload.time).toLocaleTimeString();
  }catch(e){
    if(status) status.textContent="โหลดข้อมูลไม่สำเร็จ: "+e.message;
    const box=$("topOppBox");
    if(box) box.innerHTML='<div class="empty">โหลดข้อมูลไม่สำเร็จ: '+esc(e.message)+'</div>';
  }
}

function renderMorningDashboard(){
  const p=morningPayload;
  if(!p) return;

  const pf=portfolioRows();
  const totalCost=pf.reduce((s,x)=>s+x.cost,0);
  const totalValue=pf.reduce((s,x)=>s+x.value,0);
  const pnl=totalValue-totalCost;
  const roi=totalCost?pnl/totalCost*100:0;

  if($("marketScore")) $("marketScore").textContent=(p.summary?.marketScore||0)+"/100";
  if($("fearGreed")) $("fearGreed").textContent=p.market?.fng??"-";
  if($("marketRisk")) $("marketRisk").textContent=p.market?.risk||"-";
  if($("oppCount")) $("oppCount").textContent=p.summary?.totalOpportunities ?? (p.opportunities||[]).length;
  if($("portfolioValue")) $("portfolioValue").textContent=money(totalValue,2);
  if($("portfolioPL")) $("portfolioPL").innerHTML=`<span class="${pnl>=0?'pnl-pos':'pnl-neg'}">${money(pnl,2)} (${fmt(roi,2)}%)</span>`;

  const ops=p.opportunities||[];
  if($("topOppBox")){
    $("topOppBox").innerHTML=ops.slice(0,12).map((x,i)=>`
      <div class="morning-row">
        <div class="rank">${i+1}</div>
        <div><b>${esc(x.symbol)}</b><small>${esc(x.name)}</small></div>
        <div>${mAction(x.daily?.action)}</div>
        <div><b>${x.daily?.score ?? "-"}</b><small>Score</small></div>
        <div><b>${x.daily?.probability ?? "-"}%</b><small>Prob</small></div>
        <div><b>${money(x.price,4)}</b><small>${fmt(x.change24h,2)}%</small></div>
        <div><b>${money(x.entry,4)}</b><small>Entry</small></div>
        <div class="pnl-neg"><b>${money(x.sl,4)}</b><small>SL</small></div>
        <div class="pnl-pos"><b>${money(x.tp1,4)}</b><small>TP1</small></div>
      </div>
    `).join("") || '<div class="empty">ยังไม่มีเหรียญเข้าเกณฑ์</div>';
  }

  if($("coachBox")){
    $("coachBox").innerHTML='<ol>'+((p.coach||[]).map(x=>`<li>${esc(x)}</li>`).join(""))+'</ol>';
  }

  if($("alertsBox")){
    $("alertsBox").innerHTML=(p.alerts||[]).slice(0,12).map(a=>`
      <div class="alert-line"><b>${esc(a.symbol)}</b> <span>${esc(a.type)}</span><p>${esc(a.message)}</p></div>
    `).join("") || '<div class="empty">ยังไม่มี Alert สำคัญ</div>';
  }

  renderPortfolio();
}
function renderPortfolio(){
  const rows=portfolioRows();
  const sum=$("portfolioSummary"), box=$("portfolioBox");
  if(!sum || !box) return;
  if(!rows.length){
    sum.textContent="ยังไม่มีข้อมูลพอร์ต";
    box.innerHTML="";
    return;
  }
  const totalCost=rows.reduce((s,x)=>s+x.cost,0), totalValue=rows.reduce((s,x)=>s+x.value,0), pnl=totalValue-totalCost;
  sum.innerHTML=`มูลค่าพอร์ต: <b>${money(totalValue,2)}</b> | ต้นทุน: <b>${money(totalCost,2)}</b> | P/L: <b class="${pnl>=0?'pnl-pos':'pnl-neg'}">${money(pnl,2)}</b>`;
  box.innerHTML='<table><thead><tr><th>เหรียญ</th><th>จำนวน</th><th>ทุนเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>มูลค่า</th><th>P/L</th></tr></thead><tbody>'+
    rows.map(r=>`<tr><td><b>${esc(r.symbol)}</b></td><td>${fmt(r.qty,6)}</td><td>${money(r.avgPrice,4)}</td><td>${money(r.price,4)}</td><td>${money(r.value,2)}</td><td class="${r.pnl>=0?'pnl-pos':'pnl-neg'}">${money(r.pnl,2)} (${fmt(r.pnlPct,2)}%)</td></tr>`).join("")+
    '</tbody></table>';
}
function init(){
  $("addPortfolio")?.addEventListener("click",addOrUpdatePortfolio);
  $("clearPortfolio")?.addEventListener("click",clearPortfolio);
  $("exportPortfolio")?.addEventListener("click",exportPortfolioCSV);
  $("currencySelect")?.addEventListener("change",()=>{localStorage.setItem("currency",currency());renderMorningDashboard();});
  loadMorning();
  setInterval(loadMorning,120000);
}
document.addEventListener("DOMContentLoaded",init);
