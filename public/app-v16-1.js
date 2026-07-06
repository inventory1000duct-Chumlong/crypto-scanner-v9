(() => {
"use strict";
const $=id=>document.getElementById(id);
const fmt=(n,d=2)=>Number.isFinite(+n)?(+n).toLocaleString(undefined,{maximumFractionDigits:d}):"-";
let fxRate=36.5;
const currency=()=>($("currencySelect")?.value||"THB");
const moneyUSD=(v,d=2)=>Number.isFinite(+v)?"$"+fmt(+v,d):"-";
const moneyTHB=(v,d=2)=>Number.isFinite(+v)?"฿"+fmt((+v)*fxRate,d):"-";
const money=(v,d=2)=>currency()==="THB"?moneyTHB(v,d):moneyUSD(v,d);
async function loadFX(){try{const r=await api("/api/fx",12000); if(r.rate)fxRate=+r.rate;}catch(e){fxRate=36.5}}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let rows=[],payload=null,topPick=null,versionInfo={};
function showError(m){const e=$("errorBanner");e.style.display="block";e.textContent="⚠️ "+m}
function clearError(){const e=$("errorBanner");e.style.display="none";e.textContent=""}
function setStatus(mode,text){$("dot").className="dot "+(mode==="ok"?"ok":mode==="err"?"err":"");$("status").textContent=text}
function setQuality(q){const el=$("qualityBadge");el.className="";if(q==="LIVE"){el.classList.add("live");el.textContent="LIVE"}else if(q==="CACHE"||q==="STALE"){el.classList.add("cache");el.textContent=q}else if(q==="DEMO"){el.classList.add("demo");el.textContent="DEMO"}else el.textContent=q||"WAIT"}
async function api(path,timeoutMs=45000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(path,{cache:"no-store",signal:c.signal,headers:{"content-type":"application/json"}});const txt=await r.text();if(!r.ok)throw Error(r.status+" "+txt.slice(0,260));return JSON.parse(txt)}finally{clearTimeout(t)}}
async function post(path,body){const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const txt=await r.text();if(!r.ok)throw Error(txt);return JSON.parse(txt)}
function badge(action){const c=action.includes("BUY")?"buy":action.includes("WAIT")||action.includes("WATCH")||action.includes("SMALL")?"wait":"avoid";return `<span class="badge ${c}">${esc(action)}</span>`}
function kpi(a,b){return `<div class="kpi"><span>${esc(a)}</span><b>${esc(b)}</b></div>`}
function activateTabs(){document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".pane").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");renderAll()})}
async function loadVersion(){versionInfo=await api("/api/version",12000);$("versionBadge").textContent="V"+versionInfo.version+" "+versionInfo.edition;$("backendVer").textContent="V"+versionInfo.version}
async function scan(){clearError();setStatus("","กำลังวิเคราะห์ Decision...");setQuality("WAIT");try{payload=await api("/api/terminal?limit="+$("limit").value);rows=payload.rows||[];topPick=payload.topOpportunity||rows[0];$("regime").textContent=payload.market?.regime||"-";$("riskMode").textContent=payload.market?.risk||"-";$("fng").textContent=payload.market?.fng??"-";setQuality(payload.dataQuality);renderAll();setStatus("ok","วิเคราะห์สำเร็จ • "+rows.length+" เหรียญ")}catch(e){showError(e.message||String(e));setStatus("err","ผิดพลาด")}}
function renderAll(){renderSummary();renderPick();renderRows();renderPortfolioPL();renderJournal();renderExplain();renderRisk()}
function renderSummary(){const s=payload?.summary;if(!s){$("summaryBox").textContent="";return}$("summaryBox").innerHTML=`<b>Decision Brief:</b> ${esc(s.summaryText)} | Buy ${s.buyCount} | Watch ${s.watchCount} | Avoid ${s.avoidCount}`}
function renderPick(){const p=topPick;if(!p){$("pick").className="pick empty";$("pick").textContent="ยังไม่มีข้อมูล";return}$("pick").className="pick";const d=p.decisionAI;$("pick").innerHTML=`<div class="head"><div><div class="sym">${esc(p.symbol)}</div><div class="sub">${esc(p.name)} • ${esc(p.sector)} • $${fmt(p.price,6)}</div></div>${badge(d.action)}</div><div class="kpis">${kpi("Decision Score",d.decisionScore)}${kpi("Grade",p.grade)}${kpi("EV",fmt(p.quant.expectedValue,2))}${kpi("Win",p.quant.winProb+"%")}${kpi("Risk",d.riskLevel)}${kpi("Kelly",p.quant.kelly)}</div><div class="summary"><b>AI Trade Brief:</b><br>${esc(d.tradeBrief)}</div><div class="grid">${d.drivers.slice(0,3).map(x=>`<div class="factor ok"><b>${esc(x.factor)}</b><p>Score ${x.score} / Impact +${x.impact}<br>${esc(x.meaning)}</p></div>`).join("")}</div>`}
function renderRows(){const q=$("q").value.trim().toUpperCase();const list=rows.filter(x=>!q||x.symbol.includes(q)||x.name.toUpperCase().includes(q));$("rows").innerHTML=list.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.symbol)}</b><br><small>${esc(x.name)}</small></td><td>${x.decisionAI.decisionScore}</td><td>${esc(x.decisionAI.verdict)}</td><td>${esc(x.grade)}</td><td>${fmt(x.quant.expectedValue,2)}</td><td>${esc(x.decisionAI.riskLevel)}</td><td>${badge(x.decisionAI.action)}</td></tr>`).join("")||'<tr><td colspan="8" class="empty">ไม่พบข้อมูล</td></tr>'}
function renderExplain(){const p=topPick;if(!p){$("explainBox").textContent="ยังไม่มีข้อมูล";return}const d=p.decisionAI;$("explainBox").className="pick";$("explainBox").innerHTML=`<h3>${esc(p.symbol)} Explainable AI</h3><div class="grid">${d.drivers.map(x=>`<div class="factor"><h3>${esc(x.factor)}</h3><p>Score: ${x.score}<br>Impact: +${x.impact}<br>${esc(x.meaning)}</p></div>`).join("")}</div><pre>${esc(JSON.stringify(p.xai,null,2))}</pre>`}
function renderRisk(){const p=topPick;if(!p){$("riskBox").textContent="ยังไม่มีข้อมูล";return}const d=p.decisionAI;$("riskBox").className="pick";$("riskBox").innerHTML=`<h3>${esc(p.symbol)} Risk & Conditions</h3><div class="grid"><div class="riskitem warn"><h3>Blockers</h3>${(d.blockers.length?d.blockers:["ไม่มีจุดเสี่ยงหลัก"]).map(x=>`<p>• ${esc(x)}</p>`).join("")}</div><div class="riskitem ok"><h3>Entry Checklist</h3>${d.entryChecklist.map(x=>`<p>• ${esc(x)}</p>`).join("")}</div><div class="riskitem err"><h3>Invalidation</h3>${d.invalidations.map(x=>`<p>• ${esc(x)}</p>`).join("")}</div></div>`}


function candleSeries(item){
 const m=item.market;
 const price=item.currentPrice||item.avgPrice||1;
 const low=Math.min(m?.low24h||price*0.97, price*0.97, item.avgPrice*0.98);
 const high=Math.max(m?.high24h||price*1.03, price*1.03, item.avgPrice*1.02);
 const seed=item.symbol.split("").reduce((s,c)=>s+c.charCodeAt(0),0);
 const out=[];
 let last=item.avgPrice || price;
 for(let i=0;i<24;i++){
   const wave=Math.sin((i+seed)/3)*0.012 + Math.cos((i+seed)/5)*0.007;
   const open=last;
   const close=Math.max(low,Math.min(high, open*(1+wave+(i/24)*(price/item.avgPrice-1)/12)));
   const hi=Math.min(high, Math.max(open,close)*(1+0.006+(i%5)*0.001));
   const lo=Math.max(low, Math.min(open,close)*(1-0.006-(i%4)*0.001));
   out.push({open,high:hi,low:lo,close});
   last=close;
 }
 out.push({open:last,high:Math.max(last,price)*1.006,low:Math.min(last,price)*0.994,close:price});
 return out;
}
function drawCandleSVG(item, w=620, h=240){
 const data=candleSeries(item);
 const prices=data.flatMap(d=>[d.high,d.low,item.avgPrice,item.market?.tp1,item.market?.tp2,item.market?.tp3,item.market?.sl]).filter(Number.isFinite);
 const min=Math.min(...prices)*0.995, max=Math.max(...prices)*1.005;
 const y=v=>h-24-((v-min)/(max-min||1))*(h-48);
 const step=(w-54)/data.length;
 const x=i=>36+i*step+step/2;
 const grid=[0,0.25,0.5,0.75,1].map(t=>{const yy=18+t*(h-46);return `<line x1="32" y1="${yy}" x2="${w-16}" y2="${yy}" stroke="#17243a" stroke-width="1"/>`;}).join("");
 const candles=data.map((d,i)=>{const up=d.close>=d.open, cx=x(i), bw=Math.max(4,step*.55);const color=up?"#22c55e":"#fb7185";const top=y(Math.max(d.open,d.close)), bot=y(Math.min(d.open,d.close));return `<line x1="${cx}" y1="${y(d.high)}" x2="${cx}" y2="${y(d.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${Math.max(2,bot-top)}" fill="${color}" rx="1"/>`;}).join("");
 const levels=[["AVG",item.avgPrice,"#facc15"],["NOW",item.currentPrice,"#e6edf7"],["ENTRY",item.market?.entryHigh,"#38bdf8"],["SL",item.market?.sl,"#fb7185"],["TP1",item.market?.tp1,"#60a5fa"],["TP2",item.market?.tp2,"#3b82f6"],["TP3",item.market?.tp3,"#00e7c1"]].filter(x=>Number.isFinite(x[1]));
 const levelLines=levels.map(([label,val,color])=>`<line x1="32" y1="${y(val)}" x2="${w-16}" y2="${y(val)}" stroke="${color}" stroke-dasharray="5 4" stroke-width="1"/>`).join("");
 return `<svg class="candlechart clean" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#07101f"/>${grid}<line x1="32" y1="14" x2="32" y2="${h-24}" stroke="#26354f"/><line x1="32" y1="${h-24}" x2="${w-16}" y2="${h-24}" stroke="#26354f"/>${candles}${levelLines}</svg>`;
}
function levelPanel(item){
 const m=item.market||{};
 const levels=[["TP3",m.tp3,"#00e7c1",tpProfit(item,m.tp3)],["TP2",m.tp2,"#3b82f6",tpProfit(item,m.tp2)],["TP1",m.tp1,"#60a5fa",tpProfit(item,m.tp1)],["ENTRY",m.entryHigh,"#38bdf8",null],["NOW",item.currentPrice,"#e6edf7",null],["AVG",item.avgPrice,"#facc15",null],["SL",m.sl,"#fb7185",m.sl?{profit:(m.sl-item.avgPrice)*item.qty,pct:((m.sl-item.avgPrice)/item.avgPrice)*100}:null]].filter(x=>Number.isFinite(x[1]));
 return `<div class="chartpanel"><h3>TP / SL Panel</h3>${levels.map(([label,val,color,profit])=>`<div class="levelrow"><span><i class="level-dot" style="background:${color}"></i>${label}</span><b>${money(val,4)}</b></div>${profit?`<div class="levelrow"><span>${label} P/L</span><b class="${profit.profit>=0?'pnl-pos':'pnl-neg'}">${money(profit.profit,2)} / ${fmt(profit.pct,2)}%</b></div>`:""}`).join("")}</div>`;
}
function tpProfit(item,tp){
 const qty=item.qty||0, avg=item.avgPrice||0;
 if(!Number.isFinite(tp)||!qty||!avg)return {profit:0,pct:0};
 const profit=(tp-avg)*qty;
 const pct=((tp-avg)/avg)*100;
 return {profit,pct};
}

