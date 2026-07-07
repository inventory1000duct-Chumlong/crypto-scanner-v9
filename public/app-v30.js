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
function renderAll(){renderSummary();renderPick();renderRows();renderQuantV30();renderEventsV30();renderMTFConsensus();renderExchangeSelector();renderExchangeHub();renderAdapterDocs();renderDataEngine();renderRepositoryDocs();renderReleaseManager();renderProjectDocs();renderRealtimeChartPane();renderFinalDashboard();renderSystemHealth();renderResearchLab();renderReports();renderAuditLog();renderNotificationCenter();renderApiVault();renderRoadmapFinal();renderWorkspace();renderInstitutionalStatus();renderSettings();renderMarketIntel();renderQuantAI();renderScenario();renderOptimizer();renderTechnical();renderSignalMatrix();renderWatchlist();renderAlerts();renderPlanner();renderSavedPlans();renderPortfolioPL();renderJournal();renderCoach();renderActionPlan();renderExplain();renderRisk()}
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
 const equityEl=$("equityBox"); if(equityEl)equityEl.innerHTML="<h3>Equity Curve จาก Realized P/L</h3>"+drawEquityCurve(equityCurve(c)); renderSymbolPL(c);
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
 box.innerHTML='<table><thead><tr><th>วันที่</th><th>ประเภท</th><th>เหรียญ</th><th>จำนวน</th><th>ราคา</th><th>มูลค่า</th><th>Fee</th><th>Realized P/L</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>'+
 history.map(t=>{
   const closed=closedMap[t.id], value=t.qty*t.price;
   return `<tr><td>${esc(String(t.date).replace("T"," "))}</td><td class="${t.side==="BUY"?'side-buy':'side-sell'}">${t.side}</td><td><b>${esc(t.symbol)}</b></td><td>${fmt(t.qty,8)}</td><td>${money(t.price,4)}</td><td>${money(value,2)}</td><td>${money(t.fee||0,2)}</td><td class="${(closed?.pnl||0)>=0?'pnl-pos':'pnl-neg'}">${closed?money(closed.pnl,2)+' ('+fmt(closed.pnlPct,2)+'%)':'-'}</td><td>${esc(t.note||"")}</td><td><button class="action-mini" onclick="window.editTrade('${t.id}')">แก้ไข</button><button class="action-mini" onclick="window.deleteTrade('${t.id}')">ลบ</button></td></tr>`;
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


function symbolPL(calc){
 const map={};
 for(const t of calc.trades){
   if(!map[t.symbol])map[t.symbol]={symbol:t.symbol,buy:0,sell:0,fees:0,realized:0,qty:0,cost:0,value:0,unreal:0,trades:0};
   const s=map[t.symbol]; s.trades++; s.fees+=+(t.fee||0); if(t.side==="BUY")s.buy+=t.qty*t.price;else s.sell+=t.qty*t.price;
 }
 for(const c of calc.closed){ if(!map[c.symbol])map[c.symbol]={symbol:c.symbol,buy:0,sell:0,fees:0,realized:0,qty:0,cost:0,value:0,unreal:0,trades:0}; map[c.symbol].realized+=c.pnl; }
 for(const o of calc.open){ if(!map[o.symbol])map[o.symbol]={symbol:o.symbol,buy:0,sell:0,fees:0,realized:0,qty:0,cost:0,value:0,unreal:0,trades:0}; Object.assign(map[o.symbol],{qty:o.qty,cost:o.cost,value:o.value,unreal:o.unreal}); }
 return Object.values(map).map(x=>({...x,net:x.realized+x.unreal})).sort((a,b)=>b.net-a.net);
}
function equityCurve(calc){let equity=0;const points=[];const closedMap=Object.fromEntries(calc.closed.map(x=>[x.id,x]));const sorted=calc.trades.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));for(const t of sorted){const cl=closedMap[t.id];if(cl)equity+=cl.pnl;points.push({date:t.date,equity});}return points;}
function drawEquityCurve(points,w=980,h=220){
 if(!points.length)return '<div class="empty">ยังไม่มีข้อมูล Equity Curve</div>';
 const vals=points.map(x=>x.equity), min=Math.min(0,...vals), max=Math.max(0,...vals);
 const y=v=>h-24-((v-min)/(max-min||1))*(h-48), x=i=>36+i*((w-54)/Math.max(1,points.length-1));
 const path=points.map((p,i)=>(i?'L':'M')+x(i)+' '+y(p.equity)).join(' '), zero=y(0), last=points[points.length-1];
 return `<svg class="equity-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#07101f"/><line x1="32" y1="${zero}" x2="${w-12}" y2="${zero}" stroke="#26354f" stroke-dasharray="5 5"/><path d="${path}" fill="none" stroke="${last.equity>=0?'#22c55e':'#fb7185'}" stroke-width="3"/><circle cx="${x(points.length-1)}" cy="${y(last.equity)}" r="5" fill="${last.equity>=0?'#22c55e':'#fb7185'}"/><text x="${w-14}" y="${y(last.equity)-8}" text-anchor="end" fill="${last.equity>=0?'#22c55e':'#fb7185'}" font-size="13">${money(last.equity,2)}</text></svg>`;
}
function renderSymbolPL(calc){
 const box=$("symbolPLBox"); if(!box)return; const data=symbolPL(calc); if(!data.length){box.innerHTML="";return;}
 box.innerHTML='<h3 class="symbol-pl-title">P/L แยกรายเหรียญ</h3><table><thead><tr><th>เหรียญ</th><th>จำนวน Trade</th><th>Buy</th><th>Sell</th><th>Fees</th><th>Realized</th><th>Unrealized</th><th>Net P/L</th><th>Open Qty</th></tr></thead><tbody>'+data.map(x=>`<tr><td><b>${esc(x.symbol)}</b></td><td>${x.trades}</td><td>${money(x.buy,2)}</td><td>${money(x.sell,2)}</td><td>${money(x.fees,2)}</td><td class="${x.realized>=0?'pnl-pos':'pnl-neg'}">${money(x.realized,2)}</td><td class="${x.unreal>=0?'pnl-pos':'pnl-neg'}">${money(x.unreal,2)}</td><td class="${x.net>=0?'pnl-pos':'pnl-neg'}"><b>${money(x.net,2)}</b></td><td>${fmt(x.qty,8)}</td></tr>`).join("")+'</tbody></table>';
}
function backupTradesJSON(){const data={version:"16.2.0",exportedAt:new Date().toISOString(),trades:loadTrades(),portfolio:loadPortfolio(),fxRate,currency:currency()};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crypto-scanner-backup-v16-2.json";a.click();URL.revokeObjectURL(a.href);}
function restoreTradesJSON(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(Array.isArray(data.trades))saveTrades(data.trades);if(Array.isArray(data.portfolio))savePortfolio(data.portfolio);renderAll();}catch(e){showError("ไฟล์ JSON ไม่ถูกต้อง: "+e.message)}};reader.readAsText(file);}
function editTrade(id){const trades=loadTrades();const t=trades.find(x=>x.id===id);if(!t)return;$("tradeDate").value=String(t.date).slice(0,16);$("tradeSide").value=t.side;$("tradeSymbol").value=t.symbol;$("tradeQty").value=t.qty;$("tradePrice").value=t.price;$("tradeFee").value=t.fee||0;$("tradeNote").value=t.note||"";saveTrades(trades.filter(x=>x.id!==id));renderJournal();}
window.editTrade=editTrade;


function loadWatchlist(){try{return JSON.parse(localStorage.getItem("watchlistV17")||'["BTC","ETH","SOL"]')}catch(e){return["BTC","ETH","SOL"]}}
function saveWatchlist(x){localStorage.setItem("watchlistV17",JSON.stringify([...new Set(x.map(s=>String(s).toUpperCase()).filter(Boolean))]))}
function addWatch(){const s=($("watchSymbol").value||"").trim().toUpperCase();if(!s)return;const w=loadWatchlist();w.push(s);saveWatchlist(w);$("watchSymbol").value="";renderWatchlist();renderWorkspace()}
function clearWatch(){saveWatchlist([]);renderWatchlist();renderWorkspace()}
function renderWatchlist(){
 const box=$("watchlistBox"); if(!box)return;
 const w=loadWatchlist();
 const list=w.map(sym=>rows.find(x=>x.symbol===sym)||{symbol:sym,name:"ยังไม่พบในผลสแกน"});
 if(!list.length){box.innerHTML='<div class="empty">ยังไม่มี Watchlist</div>';return}
 box.innerHTML='<table><thead><tr><th>⭐</th><th>เหรียญ</th><th>ราคา</th><th>Grade</th><th>Decision</th><th>EV</th><th>P/L ถ้ามีในพอร์ต</th><th>ลบ</th></tr></thead><tbody>'+
 list.map(x=>{
   const pf=portfolioRows().find(p=>p.symbol===x.symbol);
   return `<tr><td class="watch-star">★</td><td><b>${esc(x.symbol)}</b><br><small>${esc(x.name||"")}</small></td><td>${x.price?money(x.price,4):'-'}</td><td>${x.grade||'-'}</td><td>${x.decisionAI?badge(x.decisionAI.action):'-'}</td><td>${x.quant?fmt(x.quant.expectedValue,2):'-'}</td><td class="${(pf?.pnl||0)>=0?'pnl-pos':'pnl-neg'}">${pf?money(pf.pnl,2)+' ('+fmt(pf.pnlPct,2)+'%)':'-'}</td><td><button onclick="window.removeWatch('${x.symbol}')">ลบ</button></td></tr>`;
 }).join("")+'</tbody></table>';
}
window.removeWatch=function(sym){saveWatchlist(loadWatchlist().filter(x=>x!==sym));renderWatchlist();renderWorkspace()}

