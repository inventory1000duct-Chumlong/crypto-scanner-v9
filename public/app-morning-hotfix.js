
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


let selectedPortfolioSymbol=null, chartTf="1h";
async function loadPortfolioChart(symbol){
  symbol=(symbol||selectedPortfolioSymbol||loadPortfolio()[0]?.symbol||"BTC").toUpperCase(); selectedPortfolioSymbol=symbol;
  const box=$("portfolioChartBox"), panel=$("tpPanelBox"); if(!box||!panel)return;
  box.innerHTML='<div class="empty">กำลังโหลดกราฟ '+esc(symbol)+'...</div>';
  try{ const data=await api(`/api/portfolio/chart/${encodeURIComponent(symbol)}?tf=${encodeURIComponent(chartTf)}`,20000);
    const pf=portfolioRows().find(x=>x.symbol===data.symbol); const levels={...data.levels, avg:pf?.avgPrice};
    box.innerHTML=drawPortfolioCandles(data.candles,levels,data.symbol); renderTPPanel(data,levels,pf);
  }catch(e){box.innerHTML='<div class="empty">โหลดกราฟไม่ได้: '+esc(e.message)+'</div>'; panel.innerHTML='';}
}
function drawPortfolioCandles(candles,levels,symbol){
  const w=980,h=360,topH=285, vals=candles.flatMap(c=>[c.high,c.low]).concat(Object.values(levels).filter(v=>Number.isFinite(Number(v))).map(Number));
  const min=Math.min(...vals)*0.997,max=Math.max(...vals)*1.003, y=v=>topH-16-((Number(v)-min)/(max-min||1))*(topH-34), step=(w-70)/candles.length, x=i=>48+i*step+step/2;
  const maxVol=Math.max(...candles.map(c=>c.volume||0),1);
  const grid=[0,.25,.5,.75,1].map(t=>`<line x1="42" y1="${18+t*(topH-36)}" x2="${w-16}" y2="${18+t*(topH-36)}" stroke="#17243a"/>`).join("");
  const cs=candles.map((c,i)=>{const up=c.close>=c.open,color=up?"#22c55e":"#fb7185",cx=x(i),bw=Math.max(3,step*.55),top=y(Math.max(c.open,c.close)),bot=y(Math.min(c.open,c.close)),vh=((c.volume||0)/maxVol)*48;return `<line x1="${cx}" y1="${y(c.high)}" x2="${cx}" y2="${y(c.low)}" stroke="${color}" stroke-width="1.4"/><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${Math.max(2,bot-top)}" fill="${color}" rx="1"/><rect x="${cx-bw/2}" y="${topH+58-vh}" width="${bw}" height="${vh}" fill="${color}" opacity=".45"/>`;}).join("");
  const last=candles.at(-1)?.close||0, levelList=[["TP3",levels.tp3,"#00e7c1"],["TP2",levels.tp2,"#3b82f6"],["TP1",levels.tp1,"#60a5fa"],["AVG",levels.avg,"#facc15"],["ENTRY",levels.entry,"#38bdf8"],["NOW",last,"#e6edf7"],["SL",levels.sl,"#fb7185"]].filter(x=>Number.isFinite(Number(x[1])));
  const lines=levelList.map(([label,val,color])=>`<line x1="42" y1="${y(val)}" x2="${w-16}" y2="${y(val)}" stroke="${color}" stroke-dasharray="6 5" stroke-width="1.2"/><text x="${w-20}" y="${y(val)-5}" text-anchor="end" fill="${color}" font-size="12">${label} ${money(val,4)}</text>`).join("");
  return `<div class="chart-title-row"><div><h3>${esc(symbol)} Candlestick + TP</h3><p>เส้น AVG / ENTRY / NOW / SL / TP แสดงบนกราฟ</p></div><div class="chart-live-badge">PORTFOLIO</div></div><svg class="portfolio-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#07101f"/>${grid}<text x="48" y="14" fill="#9fb3d9" font-size="12">${esc(symbol)} • Last ${money(last,4)}</text>${cs}${lines}<text x="48" y="${topH+18}" fill="#9fb3d9" font-size="12">Volume</text></svg>`;
}
function renderTPPanel(data,levels,pf){
  const panel=$("tpPanelBox"); if(!panel)return; const now=Number(data.price||data.candles?.at(-1)?.close||0), qty=Number(pf?.qty||0), avg=Number(pf?.avgPrice||levels.avg||levels.entry||now), calc=t=>qty?(Number(t)-avg)*qty:null;
  const rows=[["TP3",levels.tp3,"pnl-pos"],["TP2",levels.tp2,"pnl-pos"],["TP1",levels.tp1,"pnl-pos"],["ENTRY",levels.entry,""],["AVG",avg,""],["NOW",now,""],["SL",levels.sl,"pnl-neg"]];
  panel.innerHTML='<h3>TP / SL Panel</h3>'+rows.map(([name,val,cls])=>`<div class="tp-line"><span>${name}</span><b class="${cls}">${money(val,4)}</b>${qty&&["TP1","TP2","TP3","SL"].includes(name)?`<small class="${calc(val)>=0?'pnl-pos':'pnl-neg'}">${money(calc(val),2)}</small>`:""}</div>`).join("")+`<div class="summary">Position: ${pf?`${esc(pf.symbol)} • ${fmt(qty,6)} เหรียญ • Avg ${money(avg,4)}`:"ยังไม่ได้เลือกเหรียญในพอร์ต"}</div>`;
}
const __oldRenderPortfolio=renderPortfolio;
renderPortfolio=function(){__oldRenderPortfolio(); const rows=portfolioRows(), box=$("portfolioBox"); if(box&&rows.length){box.querySelectorAll("tr").forEach((tr,i)=>{if(i>0){const sym=rows[i-1]?.symbol; tr.style.cursor="pointer"; tr.title="คลิกเพื่อเปิดกราฟ "+sym; tr.onclick=()=>loadPortfolioChart(sym);}});} if(rows.length&&!selectedPortfolioSymbol)loadPortfolioChart(rows[0].symbol);}
const __oldAddOrUpdatePortfolio=addOrUpdatePortfolio;
addOrUpdatePortfolio=function(){__oldAddOrUpdatePortfolio(); const sym=($("pfSymbol")?.value||"").trim().toUpperCase(); if(sym)setTimeout(()=>loadPortfolioChart(sym),400);}