function loadPortfolio(){try{return JSON.parse(localStorage.getItem("personalPortfolio")||"[]")}catch(e){return[]}}
function savePortfolio(p){localStorage.setItem("personalPortfolio",JSON.stringify(p))}
function addHolding(){
 const symbol=($("pfSymbol").value||"").trim().toUpperCase();
 const qty=+($("pfQty").value||0);
 const avg=+($("pfAvg").value||0);
 if(!symbol||qty<=0||avg<=0){showError("กรุณากรอก Symbol, จำนวน, ราคาเฉลี่ย ให้ถูกต้อง");return}
 const p=loadPortfolio();
 const idx=p.findIndex(x=>x.symbol===symbol);
 const item={symbol,qty,avgPrice:avg,updatedAt:new Date().toISOString()};
 if(idx>=0)p[idx]=item;else p.push(item);
 savePortfolio(p); renderPortfolioPL();
 $("pfSymbol").value=""; $("pfQty").value=""; $("pfAvg").value="";
}
function clearPortfolio(){savePortfolio([]);renderPortfolioPL()}
function portfolioRows(){
 const holdings=loadPortfolio();
 return holdings.map(h=>{
   const m=rows.find(x=>x.symbol===h.symbol);
   const current=m?.price||0;
   const cost=h.qty*h.avgPrice;
   const value=current?h.qty*current:0;
   const pnl=value-cost;
   const pnlPct=cost?((pnl/cost)*100):0;
   return {...h,currentPrice:current,cost,value,pnl,pnlPct,market:m||null};
 });
}
function renderPortfolioPL(){
 const box=$("portfolioBox"), sum=$("portfolioSummary"), charts=$("portfolioCharts");
 if(!box||!sum)return;
 const data=portfolioRows();
 if(!data.length){
   sum.textContent="ยังไม่มีรายการพอร์ตส่วนตัว";
   if(charts)charts.innerHTML="";
   box.innerHTML='<div class="empty">เพิ่มเหรียญที่ถืออยู่ด้านบน</div>';
   return;
 }
 const totalCost=data.reduce((s,x)=>s+x.cost,0);
 const totalValue=data.reduce((s,x)=>s+x.value,0);
 const totalPnl=totalValue-totalCost;
 const totalPct=totalCost?totalPnl/totalCost*100:0;
 const winners=data.filter(x=>x.pnl>0).length;
 const losers=data.filter(x=>x.pnl<0).length;
 const best=data.slice().sort((a,b)=>b.pnl-a.pnl)[0];
 const worst=data.slice().sort((a,b)=>a.pnl-b.pnl)[0];
 sum.innerHTML=`<b>มูลค่าพอร์ต:</b> ${money(totalValue,2)} | <b>ต้นทุน:</b> ${money(totalCost,2)} | <b>P/L:</b> <span class="${totalPnl>=0?'pnl-pos':'pnl-neg'}">${money(totalPnl,2)} (${fmt(totalPct,2)}%)</span> | ชนะ ${winners} / ขาดทุน ${losers}`;
 if(charts){
   charts.className="chartgrid v16";
   charts.innerHTML='<div class="portfolio-kpis">'+
     `<div class="portfolio-kpi"><span>Current Value</span><b>${money(totalValue,2)}</b></div>`+
     `<div class="portfolio-kpi"><span>Cost</span><b>${money(totalCost,2)}</b></div>`+
     `<div class="portfolio-kpi"><span>Total P/L</span><b class="${totalPnl>=0?'pnl-pos':'pnl-neg'}">${money(totalPnl,2)}</b></div>`+
     `<div class="portfolio-kpi"><span>ROI</span><b class="${totalPnl>=0?'pnl-pos':'pnl-neg'}">${fmt(totalPct,2)}%</b></div>`+
     `<div class="portfolio-kpi"><span>Best / Worst</span><b>${esc(best.symbol)} / ${esc(worst.symbol)}</b></div>`+
   '</div>'+
   data.map(x=>{
     const m=x.market||{};
     return `<div class="chartcard v16"><div><div class="charthead"><div><div class="charttitle">${esc(x.symbol)} Professional Chart</div><div class="sub">${esc(m.name||"ไม่พบในผลสแกน")} • Avg ${money(x.avgPrice,4)} • Now ${x.currentPrice?money(x.currentPrice,4):'-'}</div></div><div class="chartmeta ${x.pnl>=0?'pnl-pos':'pnl-neg'}">${x.value?'P/L '+money(x.pnl,2)+'<br>'+fmt(x.pnlPct,2)+'%':'No price'}</div></div>${drawCandleSVG(x)}</div>${levelPanel(x)}</div>`;
   }).join("");
 }
 box.innerHTML='<table><thead><tr><th>เหรียญ</th><th>จำนวน</th><th>ราคาเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>ต้นทุน</th><th>มูลค่า</th><th>P/L</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>Decision</th></tr></thead><tbody>'+
 data.map(x=>{
   const m=x.market||{};
   const tp1=tpProfit(x,m.tp1), tp2=tpProfit(x,m.tp2), tp3=tpProfit(x,m.tp3);
   return `<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(m.name||"ไม่พบในผลสแกน")}</small></td><td>${fmt(x.qty,8)}</td><td>${money(x.avgPrice,4)}</td><td>${x.currentPrice?money(x.currentPrice,4):'-'}</td><td>${money(x.cost,2)}</td><td>${x.value?money(x.value,2):'-'}</td><td class="${x.pnl>=0?'pnl-pos':'pnl-neg'}">${x.value?money(x.pnl,2)+' ('+fmt(x.pnlPct,2)+'%)':'-'}</td><td>${m.sl?money(m.sl,4):'-'}</td><td>${m.tp1?money(m.tp1,4)+'<br><small>'+money(tp1.profit,2)+'</small>':'-'}</td><td>${m.tp2?money(m.tp2,4)+'<br><small>'+money(tp2.profit,2)+'</small>':'-'}</td><td>${m.tp3?money(m.tp3,4)+'<br><small>'+money(tp3.profit,2)+'</small>':'-'}</td><td>${m.decisionAI?badge(m.decisionAI.action):'-'}</td></tr>`;
 }).join("")+'</tbody></table>';
}