function loadAlerts(){try{return JSON.parse(localStorage.getItem("priceAlertsV17")||"[]")}catch(e){return[]}}
function saveAlerts(a){localStorage.setItem("priceAlertsV17",JSON.stringify(a))}
function addAlert(){
 const symbol=($("alertSymbol").value||"").trim().toUpperCase();
 const condition=$("alertCondition").value;
 const price=+($("alertPrice").value||0);
 if(!symbol||price<=0){showError("กรุณากรอก Symbol และราคา Alert");return}
 const a=loadAlerts();a.push({id:Date.now()+"",symbol,condition,price,createdAt:new Date().toISOString(),enabled:true});saveAlerts(a);
 $("alertSymbol").value="";$("alertPrice").value="";renderAlerts();renderWorkspace();
}
function clearAlerts(){saveAlerts([]);renderAlerts();renderWorkspace()}
function alertStatus(a){
 const m=rows.find(x=>x.symbol===a.symbol);
 const current=m?.price||0;
 const hit=current?(a.condition==="above"?current>=a.price:current<=a.price):false;
 return {current,hit,market:m};
}
function renderAlerts(){
 const box=$("alertsBox"); if(!box)return;
 const alerts=loadAlerts();
 if(!alerts.length){box.innerHTML='<div class="empty">ยังไม่มี Alert</div>';return}
 box.innerHTML='<table><thead><tr><th>Status</th><th>เหรียญ</th><th>เงื่อนไข</th><th>ราคาเป้า</th><th>ราคาปัจจุบัน</th><th>Decision</th><th>ลบ</th></tr></thead><tbody>'+
 alerts.map(a=>{const st=alertStatus(a);return `<tr class="${st.hit?'alert-hit':'alert-wait'}"><td>${st.hit?'✅ HIT':'⏳ WAIT'}</td><td><b>${esc(a.symbol)}</b></td><td>${a.condition==="above"?'สูงกว่า':'ต่ำกว่า'}</td><td>${money(a.price,4)}</td><td>${st.current?money(st.current,4):'-'}</td><td>${st.market?.decisionAI?badge(st.market.decisionAI.action):'-'}</td><td><button onclick="window.removeAlert('${a.id}')">ลบ</button></td></tr>`}).join("")+'</tbody></table>';
}
window.removeAlert=function(id){saveAlerts(loadAlerts().filter(x=>x.id!==id));renderAlerts();renderWorkspace()}

function loadTopPlan(){
 const p=topPick||rows[0]; if(!p)return;
 $("planSymbol").value=p.symbol; $("planEntry").value=p.entryHigh; $("planSL").value=p.sl; $("planTP").value=p.tp1;
 renderPlanner();
}
function renderPlanner(){
 const box=$("plannerBox"); if(!box)return;
 const capital=+($("planCapital").value||0), riskPct=+($("planRiskPct").value||0), entry=+($("planEntry").value||0), sl=+($("planSL").value||0), tp=+($("planTP").value||0);
 if(!capital||!riskPct||!entry||!sl||!tp){box.className="pick empty";box.textContent="กรอกทุน, Risk %, Entry, SL, TP เพื่อคำนวณ";renderChecklist();return}
 const riskPerUnit=Math.abs(entry-sl);
 const rewardPerUnit=Math.abs(tp-entry);
 const riskAmount=capital*riskPct/100;
 const qty=riskPerUnit?riskAmount/riskPerUnit:0;
 const positionValue=qty*entry;
 const rr=riskPerUnit?rewardPerUnit/riskPerUnit:0;
 const maxLoss=qty*riskPerUnit;
 const maxProfit=qty*rewardPerUnit;
 box.className="pick";
 box.innerHTML='<h3>Trade Plan Result</h3><div class="planner-result">'+
   kpi("Risk Amount",money(riskAmount,2))+kpi("Position Size",money(positionValue,2))+kpi("Qty",fmt(qty,8))+kpi("Max Loss",money(maxLoss,2))+kpi("Target Profit",money(maxProfit,2))+kpi("R:R",fmt(rr,2))+
 '</div><div class="summary"><b>แผน:</b> Entry '+money(entry,4)+' | SL '+money(sl,4)+' | TP '+money(tp,4)+' | Risk '+fmt(riskPct,2)+'%</div>';
 renderChecklist();
}
function renderChecklist(){
 const box=$("checklistBox"); if(!box)return;
 const symbol=($("planSymbol").value||"").trim().toUpperCase();
 const m=rows.find(x=>x.symbol===symbol)||topPick;
 if(!m){box.innerHTML='<div class="workspace-card check-warn">ยังไม่มีข้อมูลเหรียญ</div>';return}
 const checks=[
  ["Grade A/B+",["A+","A","B"].includes(m.grade),`Grade ${m.grade}`],
  ["EV > 0.5",m.quant?.expectedValue>0.5,`EV ${fmt(m.quant?.expectedValue,2)}`],
  ["Confidence > 60",m.confidence>60,`Confidence ${m.confidence}%`],
  ["Risk ไม่สูง",m.decisionAI?.riskLevel!=="HIGH",`Risk ${m.decisionAI?.riskLevel}`],
  ["ไม่ไล่ราคาแรง",Math.abs(m.change24h)<10,`24h ${fmt(m.change24h,2)}%`],
  ["มีสภาพคล่อง",m.components?.liquidity>50,`Liquidity ${fmt(m.components?.liquidity,0)}`],
  ["Sector สนับสนุน",m.components?.sector>50,`Sector ${fmt(m.components?.sector,0)}`],
  ["R:R ใช้ได้",m.rr>=1.5,`R:R ${fmt(m.rr,2)}`],
 ];
 const pass=checks.filter(x=>x[1]).length;
 box.innerHTML=checks.map(x=>`<div class="workspace-card ${x[1]?'check-ok':'check-no'}"><h3>${x[1]?'✅':'❌'} ${esc(x[0])}</h3><p>${esc(x[2])}</p></div>`).join("")+`<div class="workspace-card ${pass>=6?'check-ok':'check-warn'}"><h3>Checklist ${pass}/8</h3><p>${pass>=6?'พร้อมพิจารณาแผน':'ควรรอเงื่อนไขเพิ่ม'}</p></div>`;
}

function renderCoach(){
 const box=$("coachBox"); if(!box)return;
 const c=tradeCalc();
 const closed=c.closed;
 if(!c.trades.length){box.className="pick empty";box.textContent="ยังไม่มี Trade Journal ให้ AI Coach วิเคราะห์";return}
 const wins=closed.filter(x=>x.pnl>0), losses=closed.filter(x=>x.pnl<0);
 const winRate=closed.length?wins.length/closed.length*100:0;
 const avgWin=wins.length?wins.reduce((s,x)=>s+x.pnl,0)/wins.length:0;
 const avgLoss=losses.length?Math.abs(losses.reduce((s,x)=>s+x.pnl,0)/losses.length):0;
 const profitFactor=avgLoss? (wins.reduce((s,x)=>s+x.pnl,0)/Math.abs(losses.reduce((s,x)=>s+x.pnl,0)||1)) : 0;
 const fees=c.totalFees;
 const overtrade=c.trades.length>20;
 const tips=[];
 if(winRate<50)tips.push("Win Rate ต่ำกว่า 50% ควรเพิ่มเงื่อนไขก่อนเข้าเทรด");
 if(avgLoss>avgWin)tips.push("ขาดทุนเฉลี่ยมากกว่ากำไรเฉลี่ย ควรปรับ SL/TP หรือไม่ปิดกำไรเร็วเกินไป");
 if(fees>Math.abs(c.realized)*0.25 && c.realized!==0)tips.push("ค่าธรรมเนียมกินสัดส่วนสูง ระวังเทรดถี่เกินไป");
 if(overtrade)tips.push("จำนวน Trade สูง อาจมีพฤติกรรม Overtrade");
 if(!tips.length)tips.push("วินัยการเทรดเริ่มดี ให้รักษา Risk ต่อไม้และบันทึกเหตุผลทุกครั้ง");
 box.className="pick";
 box.innerHTML='<h3>AI Coach Report</h3><div class="journal-kpis">'+
   `<div class="journal-kpi"><span>Trades</span><b>${c.trades.length}</b></div>`+
   `<div class="journal-kpi"><span>Closed</span><b>${closed.length}</b></div>`+
   `<div class="journal-kpi"><span>Win Rate</span><b>${fmt(winRate,1)}%</b></div>`+
   `<div class="journal-kpi"><span>Avg Win</span><b class="pnl-pos">${money(avgWin,2)}</b></div>`+
   `<div class="journal-kpi"><span>Avg Loss</span><b class="pnl-neg">${money(avgLoss,2)}</b></div>`+
   `<div class="journal-kpi"><span>Profit Factor</span><b>${fmt(profitFactor,2)}</b></div>`+
 '</div><div class="summary"><b>คำแนะนำ:</b><br>'+tips.map(x=>'• '+esc(x)).join('<br>')+'</div>';
}
function renderWorkspace(){
 const box=$("workspaceBox"); if(!box)return;
 const c=tradeCalc();
 const alerts=loadAlerts();
 const hit=alerts.filter(a=>alertStatus(a).hit).length;
 const w=loadWatchlist();
 const top=topPick||rows[0];
 const unreal=c.open.reduce((s,x)=>s+x.unreal,0);
 box.innerHTML=
  `<div class="workspace-card"><h3>Top Signal</h3><p>${top?esc(top.symbol)+' '+badge(top.decisionAI.action)+'<br>EV '+fmt(top.quant.expectedValue,2)+' / Score '+top.decisionAI.decisionScore:'-'}</p></div>`+
  `<div class="workspace-card"><h3>Portfolio</h3><p>Open ${c.open.length}<br>Unrealized <span class="${unreal>=0?'pnl-pos':'pnl-neg'}">${money(unreal,2)}</span></p></div>`+
  `<div class="workspace-card"><h3>Journal</h3><p>Trades ${c.trades.length}<br>Realized <span class="${c.realized>=0?'pnl-pos':'pnl-neg'}">${money(c.realized,2)}</span></p></div>`+
  `<div class="workspace-card"><h3>Watchlist</h3><p>${w.slice(0,8).map(esc).join(", ")||"-"}</p></div>`+
  `<div class="workspace-card"><h3>Alerts</h3><p>${hit} HIT / ${alerts.length} total</p></div>`+`<div class="workspace-card"><h3>Saved Plans</h3><p>${loadSavedPlans().length} plans</p></div>`+
  `<div class="workspace-card"><h3>AI Coach</h3><p>${c.trades.length?'พร้อมวิเคราะห์จาก Journal':'ยังไม่มีประวัติเทรด'}</p></div>`;
}