function exportPortfolioCSV(){
 const data=portfolioRows();
 if(!data.length){showError("ไม่มีข้อมูลพอร์ตสำหรับ Export");return}
 const cols=["symbol","qty","avgPrice","currentPrice","cost","value","pnl","pnlPct","sl","tp1","tp2","tp3","decision","grade","fxRate","currency"];
 const lines=[cols.join(",")].concat(data.map(x=>[x.symbol,x.qty,x.avgPrice,x.currentPrice,x.cost,x.value,x.pnl,x.pnlPct,x.market?.sl||"",x.market?.tp1||"",x.market?.tp2||"",x.market?.tp3||"",x.market?.decisionAI?.action||"",x.market?.grade||"",fxRate,currency()].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")));
 const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="personal-portfolio-v16-thb-usd.csv";a.click();URL.revokeObjectURL(a.href);
}


function loadTrades(){try{return JSON.parse(localStorage.getItem("tradeJournal")||"[]")}catch(e){return[]}}
function saveTrades(t){localStorage.setItem("tradeJournal",JSON.stringify(t))}
function setDefaultTradeDate(){const el=$("tradeDate");if(!el||el.value)return;const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());el.value=d.toISOString().slice(0,16)}
function addTrade(){
 const side=$("tradeSide").value, symbol=($("tradeSymbol").value||"").trim().toUpperCase();
 const qty=+($("tradeQty").value||0), price=+($("tradePrice").value||0), fee=+($("tradeFee").value||0);
 const date=$("tradeDate").value||new Date().toISOString(), note=$("tradeNote").value||"";
 if(!symbol||qty<=0||price<=0){showError("กรุณากรอก Symbol, จำนวน, ราคา ให้ถูกต้อง");return}
 const trades=loadTrades();
 trades.push({id:Date.now()+"-"+Math.random().toString(16).slice(2),date,side,symbol,qty,price,fee,note});
 saveTrades(trades);
 $("tradeSymbol").value="";$("tradeQty").value="";$("tradePrice").value="";$("tradeFee").value="0";$("tradeNote").value="";
 setDefaultTradeDate(); renderJournal();
}
function clearTrades(){if(confirm("ต้องการล้างประวัติการเทรดทั้งหมดใช่ไหม?")){saveTrades([]);renderJournal()}}
function tradeCalc(){
 const trades=loadTrades().slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
 const pos={}, closed=[]; let totalFees=0,totalBuy=0,totalSell=0,realized=0;
 for(const t of trades){
   totalFees+=+(t.fee||0);
   if(!pos[t.symbol])pos[t.symbol]={qty:0,cost:0,realized:0,fees:0};
   const p=pos[t.symbol];
   if(t.side==="BUY"){
     const gross=t.qty*t.price;
     p.qty+=t.qty; p.cost+=gross+(t.fee||0); p.fees+=(t.fee||0); totalBuy+=gross;
   }else{
     const sellQty=Math.min(t.qty,p.qty);
     const avgCost=p.qty>0?p.cost/p.qty:0;
     const costBasis=avgCost*sellQty;
     const gross=t.qty*t.price;
     const pnl=gross-costBasis-(t.fee||0);
     p.qty-=sellQty; p.cost-=costBasis; p.realized+=pnl; p.fees+=(t.fee||0);
     realized+=pnl; totalSell+=gross;
     closed.push({...t,avgCost,costBasis,pnl,pnlPct:costBasis?100*pnl/costBasis:0});
   }
 }
 const open=Object.entries(pos).map(([symbol,p])=>{
   const m=rows.find(x=>x.symbol===symbol);
   const current=m?.price||0, avgCost=p.qty>0?p.cost/p.qty:0, value=current*p.qty, unreal=value-p.cost;
   return {symbol,qty:p.qty,cost:p.cost,avgCost,current,value,unreal,realized:p.realized,fees:p.fees,market:m||null};
 }).filter(x=>Math.abs(x.qty)>1e-12);
 return {trades,closed,open,totalFees,totalBuy,totalSell,realized};
}
function renderJournal(){
 const box=$("journalBox"), sum=$("journalSummary");
 if(!box||!sum)return;
 setDefaultTradeDate();
 const c=tradeCalc();
 const unreal=c.open.reduce((s,x)=>s+x.unreal,0);
 const openValue=c.open.reduce((s,x)=>s+x.value,0);
 const net=c.realized+unreal;
 const wins=c.closed.filter(x=>x.pnl>0).length, losses=c.closed.filter(x=>x.pnl<0).length;
 const winRate=c.closed.length?wins/c.closed.length*100:0;
 sum.innerHTML='<div class="journal-kpis">'+
   `<div class="journal-kpi"><span>Realized P/L</span><b class="${c.realized>=0?'pnl-pos':'pnl-neg'}">${money(c.realized,2)}</b></div>`+
   `<div class="journal-kpi"><span>Unrealized P/L</span><b class="${unreal>=0?'pnl-pos':'pnl-neg'}">${money(unreal,2)}</b></div>`+
   `<div class="journal-kpi"><span>Net P/L</span><b class="${net>=0?'pnl-pos':'pnl-neg'}">${money(net,2)}</b></div>`+
   `<div class="journal-kpi"><span>Fees</span><b>${money(c.totalFees,2)}</b></div>`+
   `<div class="journal-kpi"><span>Win Rate</span><b>${fmt(winRate,1)}%</b></div>`+
   `<div class="journal-kpi"><span>Open Value</span><b>${money(openValue,2)}</b></div>`+
 '</div>';
 if(!c.trades.length){box.innerHTML='<div class="empty">ยังไม่มีประวัติการซื้อขาย</div>';return}
 const closedMap=Object.fromEntries(c.closed.map(x=>[x.id,x]));
 const history=c.trades.slice().reverse();
 box.innerHTML='<table><thead><tr><th>วันที่</th><th>ประเภท</th><th>เหรียญ</th><th>จำนวน</th><th>ราคา</th><th>มูลค่า</th><th>Fee</th><th>Realized P/L</th><th>หมายเหตุ</th><th>ลบ</th></tr></thead><tbody>'+
 history.map(t=>{
   const closed=closedMap[t.id], value=t.qty*t.price;
   return `<tr><td>${esc(String(t.date).replace("T"," "))}</td><td class="${t.side==="BUY"?'side-buy':'side-sell'}">${t.side}</td><td><b>${esc(t.symbol)}</b></td><td>${fmt(t.qty,8)}</td><td>${money(t.price,4)}</td><td>${money(value,2)}</td><td>${money(t.fee||0,2)}</td><td class="${(closed?.pnl||0)>=0?'pnl-pos':'pnl-neg'}">${closed?money(closed.pnl,2)+' ('+fmt(closed.pnlPct,2)+'%)':'-'}</td><td>${esc(t.note||"")}</td><td><button onclick="window.deleteTrade('${t.id}')">ลบ</button></td></tr>`;
 }).join("")+'</tbody></table>'+
 '<h3>Open Positions จากประวัติซื้อขาย</h3><table><thead><tr><th>เหรียญ</th><th>จำนวนคงเหลือ</th><th>ต้นทุนเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>ต้นทุน</th><th>มูลค่า</th><th>Unrealized</th><th>Decision</th></tr></thead><tbody>'+
 (c.open.map(x=>`<tr><td><b>${esc(x.symbol)}</b></td><td>${fmt(x.qty,8)}</td><td>${money(x.avgCost,4)}</td><td>${x.current?money(x.current,4):'-'}</td><td>${money(x.cost,2)}</td><td>${money(x.value,2)}</td><td class="${x.unreal>=0?'pnl-pos':'pnl-neg'}">${money(x.unreal,2)}</td><td>${x.market?badge(x.market.decisionAI.action):'-'}</td></tr>`).join("")||'<tr><td colspan="8" class="empty">ไม่มี Position คงเหลือ</td></tr>')+
 '</tbody></table>';
}
window.deleteTrade=function(id){saveTrades(loadTrades().filter(x=>x.id!==id));renderJournal()}
function exportTradesCSV(){
 const c=tradeCalc();
 if(!c.trades.length){showError("ไม่มีประวัติการเทรดสำหรับ Export");return}
 const closedMap=Object.fromEntries(c.closed.map(x=>[x.id,x]));
 const cols=["date","side","symbol","qty","price","value","fee","realizedPnl","realizedPct","note","fxRate","currency"];
 const lines=[cols.join(",")].concat(c.trades.map(t=>{
   const cl=closedMap[t.id], value=t.qty*t.price;
   return [t.date,t.side,t.symbol,t.qty,t.price,value,t.fee||0,cl?.pnl??"",cl?.pnlPct??"",t.note||"",fxRate,currency()].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",");
 }));
 const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="trade-journal-v16-1.csv";a.click();URL.revokeObjectURL(a.href);
}