function loadSavedPlans(){try{return JSON.parse(localStorage.getItem("savedTradePlansV171")||"[]")}catch(e){return[]}}
function saveSavedPlans(p){localStorage.setItem("savedTradePlansV171",JSON.stringify(p))}
function currentPlanObject(){
 const symbol=($("planSymbol").value||"").trim().toUpperCase();
 const capital=+($("planCapital").value||0), riskPct=+($("planRiskPct").value||0), entry=+($("planEntry").value||0), sl=+($("planSL").value||0), tp=+($("planTP").value||0);
 const riskPerUnit=Math.abs(entry-sl), rewardPerUnit=Math.abs(tp-entry), riskAmount=capital*riskPct/100, qty=riskPerUnit?riskAmount/riskPerUnit:0, rr=riskPerUnit?rewardPerUnit/riskPerUnit:0;
 return {id:Date.now()+"",createdAt:new Date().toISOString(),symbol,capital,riskPct,entry,sl,tp,riskAmount,qty,positionValue:qty*entry,maxLoss:qty*riskPerUnit,targetProfit:qty*rewardPerUnit,rr};
}
function saveCurrentPlan(){
 const p=currentPlanObject();
 if(!p.symbol||!p.entry||!p.sl||!p.tp){showError("กรุณากรอกแผนก่อนบันทึก");return}
 const plans=loadSavedPlans();plans.unshift(p);saveSavedPlans(plans.slice(0,50));renderSavedPlans();renderWorkspace();renderActionPlan();
}
function renderSavedPlans(){
 const box=$("savedPlansBox"); if(!box)return;
 const plans=loadSavedPlans();
 if(!plans.length){box.innerHTML='<div class="empty">ยังไม่มีแผนที่บันทึก</div>';return}
 box.innerHTML='<h3>Saved Trade Plans</h3><table><thead><tr><th>วันที่</th><th>เหรียญ</th><th>Entry</th><th>SL</th><th>TP</th><th>Risk</th><th>Position</th><th>R:R</th><th>จัดการ</th></tr></thead><tbody>'+
 plans.map(p=>`<tr><td>${esc(p.createdAt.slice(0,16).replace("T"," "))}</td><td><b>${esc(p.symbol)}</b></td><td>${money(p.entry,4)}</td><td>${money(p.sl,4)}</td><td>${money(p.tp,4)}</td><td>${money(p.riskAmount,2)}</td><td>${money(p.positionValue,2)}</td><td>${fmt(p.rr,2)}</td><td><button onclick="window.loadSavedPlan('${p.id}')">โหลด</button><button onclick="window.deleteSavedPlan('${p.id}')">ลบ</button></td></tr>`).join("")+'</tbody></table>';
}
window.loadSavedPlan=function(id){const p=loadSavedPlans().find(x=>x.id===id);if(!p)return;$("planSymbol").value=p.symbol;$("planCapital").value=p.capital;$("planRiskPct").value=p.riskPct;$("planEntry").value=p.entry;$("planSL").value=p.sl;$("planTP").value=p.tp;renderPlanner();}
window.deleteSavedPlan=function(id){saveSavedPlans(loadSavedPlans().filter(x=>x.id!==id));renderSavedPlans();renderWorkspace();renderActionPlan();}

function aiActionPlan(){
 const c=tradeCalc();
 const alerts=loadAlerts();
 const watch=loadWatchlist();
 const plans=loadSavedPlans();
 const top=topPick||rows[0];
 const actions=[];
 if(top)actions.push(`ตรวจ Top Signal: ${top.symbol} (${top.grade}) — ${top.decisionAI.verdict}`);
 if(alerts.some(a=>alertStatus(a).hit))actions.push("มี Price Alert ถูก Trigger แล้ว ให้ตรวจสอบก่อนเข้าออเดอร์");
 if(!plans.length)actions.push("ยังไม่มี Saved Trade Plan — ควรบันทึกแผนก่อนเทรดจริง");
 if(c.trades.length<5)actions.push("Trade Journal ยังมีข้อมูลน้อย ให้บันทึกทุกการซื้อขายเพื่อให้ AI Coach แม่นขึ้น");
 const closed=c.closed||[];
 const losses=closed.filter(x=>x.pnl<0);
 const wins=closed.filter(x=>x.pnl>0);
 if(losses.length>wins.length && closed.length>=3)actions.push("ช่วงนี้จำนวนไม้ขาดทุนมากกว่าไม้กำไร ควรลด Risk ต่อไม้ลงครึ่งหนึ่งชั่วคราว");
 const unreal=c.open.reduce((s,x)=>s+x.unreal,0);
 if(unreal<0)actions.push("พอร์ตมี Unrealized P/L ติดลบ ให้ตรวจ SL ของเหรียญคงเหลือ");
 if(watch.length<3)actions.push("Watchlist น้อยเกินไป เพิ่มเหรียญหลักเพื่อเปรียบเทียบโอกาส");
 if(!actions.length)actions.push("ระบบพร้อมใช้งาน: มีแผน, มี Journal และความเสี่ยงอยู่ในระดับควบคุมได้");
 return actions;
}
function renderActionPlan(){
 const box=$("actionPlanBox"); if(!box)return;
 const actions=aiActionPlan();
 const score=Math.max(0,100-actions.length*8+(loadSavedPlans().length?10:0)+(loadTrades().length?10:0));
 box.className="pick";
 box.innerHTML=`<h3>AI Action Plan</h3><div class="workspace-score">${Math.min(100,score)}/100</div><ol class="action-plan-list">${actions.map(a=>`<li>${esc(a)}</li>`).join("")}</ol>`;
}
function backupAllJSON(){
 const data={version:"17.1.0",exportedAt:new Date().toISOString(),trades:loadTrades(),portfolio:loadPortfolio(),watchlist:loadWatchlist(),alerts:loadAlerts(),savedPlans:loadSavedPlans(),fxRate,currency:currency()};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="smart-quant-ai-full-backup-v17-1.json";a.click();URL.revokeObjectURL(a.href);
}
function restoreAllJSON(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
   try{
     const data=JSON.parse(reader.result);
     if(Array.isArray(data.trades))saveTrades(data.trades);
     if(Array.isArray(data.portfolio))savePortfolio(data.portfolio);
     if(Array.isArray(data.watchlist))saveWatchlist(data.watchlist);
     if(Array.isArray(data.alerts))saveAlerts(data.alerts);
     if(Array.isArray(data.savedPlans))saveSavedPlans(data.savedPlans);
     renderAll();
   }catch(e){showError("ไฟล์ Backup ไม่ถูกต้อง: "+e.message)}
 };
 reader.readAsText(file);
}


function signalClass(sig){return sig&&sig.includes("BUY")?"signal-buy":sig&&sig.includes("SELL")?"signal-sell":"signal-neutral"}
function renderMarketIntel(){
 const box=$("marketBox"), heat=$("heatmapBox"); if(!box||!payload)return;
 const b=payload.terminal?.breadth||{};
 box.innerHTML=
  `<div class="workspace-card"><h3>Market Breadth</h3><p>Up ${b.up||0} (${b.upPct||0}%)<br>Down ${b.down||0} (${b.downPct||0}%)</p></div>`+
  `<div class="workspace-card"><h3>Mode</h3><p><b>${esc(b.mode||"-")}</b><br>Avg 24h ${fmt(b.avgChange24h||0,2)}%</p></div>`+
  `<div class="workspace-card"><h3>Regime</h3><p>${esc(payload.market?.regime||"-")}<br>Risk ${esc(payload.market?.risk||"-")}</p></div>`+
  `<div class="workspace-card"><h3>Fear & Greed</h3><p>${payload.market?.fng??"-"}<br>${esc(payload.market?.fearSource||"-")}</p></div>`+
  `<div class="workspace-card"><h3>Best Sector</h3><p>${esc(payload.summary?.bestSector||"-")}</p></div>`+
  `<div class="workspace-card"><h3>Data Quality</h3><p>${esc(payload.dataQuality||"-")}</p></div>`;
 if(heat){
   const hm=payload.terminal?.heatmap||[];
   heat.innerHTML=hm.map(x=>`<div class="heatcell ${x.change24h>0?'up':x.change24h<0?'down':'neutral'}" style="grid-row:span ${Math.min(2,Math.max(1,Math.round(x.size/3)))}"><b>${esc(x.symbol)}</b><span>${fmt(x.change24h,2)}%</span><small>${esc(x.grade||"-")} • ${esc(x.sector||"-")}</small></div>`).join("")||'<div class="empty">No heatmap</div>';
 }
}
function renderTechnical(){
 const box=$("technicalBox"); if(!box)return;
 if(!rows.length){box.innerHTML='<div class="empty">ยังไม่มีข้อมูล</div>';return}
 box.innerHTML='<table><thead><tr><th>เหรียญ</th><th>Trend</th><th>RSI</th><th>MACD</th><th>EMA20</th><th>EMA50</th><th>EMA200</th><th>ATR%</th><th>BB Width</th><th>Signal Score</th><th>Summary</th></tr></thead><tbody>'+
 rows.slice(0,60).map(x=>{const t=x.technical||{};return `<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(x.name)}</small></td><td class="${t.trend==='BULL'?'signal-buy':t.trend==='BEAR'?'signal-sell':'signal-neutral'}">${esc(t.trend||"-")}</td><td>${fmt(t.rsi,0)}</td><td>${fmt(t.macd,3)}</td><td>${money(t.ema20,4)}</td><td>${money(t.ema50,4)}</td><td>${money(t.ema200,4)}</td><td>${fmt(t.atrPct,2)}%</td><td>${fmt(t.bbWidth,2)}%</td><td><b>${fmt(t.signalScore,0)}</b></td><td>${esc(t.summary||"-")}</td></tr>`}).join("")+
 '</tbody></table>';
}
function renderSignalMatrix(){
 const box=$("matrixBox"); if(!box)return;
 if(!rows.length){box.innerHTML='<div class="empty">ยังไม่มีข้อมูล</div>';return}
 const tfs=["5m","15m","1h","4h","1D","1W"];
 box.innerHTML='<table><thead><tr><th>เหรียญ</th>'+tfs.map(tf=>`<th>${tf}</th>`).join("")+'<th>Decision</th><th>Technical</th></tr></thead><tbody>'+
 rows.slice(0,50).map(x=>`<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(x.sector)}</small></td>${(x.timeframes||[]).map(t=>`<td><span class="mtf-pill ${signalClass(t.signal)}">${esc(t.signal)}<br>${t.score}</span></td>`).join("")}<td>${x.decisionAI?badge(x.decisionAI.action):"-"}</td><td>${fmt(x.technical?.signalScore,0)}</td></tr>`).join("")+
 '</tbody></table>';
}


function probClass(p){return p>=75?"prob-high":p>=55?"prob-mid":"prob-low"}
function renderQuantAI(){
 const report=$("quantReportBox"), box=$("quantBox"); if(!box||!payload)return;
 if(report){report.className="pick";report.innerHTML=`<h3>AI Decision Report</h3><p>${esc(payload.aiDecisionReport||"-")}</p>`}
 box.innerHTML='<table><thead><tr><th>เหรียญ</th><th>Probability</th><th>Expected Gain</th><th>Expected Loss</th><th>Risk</th><th>Kelly</th><th>Position Confidence</th><th>Rank</th><th>Decision</th></tr></thead><tbody>'+
 rows.slice(0,60).map(x=>{const q=x.quantV30||{};return `<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(x.name)}</small></td><td class="${probClass(q.probability)}">${q.probability||"-"}%</td><td class="pnl-pos">+${fmt(q.expectedGainPct,2)}%</td><td class="pnl-neg">-${fmt(q.expectedLossPct,2)}%</td><td>${esc(q.riskLevel||"-")} (${q.riskScore||0})</td><td>${fmt(q.kelly,3)}</td><td>${q.positionConfidence||0}</td><td><b>${esc(q.quantRank||"-")}</b></td><td>${x.decisionAI?badge(x.decisionAI.action):"-"}</td></tr>`}).join("")+'</tbody></table>';
}
function renderScenario(){
 const box=$("scenarioBox"); if(!box)return;
 box.innerHTML=rows.slice(0,12).map(x=>{const s=x.scenario||{};return `<div class="scenario-card"><h3>${esc(x.symbol)} Scenario</h3><p><b>Bull:</b> ${s.bull?.prob||0}% → ${money(s.bull?.target,4)}<br><small>${esc(s.bull?.comment||"")}</small></p><p><b>Base:</b> ${s.base?.prob||0}% → ${money(s.base?.target,4)}<br><small>${esc(s.base?.comment||"")}</small></p><p><b>Bear:</b> ${s.bear?.prob||0}% → ${money(s.bear?.target,4)}<br><small>${esc(s.bear?.comment||"")}</small></p></div>`}).join("")||'<div class="empty">No scenario</div>';
}
function renderOptimizer(){
 const box=$("optimizerBox"), corr=$("correlationBox"); if(!payload)return;
 const alloc=payload.terminal?.portfolioOptimizer||[];
 if(box)box.innerHTML=alloc.map(x=>`<div class="scenario-card"><h3>${esc(x.symbol)}</h3><p>${fmt(x.weightPct,1)}%</p><div class="alloc-bar"><i style="width:${Math.min(100,x.weightPct)}%"></i></div><small>${esc(x.reason||"")}</small></div>`).join("");
 if(corr){const data=payload.terminal?.correlation||[];corr.innerHTML='<h3>Correlation Matrix Proxy</h3><table><thead><tr><th>เหรียญ</th><th>Correlation</th></tr></thead><tbody>'+data.map(x=>`<tr><td><b>${esc(x.symbol)}</b></td><td>${(x.items||[]).map(i=>`<span class="corr-pill">${esc(i.symbol)} ${fmt(i.corr,2)}</span>`).join("")}</td></tr>`).join("")+'</tbody></table>';}
}