async function askAI(){$("aiBox").textContent="AI กำลังวิเคราะห์...";try{const r=await post("/api/ai-chat",{q:$("aiQ").value});$("aiBox").innerHTML="<b>คำตอบ AI:</b><br>"+esc(r.answer).replaceAll("\\n","<br>")}catch(e){$("aiBox").textContent="AI error: "+(e.message||String(e))}}
async function renderHealth(){try{const [h,v]=await Promise.all([api("/api/health",12000),api("/api/version",12000)]);$("raw").textContent=JSON.stringify({version:v,health:h},null,2);$("healthGrid").innerHTML=(h.services||[]).map(s=>`<div class="health-card ${s.ok?"ok":"err"}"><h3>${s.ok?"✅":"❌"} ${esc(s.name)}</h3><p>${esc(s.status)} • ${esc(s.latencyMs)}ms</p></div>`).join("")}catch(e){showError("Health error: "+e.message)}}
function exportCSV(){if(!rows.length)return showError("ไม่มีข้อมูล");const cols=["symbol","decisionScore","verdict","grade","expectedValue","riskLevel","action","tradeBrief"];const lines=[cols.join(",")].concat(rows.map(x=>[x.symbol,x.decisionAI.decisionScore,x.decisionAI.verdict,x.grade,x.quant.expectedValue,x.decisionAI.riskLevel,x.decisionAI.action,x.decisionAI.tradeBrief].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")));const blob=new Blob([lines.join("\\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crypto-scanner-v15-5-decision.csv";a.click();URL.revokeObjectURL(a.href)}
function init(){activateTabs();$("refresh").onclick=scan;$("scanBtn").onclick=scan;$("q").oninput=renderRows;$("askAI").onclick=askAI;$("exportBtn").onclick=exportCSV; if($("addHolding"))$("addHolding").onclick=addHolding; if($("clearPortfolio"))$("clearPortfolio").onclick=clearPortfolio; if($("exportPortfolio"))$("exportPortfolio").onclick=exportPortfolioCSV; if($("addTrade"))$("addTrade").onclick=addTrade; if($("clearTrades"))$("clearTrades").onclick=clearTrades; if($("exportTrades"))$("exportTrades").onclick=exportTradesCSV;loadFX().then(()=>loadVersion()).then(scan).catch(e=>showError(e.message)); if($("currencySelect"))$("currencySelect").onchange=()=>{renderPortfolioPL();renderJournal();}; renderHealth(); renderPortfolioPL()}
window.addEventListener("error",e=>showError(e.message));window.addEventListener("unhandledrejection",e=>showError(e.reason?.message||String(e.reason)));init();
})();