function loadSettings(){try{return JSON.parse(localStorage.getItem("smartQuantSettingsV30")||"{}")}catch(e){return{}}}
function saveSettings(s){localStorage.setItem("smartQuantSettingsV30",JSON.stringify(s))}
function applySettings(){
 const s=loadSettings();
 if(s.defaultCurrency && $("currencySelect"))$("currencySelect").value=s.defaultCurrency;
 if(s.defaultRiskPct && $("planRiskPct"))$("planRiskPct").value=s.defaultRiskPct;
 if(s.defaultCapital && $("planCapital"))$("planCapital").value=s.defaultCapital;
}
function saveCurrentSettings(){
 const s={
   defaultCurrency:$("settingCurrency")?.value||currency(),
   defaultCapital:+($("settingCapital")?.value||$("planCapital")?.value||10000),
   defaultRiskPct:+($("settingRiskPct")?.value||$("planRiskPct")?.value||1),
   language:"TH",
   updatedAt:new Date().toISOString()
 };
 saveSettings(s); applySettings(); renderSettings(); renderInstitutionalStatus();
}
async function renderInstitutionalStatus(){
 const box=$("institutionalBox"); if(!box)return;
 let st={};
 try{st=await api("/api/institutional/status",12000)}catch(e){st={ok:false,error:e.message}}
 const s=loadSettings();
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Architecture</h3><p>${esc(st.architecture||"-")}<br>${esc(st.storage||"-")}</p></div>`+
 `<div class="workspace-card"><h3>Modules</h3><p>${esc((st.modules||[]).join(", "))}</p></div>`+
 `<div class="workspace-card"><h3>Production Status</h3><p>API ${st.productionReadiness?.api||"-"}<br>Frontend ${st.productionReadiness?.frontend||"-"}<br>Data ${st.productionReadiness?.dataLayer||"-"}</p></div>`+
 `<div class="workspace-card"><h3>Next Phase</h3><p>${esc((st.next||[]).join(", "))}</p></div>`+
 `<div class="workspace-card"><h3>User Settings</h3><p>Currency ${esc(s.defaultCurrency||currency())}<br>Risk ${esc(s.defaultRiskPct||$("planRiskPct")?.value||1)}%<br>Capital ${moneyUSD(s.defaultCapital||$("planCapital")?.value||10000,0)}</p></div>`+
 `<div class="workspace-card"><h3>Build</h3><p>V30 Institutional<br>${esc(st.version||"30.0.0")}</p></div>`+
 '</div>';
}
function renderSettings(){
 const box=$("settingsBox"); if(!box)return;
 const s=loadSettings();
 box.innerHTML='<div class="controls">'+
 `<label>Default Currency<select id="settingCurrency"><option value="THB" ${((s.defaultCurrency||"THB")==="THB")?"selected":""}>THB ฿</option><option value="USD" ${s.defaultCurrency==="USD"?"selected":""}>USD $</option></select></label>`+
 `<label>Default Capital ($)<input id="settingCapital" type="number" step="any" value="${esc(s.defaultCapital||10000)}"></label>`+
 `<label>Default Risk %<input id="settingRiskPct" type="number" step="any" value="${esc(s.defaultRiskPct||1)}"></label>`+
 '<button id="saveSettingsBtn">Save Settings</button></div>'+
 '<div class="summary"><b>Data Layer:</b> localStorage adapter พร้อมย้ายไป PostgreSQL ใน V21 โดยไม่ต้องเปลี่ยนหน้าจอหลัก</div>';
 const btn=$("saveSettingsBtn"); if(btn)btn.onclick=saveCurrentSettings;
}
function exportInstitutionalBackup(){
 const data={
   version:"30.0.0",
   exportedAt:new Date().toISOString(),
   settings:loadSettings(),
   trades:loadTrades(),
   portfolio:loadPortfolio(),
   watchlist:loadWatchlist(),
   alerts:loadAlerts(),
   savedPlans:loadSavedPlans(),
   fxRate,
   currency:currency()
 };
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="smart-quant-ai-v20-institutional-backup.json";a.click();URL.revokeObjectURL(a.href);
}
function restoreInstitutionalBackup(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
   try{
     const data=JSON.parse(reader.result);
     if(data.settings)saveSettings(data.settings);
     if(Array.isArray(data.trades))saveTrades(data.trades);
     if(Array.isArray(data.portfolio))savePortfolio(data.portfolio);
     if(Array.isArray(data.watchlist))saveWatchlist(data.watchlist);
     if(Array.isArray(data.alerts))saveAlerts(data.alerts);
     if(Array.isArray(data.savedPlans))saveSavedPlans(data.savedPlans);
     applySettings(); renderAll();
   }catch(e){showError("Restore failed: "+e.message)}
 };
 reader.readAsText(file);
}


function loadAudit(){try{return JSON.parse(localStorage.getItem("auditLogV30")||"[]")}catch(e){return[]}}
function saveAudit(x){localStorage.setItem("auditLogV30",JSON.stringify(x.slice(-500)))}
function addAudit(action,detail=""){const a=loadAudit();a.push({time:new Date().toISOString(),action,detail});saveAudit(a)}
function renderFinalDashboard(){
 const box=$("finalBox"); if(!box)return;
 const c=tradeCalc();
 const openValue=c.open.reduce((s,x)=>s+x.value,0);
 const alerts=loadAlerts(), plans=loadSavedPlans(), audit=loadAudit();
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Platform</h3><p><b>V30 Final</b><br>Institutional Platform</p></div>`+
 `<div class="workspace-card"><h3>Portfolio</h3><p>Open ${c.open.length}<br>Value ${money(openValue,2)}</p></div>`+
 `<div class="workspace-card"><h3>Journal</h3><p>Trades ${c.trades.length}<br>Realized ${money(c.realized,2)}</p></div>`+
 `<div class="workspace-card"><h3>Plans</h3><p>${plans.length} saved plans</p></div>`+
 `<div class="workspace-card"><h3>Alerts</h3><p>${alerts.length} alerts</p></div>`+
 `<div class="workspace-card"><h3>Audit</h3><p>${audit.length} events</p></div>`+
 '</div><div class="summary"><b>Final Build:</b> พร้อมทดสอบเป็นแพลตฟอร์มส่วนตัวครบวงจร และพร้อมย้ายไป Server Database ใน Production Phase</div>';
}
async function renderSystemHealth(){
 const box=$("healthV30Box"); if(!box)return;
 let h={}; try{h=await api("/api/platform/health",12000)}catch(e){h={ok:false,error:e.message}}
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Server</h3><p>${h.ok?'✅ OK':'❌ ERROR'}<br>Uptime ${h.uptimeSec||0}s</p></div>`+
 `<div class="workspace-card"><h3>Node</h3><p>${esc(h.node||"-")}</p></div>`+
 `<div class="workspace-card"><h3>Memory</h3><p>RSS ${fmt((h.memory?.rss||0)/1024/1024,1)} MB<br>Heap ${fmt((h.memory?.heapUsed||0)/1024/1024,1)} MB</p></div>`+
 `<div class="workspace-card"><h3>Cache</h3><p>${(h.cacheKeys||[]).length} keys</p></div>`+
 '</div>';
}
function renderResearchLab(){
 const box=$("researchBox"); if(!box)return;
 const strategies=[
  {name:"Trend Following",rule:"EMA20 > EMA50 และ RSI 45-68",status:"Ready"},
  {name:"Breakout",rule:"Volume สูง + 24h Momentum บวก",status:"Ready"},
  {name:"Mean Reversion",rule:"RSI < 35 และ Risk ต่ำ",status:"Prototype"},
  {name:"Swing Quant",rule:"Probability > 70 และ R:R > 1.8",status:"Ready"}
 ];
 box.innerHTML='<table><thead><tr><th>Strategy</th><th>Rule</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
 strategies.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.rule)}</td><td>${esc(s.status)}</td><td><button onclick="addAudit('Research Strategy','${s.name}')">บันทึก Audit</button></td></tr>`).join("")+
 '</tbody></table><div class="summary"><b>Backtest Engine:</b> พร้อมต่อข้อมูล OHLC จริงใน Production Phase</div>';
}
function renderReports(){
 const box=$("reportsBox"); if(!box)return;
 const c=tradeCalc();
 const data=[
  ["Trades",c.trades.length],
  ["Realized P/L",money(c.realized,2)],
  ["Open Positions",c.open.length],
  ["Saved Plans",loadSavedPlans().length],
  ["Watchlist",loadWatchlist().length],
  ["Alerts",loadAlerts().length]
 ];
 box.innerHTML='<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>'+data.map(x=>`<tr><td>${esc(x[0])}</td><td><b>${x[1]}</b></td></tr>`).join("")+'</tbody></table><div class="controls"><button id="exportFinalReport">Export Final Report JSON</button></div>';
 const btn=$("exportFinalReport"); if(btn)btn.onclick=exportFinalReport;
}
function exportFinalReport(){
 const report={version:"30.0.0",time:new Date().toISOString(),settings:loadSettings(),summary:{trades:loadTrades().length,portfolio:loadPortfolio().length,watchlist:loadWatchlist().length,alerts:loadAlerts().length,plans:loadSavedPlans().length},audit:loadAudit()};
 const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="smart-quant-ai-v25-final-report.json";a.click();URL.revokeObjectURL(a.href);addAudit("Export Report","Final report JSON");
}
function renderAuditLog(){
 const box=$("auditBox"); if(!box)return;
 const audit=loadAudit().slice().reverse();
 box.innerHTML='<table><thead><tr><th>Time</th><th>Action</th><th>Detail</th></tr></thead><tbody>'+
 (audit.map(a=>`<tr><td>${esc(a.time.replace("T"," ").slice(0,19))}</td><td><b>${esc(a.action)}</b></td><td>${esc(a.detail||"")}</td></tr>`).join("")||'<tr><td colspan="3" class="empty">ยังไม่มี Audit Log</td></tr>')+
 '</tbody></table>';
}
function renderNotificationCenter(){
 const box=$("notificationBox"); if(!box)return;
 const cfg=JSON.parse(localStorage.getItem("notificationConfigV30")||"{}");
 box.innerHTML='<div class="controls">'+
 `<label>Webhook URL<input id="webhookUrl" placeholder="Discord / Telegram / LINE webhook" value="${esc(cfg.webhookUrl||"")}"></label>`+
 `<label>Notify On<select id="notifyOn"><option value="alerts" ${cfg.notifyOn==="alerts"?"selected":""}>Price Alerts</option><option value="signals" ${cfg.notifyOn==="signals"?"selected":""}>Strong Signals</option><option value="both" ${cfg.notifyOn==="both"?"selected":""}>Both</option></select></label>`+
 '<button id="saveNotify">Save Notification Settings</button></div>'+
 '<div class="summary">Notification Center เป็นโครงสร้างพร้อมต่อ Webhook จริงใน Production Phase</div>';
 const btn=$("saveNotify"); if(btn)btn.onclick=()=>{localStorage.setItem("notificationConfigV30",JSON.stringify({webhookUrl:$("webhookUrl").value,notifyOn:$("notifyOn").value,updatedAt:new Date().toISOString()}));addAudit("Save Notification","Webhook settings updated");renderNotificationCenter();}
}
function renderApiVault(){
 const box=$("apiVaultBox"); if(!box)return;
 const cfg=JSON.parse(localStorage.getItem("apiVaultMetaV30")||"{}");
 box.innerHTML='<div class="controls">'+
 `<label>Exchange<select id="apiExchange"><option>Binance</option><option>Bybit</option><option>OKX</option><option>Bitget</option></select></label>`+
 `<label>API Key Label<input id="apiKeyLabel" placeholder="My read-only key" value="${esc(cfg.label||"")}"></label>`+
 '<button id="saveApiMeta">Save Metadata</button></div>'+
 '<div class="summary"><b>Security:</b> V30 เก็บเฉพาะ metadata สำหรับทดสอบ UI เท่านั้น ไม่ควรใส่ Secret จริงใน localStorage. Production ต้องใช้ encrypted vault บน Server</div>';
 const btn=$("saveApiMeta"); if(btn)btn.onclick=()=>{localStorage.setItem("apiVaultMetaV30",JSON.stringify({exchange:$("apiExchange").value,label:$("apiKeyLabel").value,updatedAt:new Date().toISOString()}));addAudit("Save API Metadata",$("apiExchange").value);renderApiVault();}
}
function renderRoadmapFinal(){
 const box=$("roadmapBox"); if(!box)return;
 const items=[
  ["V21 Production DB","PostgreSQL + Auth + Cloud Sync"],
  ["V22 Research Lab","Real OHLC Backtest + Strategy Builder"],
  ["V23 AI Assistant","Context-aware AI over portfolio/journal/market"],
  ["V24 Mobile","PWA / Mobile companion"],
  ["V30 Institutional","Enterprise dashboard, reports, audit, notifications"]
 ];
 box.innerHTML='<table><thead><tr><th>Phase</th><th>Goal</th></tr></thead><tbody>'+items.map(x=>`<tr><td><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td></tr>`).join("")+'</tbody></table>';
}


let chartState={symbol:null,tf:"1m",timer:null,data:null};
function chartSymbolFromPortfolio(){
 const p=portfolioRows()[0];
 return p?.symbol || topPick?.symbol || rows[0]?.symbol || "BTC";
}
async function loadRealtimeChart(symbol=chartSymbolFromPortfolio(),tf=chartState.tf||"1m"){
 const box=$("realtimeChartBox"); if(!box)return;
 chartState.symbol=symbol; chartState.tf=tf;
 box.innerHTML='<div class="empty">กำลังโหลดกราฟ '+esc(symbol)+' '+esc(tf)+'...</div>';
 try{
   const data=await api(`/api/chart/${encodeURIComponent(symbol)}?tf=${encodeURIComponent(tf)}&limit=100`,20000);
   chartState.data=data;
   renderRealtimeChart(data);
 }catch(e){
   box.innerHTML='<div class="empty">โหลดกราฟไม่ได้: '+esc(e.message)+'</div>';
 }
}
function renderRealtimeChart(data){
 const box=$("realtimeChartBox"); if(!box||!data?.candles?.length)return;
 const pf=portfolioRows().find(x=>x.symbol===data.symbol);
 const levels={...data.levels};
 if(pf){levels.avg=pf.avgPrice}
 box.innerHTML=
  `<div class="chart-toolbar"><button onclick="loadRealtimeChart('${data.symbol}','1m')">1m</button><button onclick="loadRealtimeChart('${data.symbol}','5m')">5m</button><button onclick="loadRealtimeChart('${data.symbol}','15m')">15m</button><button onclick="loadRealtimeChart('${data.symbol}','1h')">1H</button><button onclick="loadRealtimeChart('${data.symbol}','4h')">4H</button><button onclick="loadRealtimeChart('${data.symbol}','1D')">1D</button><button onclick="toggleRealtimeChart()">Auto 5s</button></div>`+
  `<div class="chart-title-row"><div><h3>${esc(data.symbol)} Real-time Chart <small>${esc(data.tf)}</small></h3><p>${esc(data.name||"")} • Price ${money(data.price,4)} • ${esc(data.note||"")}</p></div><div class="chart-live-badge">LIVE ENGINE</div></div>`+
  drawRealtimeSVG(data.candles,levels,data.symbol)+
  renderChartStats(data,pf);
}
function drawRealtimeSVG(candles,levels,symbol,w=1040,h=420){
 const topH=300, volH=80;
 const prices=candles.flatMap(c=>[c.high,c.low]).concat(Object.values(levels).filter(Number.isFinite));
 const min=Math.min(...prices)*0.998, max=Math.max(...prices)*1.002;
 const y=v=>topH-18-((v-min)/(max-min||1))*(topH-34);
 const maxVol=Math.max(...candles.map(c=>c.volume||0),1);
 const step=(w-70)/candles.length, x=i=>48+i*step+step/2;
 const grid=[0,.25,.5,.75,1].map(t=>`<line x1="44" y1="${18+t*(topH-36)}" x2="${w-18}" y2="${18+t*(topH-36)}" stroke="#17243a"/>`).join("");
 const cs=candles.map((c,i)=>{
   const up=c.close>=c.open, color=up?"#22c55e":"#fb7185", cx=x(i), bw=Math.max(3,step*.58);
   const top=y(Math.max(c.open,c.close)), bot=y(Math.min(c.open,c.close));
   const vh=(c.volume/maxVol)*volH;
   return `<line x1="${cx}" y1="${y(c.high)}" x2="${cx}" y2="${y(c.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${Math.max(2,bot-top)}" fill="${color}" rx="1"/><rect x="${cx-bw/2}" y="${topH+24+volH-vh}" width="${bw}" height="${vh}" fill="${color}" opacity=".55"/>`;
 }).join("");
 const levelList=[
  ["TP3",levels.tp3,"#00e7c1"],["TP2",levels.tp2,"#3b82f6"],["TP1",levels.tp1,"#60a5fa"],["ENTRY",levels.entry,"#38bdf8"],["AVG",levels.avg,"#facc15"],["NOW",candles[candles.length-1].close,"#e6edf7"],["SL",levels.sl,"#fb7185"]
 ].filter(x=>Number.isFinite(x[1]));
 const lines=levelList.map(([label,val,color])=>`<line x1="44" y1="${y(val)}" x2="${w-18}" y2="${y(val)}" stroke="${color}" stroke-dasharray="6 5" stroke-width="1.3"/><text x="${w-20}" y="${y(val)-5}" text-anchor="end" fill="${color}" font-size="12">${label} ${money(val,4)}</text>`).join("");
 const last=candles[candles.length-1];
 const info=`O ${money(last.open,4)} H ${money(last.high,4)} L ${money(last.low,4)} C ${money(last.close,4)} Vol ${fmt(last.volume,0)}`;
 return `<svg class="realtime-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#07101f"/><text x="48" y="14" fill="#9fb3d9" font-size="12">${esc(symbol)} • ${esc(info)}</text>${grid}<line x1="44" y1="18" x2="44" y2="${topH-18}" stroke="#26354f"/><line x1="44" y1="${topH-18}" x2="${w-18}" y2="${topH-18}" stroke="#26354f"/><text x="48" y="${topH+16}" fill="#9fb3d9" font-size="12">Volume</text>${cs}${lines}</svg>`;
}
function renderChartStats(data,pf){
 const last=data.candles[data.candles.length-1], first=data.candles[0];
 const ch=((last.close-first.open)/first.open)*100;
 const pnl=pf?((data.price-pf.avgPrice)*pf.qty):0;
 return '<div class="journal-kpis">'+
 `<div class="journal-kpi"><span>Live Price</span><b>${money(data.price,4)}</b></div>`+
 `<div class="journal-kpi"><span>Chart Change</span><b class="${ch>=0?'pnl-pos':'pnl-neg'}">${fmt(ch,2)}%</b></div>`+
 `<div class="journal-kpi"><span>RSI</span><b>${fmt(data.technical?.rsi,0)}</b></div>`+
 `<div class="journal-kpi"><span>Trend</span><b>${esc(data.technical?.trend||"-")}</b></div>`+
 `<div class="journal-kpi"><span>Position P/L</span><b class="${pnl>=0?'pnl-pos':'pnl-neg'}">${pf?money(pnl,2):"-"}</b></div>`+
 `<div class="journal-kpi"><span>Updated</span><b>${new Date(data.time).toLocaleTimeString()}</b></div>`+
 '</div>';
}
function toggleRealtimeChart(){
 if(chartState.timer){clearInterval(chartState.timer); chartState.timer=null; showError("Auto chart refresh: OFF"); return;}
 chartState.timer=setInterval(()=>loadRealtimeChart(chartState.symbol||chartSymbolFromPortfolio(),chartState.tf||"1m"),5000);
 loadRealtimeChart(chartState.symbol||chartSymbolFromPortfolio(),chartState.tf||"1m");
}
function renderRealtimeChartPane(){
 const box=$("realtimeChartBox"); if(!box)return;
 if(!chartState.data)loadRealtimeChart(chartSymbolFromPortfolio(),chartState.tf||"1m");
}


async function renderReleaseManager(){
 const box=$("releaseBox"); if(!box)return;
 let r={};
 try{r=await api("/api/release",12000)}catch(e){r={ok:false,error:e.message}}
 const localData={
   trades:loadTrades().length,
   portfolio:loadPortfolio().length,
   watchlist:loadWatchlist().length,
   alerts:loadAlerts().length,
   plans:loadSavedPlans().length,
   audit:loadAudit().length
 };
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Current Release</h3><p><b>${esc(r.current||"V30")}</b><br>${esc(r.version||"30.0.0")}</p></div>`+
 `<div class="workspace-card"><h3>Website</h3><p><a href="${esc(r.website||"#")}" target="_blank">${esc(r.website||"-")}</a></p></div>`+
 `<div class="workspace-card"><h3>Local Data</h3><p>Trades ${localData.trades}<br>Portfolio ${localData.portfolio}<br>Alerts ${localData.alerts}</p></div>`+
 `<div class="workspace-card"><h3>Safety</h3><p>Backup before deploy<br>Rollback ready</p></div>`+
 '</div>'+
 '<h3>Deploy Checklist</h3><ol class="action-plan-list">'+(r.deployChecklist||[]).map(x=>`<li>${esc(x)}</li>`).join("")+'</ol>'+
 '<h3>Rollback Guide</h3><ol class="action-plan-list">'+(r.rollback||[]).map(x=>`<li>${esc(x)}</li>`).join("")+'</ol>'+
 '<h3>API Endpoints</h3><div class="summary">'+(r.endpoints||[]).map(x=>`<span class="final-tag">${esc(x)}</span>`).join(" ")+'</div>';
}
function exportReleaseBundle(){
 const bundle={
   version:"30.0.0",
   exportedAt:new Date().toISOString(),
   website:"https://web-production-03de0.up.railway.app",
   settings:loadSettings(),
   trades:loadTrades(),
   portfolio:loadPortfolio(),
   watchlist:loadWatchlist(),
   alerts:loadAlerts(),
   savedPlans:loadSavedPlans(),
   audit:loadAudit(),
   notes:"Release Manager backup. Store this file before deploying a new version."
 };
 const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crypto-scanner-v27-release-backup.json";a.click();URL.revokeObjectURL(a.href);
 addAudit("Release Backup","V30 release backup exported");
 renderAuditLog();
}
function renderProjectDocs(){
 const box=$("projectDocsBox"); if(!box)return;
 box.innerHTML='<div class="summary"><b>Recommended Structure</b></div>'+
 '<pre class="codeblock">crypto-scanner-pro/\\n├── server.js                 # Backend API\\n├── package.json\\n├── public/\\n│   ├── index.html            # Frontend shell\\n│   ├── style.css\\n│   ├── app-v27.js            # Current frontend bundle\\n│   └── modules/              # Modular docs and future split\\n├── docs/\\n│   ├── RELEASE_NOTES.md\\n│   ├── DEPLOYMENT.md\\n│   └── ROLLBACK.md\\n└── README.md</pre>'+
 '<div class="summary"><b>Rule:</b> ก่อนขึ้นเวอร์ชั่นใหม่ ให้ Backup JSON + Commit GitHub ก่อนเสมอ</div>';
}


async function dataEngineStatus(){
 try{return await api("/api/data/status",12000)}catch(e){return {ok:false,error:e.message}}
}
function localPayloadForMigration(){
 return {settings:loadSettings(),trades:loadTrades(),portfolio:loadPortfolio(),watchlist:loadWatchlist(),alerts:loadAlerts(),savedPlans:loadSavedPlans(),audit:loadAudit()};
}
async function migrateLocalToServer(){
 const payload=localPayloadForMigration();
 try{
   const r=await fetch("/api/data/migrate-local",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
   if(!r.ok)throw Error(await r.text());
   addAudit("Data Migration","localStorage to Enterprise Data Engine");
   await renderDataEngine();
 }catch(e){showError("Migration failed: "+e.message)}
}
async function syncCollectionToServer(name,data){
 const r=await fetch("/api/data/"+name,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data})});
 if(!r.ok)throw Error(await r.text());
 return r.json();
}
async function syncAllToServer(){
 try{
   const p=localPayloadForMigration();
   for(const [k,v] of Object.entries(p)){await syncCollectionToServer(k,v)}
   addAudit("Sync All","local data synced to server store");
   await renderDataEngine();
 }catch(e){showError("Sync failed: "+e.message)}
}
async function pullServerToLocal(){
 try{
   const r=await api("/api/data/export",12000);
   const c=r.store?.collections||{};
   if(c.settings)saveSettings(c.settings);
   if(Array.isArray(c.trades))saveTrades(c.trades);
   if(Array.isArray(c.portfolio))savePortfolio(c.portfolio);
   if(Array.isArray(c.watchlist))saveWatchlist(c.watchlist);
   if(Array.isArray(c.alerts))saveAlerts(c.alerts);
   if(Array.isArray(c.savedPlans))saveSavedPlans(c.savedPlans);
   if(Array.isArray(c.audit))saveAudit(c.audit);
   addAudit("Pull Server","server store pulled to localStorage");
   renderAll();
 }catch(e){showError("Pull failed: "+e.message)}
}
async function exportServerStore(){
 try{
   const r=await api("/api/data/export",12000);
   const blob=new Blob([JSON.stringify(r.store,null,2)],{type:"application/json"});
   const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="enterprise-data-store-v28.json";a.click();URL.revokeObjectURL(a.href);
   addAudit("Export Server Store","enterprise data exported");
 }catch(e){showError("Export server store failed: "+e.message)}
}
async function renderDataEngine(){
 const box=$("dataEngineBox"); if(!box)return;
 const st=await dataEngineStatus();
 const local=localPayloadForMigration();
 const lc={settings:Object.keys(local.settings||{}).length,trades:local.trades.length,portfolio:local.portfolio.length,watchlist:local.watchlist.length,alerts:local.alerts.length,savedPlans:local.savedPlans.length,audit:local.audit.length};
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Engine</h3><p>${st.ok?'✅ Online':'❌ Offline'}<br>${esc(st.engine||"-")}<br>${esc(st.adapter||"-")}</p></div>`+
 `<div class="workspace-card"><h3>PostgreSQL Ready</h3><p>${st.postgresReady?'✅ Yes':'-'}<br>Adapter can be replaced later</p></div>`+
 `<div class="workspace-card"><h3>Server Counts</h3><p>Trades ${st.counts?.trades||0}<br>Portfolio ${st.counts?.portfolio||0}<br>Alerts ${st.counts?.alerts||0}</p></div>`+
 `<div class="workspace-card"><h3>Local Counts</h3><p>Trades ${lc.trades}<br>Portfolio ${lc.portfolio}<br>Alerts ${lc.alerts}</p></div>`+
 `<div class="workspace-card"><h3>Store File</h3><p>${esc(st.file||"data/enterprise-store.json")}</p></div>`+
 `<div class="workspace-card"><h3>Updated</h3><p>${esc(st.updatedAt||"-")}</p></div>`+
 '</div>'+
 '<div class="controls"><button onclick="migrateLocalToServer()">Migrate Local → Server</button><button onclick="syncAllToServer()">Sync All → Server</button><button onclick="pullServerToLocal()">Pull Server → Local</button><button onclick="exportServerStore()">Export Server Store</button></div>'+
 '<div class="summary"><b>V30 Data Engine:</b> ใช้ server-side JSON store เป็นฐานข้อมูลต้นแบบ และเตรียมเปลี่ยน adapter เป็น PostgreSQL ในเวอร์ชั่นถัดไป</div>';
}
function renderRepositoryDocs(){
 const box=$("repositoryBox"); if(!box)return;
 box.innerHTML='<h3>Repository API</h3><table><thead><tr><th>Endpoint</th><th>Use</th></tr></thead><tbody>'+
 ['GET /api/data/status','GET /api/data/export','POST /api/data/import','GET /api/data/:collection','POST /api/data/:collection','POST /api/data/migrate-local'].map(x=>`<tr><td><b>${esc(x)}</b></td><td>Enterprise Data Engine</td></tr>`).join("")+
 '</tbody></table><div class="summary"><b>Collections:</b> settings, trades, portfolio, watchlist, alerts, savedPlans, audit</div>';
}


async function renderExchangeHub(){
 const box=$("exchangeHubBox"); if(!box)return;
 let ex={}, health={}, agg={};
 try{ex=await api("/api/exchanges",12000)}catch(e){ex={ok:false,error:e.message,exchanges:[]}}
 try{health=await api("/api/exchanges/health",15000)}catch(e){health={ok:false,error:e.message,services:[]}}
 try{agg=await api("/api/markets/aggregate?limit=40",20000)}catch(e){agg={ok:false,error:e.message,rows:[]}}
 const q=agg.dataQuality||{};
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Exchange Adapters</h3><p>${(ex.exchanges||[]).length} adapters<br>${(ex.exchanges||[]).map(x=>x.name).join(", ")}</p></div>`+
 `<div class="workspace-card"><h3>Data Quality</h3><p><b>${esc(q.status||"-")}</b><br>Score ${q.score||0}/100<br>Outliers ${q.outliers||0}</p></div>`+
 `<div class="workspace-card"><h3>Aggregate Rows</h3><p>${(agg.rows||[]).length} symbols</p></div>`+
 `<div class="workspace-card"><h3>Exchange Mode</h3><p>${esc($("exchangeSelector")?.value||"aggregate")}</p></div>`+
 '</div>'+
 '<h3>Exchange Health</h3><table><thead><tr><th>Exchange</th><th>Status</th><th>Mode</th><th>Latency</th><th>Error</th></tr></thead><tbody>'+
 (health.services||[]).map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${s.ok?'✅ OK':'⚠️ Ready/Offline'} / ${esc(s.status)}</td><td>${esc(s.mode)}</td><td>${s.latencyMs}ms</td><td>${esc(s.error||"-")}</td></tr>`).join("")+
 '</tbody></table>'+
 '<h3>Aggregated Market Spread</h3><table><thead><tr><th>Symbol</th><th>Aggregate</th><th>Min</th><th>Max</th><th>Spread</th><th>Best Venues</th></tr></thead><tbody>'+
 (agg.rows||[]).slice(0,30).map(r=>{const s=r.exchangeSpread||{};return `<tr><td><b>${esc(r.symbol)}</b></td><td>${money(s.aggregatePrice,4)}</td><td>${money(s.minPrice,4)}</td><td>${money(s.maxPrice,4)}</td><td>${fmt(s.spreadPct,4)}%</td><td>${(s.venues||[]).slice(0,3).map(v=>`${esc(v.exchange)} ${money(v.price,4)}`).join("<br>")}</td></tr>`}).join("")+
 '</tbody></table>';
}
function saveExchangePreference(){
 const v=$("exchangeSelector")?.value||"aggregate";
 const s=loadSettings();s.exchange=v;saveSettings(s);addAudit("Exchange Preference",v);renderExchangeHub();
}
function renderExchangeSelector(){
 const box=$("exchangeSelectorBox"); if(!box)return;
 const s=loadSettings();
 box.innerHTML='<div class="controls"><label>Primary Exchange<select id="exchangeSelector"><option value="aggregate">Aggregate</option><option value="coingecko">CoinGecko</option><option value="binance">Binance</option><option value="bybit">Bybit</option><option value="okx">OKX</option><option value="bitget">Bitget</option><option value="mexc">MEXC</option></select></label><button id="saveExchangeBtn">Save Exchange</button><button onclick="renderExchangeHub()">Refresh Hub</button></div><div class="summary">V30 ใช้ Adapter Framework และ Aggregator แบบพร้อมต่อ API จริง ใน Production จะเปลี่ยนจาก adapter-ready เป็น live adapters</div>';
 const sel=$("exchangeSelector"); if(sel)sel.value=s.exchange||"aggregate";
 const btn=$("saveExchangeBtn"); if(btn)btn.onclick=saveExchangePreference;
}
function renderAdapterDocs(){
 const box=$("adapterDocsBox"); if(!box)return;
 box.innerHTML='<h3>Exchange Adapter Interface</h3><pre class="codeblock">ExchangeAdapter {\\n  id\\n  name\\n  getTicker(symbol)\\n  getMarkets(limit)\\n  getKlines(symbol, timeframe, limit)\\n  getOrderBook(symbol)\\n  getFundingRate(symbol)\\n  healthCheck()\\n}</pre><div class="summary"><b>Next:</b> เปิด Binance/Bybit/OKX klines จริง แล้วแทน Synthetic OHLC ใน /api/chart/:symbol</div>';
}


let quantV30Payload=null;
async function loadQuantV30(){
 try{quantV30Payload=await api("/api/quant/v30?limit=80",30000)}catch(e){showError("V30 Quant load failed: "+e.message);quantV30Payload=null}
 renderQuantV30();
 renderEventsV30();
}
function renderQuantV30(){
 const box=$("quantV30Box"); if(!box)return;
 const p=quantV30Payload;
 if(!p){box.innerHTML='<div class="empty">ยังไม่มีข้อมูล Quant V30</div>';return}
 const q=p.quantV30||{};
 box.innerHTML='<div class="grid">'+
 `<div class="workspace-card"><h3>Market Regime</h3><p><b>${esc(q.regime||"-")}</b></p></div>`+
 `<div class="workspace-card"><h3>Top Signals</h3><p>${(q.topSignals||[]).slice(0,5).map(x=>x.symbol+" "+x.score).join("<br>")}</p></div>`+
 `<div class="workspace-card"><h3>Events</h3><p>${(q.events||[]).length} events detected</p></div>`+
 `<div class="workspace-card"><h3>Engine</h3><p>Quant Score 2.0<br>MTF Consensus</p></div>`+
 '</div><h3>Professional Signal Dashboard</h3><table><thead><tr><th>Symbol</th><th>Score</th><th>Rank</th><th>Probability</th><th>Consensus</th><th>Buy Votes</th><th>Sell Votes</th><th>Momentum</th><th>Liquidity</th><th>Events</th></tr></thead><tbody>'+
 (p.rows||[]).slice(0,40).map(x=>{const q=x.quantV30||{};return `<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(x.name)}</small></td><td><b>${q.score||0}</b></td><td>${esc(q.rank||"-")}</td><td class="${probClass(q.probability||0)}">${q.probability||0}%</td><td>${fmt(q.consensus,1)}</td><td class="pnl-pos">${q.buyVotes||0}</td><td class="pnl-neg">${q.sellVotes||0}</td><td>${q.momentum||0}</td><td>${q.liquidity||0}</td><td>${(x.events||[]).length}</td></tr>`}).join("")+
 '</tbody></table>';
}
function renderEventsV30(){
 const box=$("eventsV30Box"); if(!box)return;
 const events=quantV30Payload?.quantV30?.events||[];
 box.innerHTML='<table><thead><tr><th>Severity</th><th>Symbol</th><th>Type</th><th>Message</th></tr></thead><tbody>'+
 (events.map(e=>`<tr><td><b>${esc(e.severity)}</b></td><td>${esc(e.symbol)}</td><td>${esc(e.type)}</td><td>${esc(e.message)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">ยังไม่มี Event</td></tr>')+
 '</tbody></table>';
}
function renderMTFConsensus(){
 const box=$("mtfV30Box"); if(!box)return;
 const rows=(quantV30Payload?.rows||[]).slice(0,30);
 const tfs=["1m","5m","15m","1h","4h","1D"];
 box.innerHTML='<table><thead><tr><th>Symbol</th>'+tfs.map(t=>`<th>${t}</th>`).join("")+'<th>Consensus</th></tr></thead><tbody>'+
 (rows.map(x=>`<tr><td><b>${esc(x.symbol)}</b></td>${tfs.map(tf=>{const m=(x.quantV30?.mtf||[]).find(a=>a.tf===tf)||{};return `<td><span class="mtf-pill ${signalClass(m.signal)}">${esc(m.signal||"-")}<br>${m.score||0}<br>RSI ${m.rsi||"-"}</span></td>`}).join("")}<td><b>${fmt(x.quantV30?.consensus,1)}</b></td></tr>`).join("")||'<tr><td colspan="8" class="empty">No MTF data</td></tr>')+
 '</tbody></table>';
}

async function askAI(){$("aiBox").textContent="AI กำลังวิเคราะห์...";try{const r=await post("/api/ai-chat",{q:$("aiQ").value});$("aiBox").innerHTML="<b>คำตอบ AI:</b><br>"+esc(r.answer).replaceAll("\\n","<br>")}catch(e){$("aiBox").textContent="AI error: "+(e.message||String(e))}}
async function renderHealth(){try{const [h,v]=await Promise.all([api("/api/health",12000),api("/api/version",12000)]);$("raw").textContent=JSON.stringify({version:v,health:h},null,2);$("healthGrid").innerHTML=(h.services||[]).map(s=>`<div class="health-card ${s.ok?"ok":"err"}"><h3>${s.ok?"✅":"❌"} ${esc(s.name)}</h3><p>${esc(s.status)} • ${esc(s.latencyMs)}ms</p></div>`).join("")}catch(e){showError("Health error: "+e.message)}}
function exportCSV(){if(!rows.length)return showError("ไม่มีข้อมูล");const cols=["symbol","decisionScore","verdict","grade","expectedValue","riskLevel","action","tradeBrief"];const lines=[cols.join(",")].concat(rows.map(x=>[x.symbol,x.decisionAI.decisionScore,x.decisionAI.verdict,x.grade,x.quant.expectedValue,x.decisionAI.riskLevel,x.decisionAI.action,x.decisionAI.tradeBrief].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")));const blob=new Blob([lines.join("\\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crypto-scanner-v15-5-decision.csv";a.click();URL.revokeObjectURL(a.href)}
function init(){activateTabs();$("refresh").onclick=scan;$("scanBtn").onclick=scan;$("q").oninput=renderRows;$("askAI").onclick=askAI;$("exportBtn").onclick=exportCSV; if($("addHolding"))$("addHolding").onclick=addHolding; if($("clearPortfolio"))$("clearPortfolio").onclick=clearPortfolio; if($("exportPortfolio"))$("exportPortfolio").onclick=exportPortfolioCSV; if($("addWatch"))$("addWatch").onclick=addWatch; if($("clearWatch"))$("clearWatch").onclick=clearWatch; if($("addAlert"))$("addAlert").onclick=addAlert; if($("clearAlerts"))$("clearAlerts").onclick=clearAlerts; if($("calcPlan"))$("calcPlan").onclick=renderPlanner; if($("savePlan"))$("savePlan").onclick=saveCurrentPlan; if($("backupAll"))$("backupAll").onclick=backupAllJSON; if($("restoreAll"))$("restoreAll").onchange=e=>restoreAllJSON(e.target.files[0]); if($("backupInstitutional"))$("backupInstitutional").onclick=exportInstitutionalBackup; if($("restoreInstitutional"))$("restoreInstitutional").onchange=e=>restoreInstitutionalBackup(e.target.files[0]); if($("exportReleaseBundle"))$("exportReleaseBundle").onclick=exportReleaseBundle; if($("loadTopPlan"))$("loadTopPlan").onclick=loadTopPlan; if($("addTrade"))$("addTrade").onclick=addTrade; if($("clearTrades"))$("clearTrades").onclick=clearTrades; if($("exportTrades"))$("exportTrades").onclick=exportTradesCSV; if($("backupTrades"))$("backupTrades").onclick=backupTradesJSON; if($("restoreTrades"))$("restoreTrades").onchange=e=>restoreTradesJSON(e.target.files[0]);loadFX().then(()=>loadVersion()).then(()=>{applySettings(); return scan();}).catch(e=>showError(e.message)); if($("currencySelect"))$("currencySelect").onchange=()=>{renderPortfolioPL();renderJournal();}; renderHealth(); renderPortfolioPL()}
window.addEventListener("error",e=>showError(e.message));window.addEventListener("unhandledrejection",e=>showError(e.reason?.message||String(e.reason)));init();
})();