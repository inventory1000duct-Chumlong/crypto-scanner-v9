(() => {
"use strict";
const $=id=>document.getElementById(id);
const fmt=(n,d=2)=>Number.isFinite(+n)?(+n).toLocaleString(undefined,{maximumFractionDigits:d}):"-";
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
function renderAll(){renderSummary();renderPick();renderRows();renderPortfolioPL();renderExplain();renderRisk()}
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
function drawCandleSVG(item, w=620, h=220){
 const data=candleSeries(item);
 const prices=data.flatMap(d=>[d.high,d.low,item.avgPrice,item.market?.tp1,item.market?.tp2,item.market?.tp3,item.market?.sl]).filter(Number.isFinite);
 const min=Math.min(...prices)*0.995, max=Math.max(...prices)*1.005;
 const y=v=>h-22-((v-min)/(max-min||1))*(h-44);
 const step=(w-50)/data.length;
 const x=i=>36+i*step+step/2;
 const candles=data.map((d,i)=>{
   const up=d.close>=d.open, cx=x(i), bw=Math.max(4,step*.55);
   const color=up?"#22c55e":"#fb7185";
   const top=y(Math.max(d.open,d.close)), bot=y(Math.min(d.open,d.close));
   return `<line x1="${cx}" y1="${y(d.high)}" x2="${cx}" y2="${y(d.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${Math.max(2,bot-top)}" fill="${color}" rx="1"/>`;
 }).join("");
 const levels=[
   ["AVG",item.avgPrice,"#facc15"],
   ["NOW",item.currentPrice,"#e6edf7"],
   ["SL",item.market?.sl,"#fb7185"],
   ["TP1",item.market?.tp1,"#60a5fa"],
   ["TP2",item.market?.tp2,"#3b82f6"],
   ["TP3",item.market?.tp3,"#00e7c1"]
 ].filter(x=>Number.isFinite(x[1]));
 const levelLines=levels.map(([label,val,color])=>`<line x1="32" y1="${y(val)}" x2="${w-8}" y2="${y(val)}" stroke="${color}" stroke-dasharray="5 4" stroke-width="1"/><text x="${w-6}" y="${y(val)-3}" text-anchor="end" fill="${color}" font-size="10">${label} $${fmt(val,4)}</text>`).join("");
 return `<svg class="candlechart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#07101f"/><line x1="32" y1="12" x2="32" y2="${h-22}" stroke="#26354f"/><line x1="32" y1="${h-22}" x2="${w-8}" y2="${h-22}" stroke="#26354f"/>${candles}${levelLines}</svg>`;
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
 sum.innerHTML=`<b>มูลค่าพอร์ต:</b> $${fmt(totalValue,2)} | <b>ต้นทุน:</b> $${fmt(totalCost,2)} | <b>P/L:</b> <span style="color:${totalPnl>=0?'#6bff9d':'#fb7185'}">$${fmt(totalPnl,2)} (${fmt(totalPct,2)}%)</span> | ชนะ ${winners} / ขาดทุน ${losers}`;
 if(charts){
   charts.innerHTML=data.map(x=>{
     const m=x.market||{};
     const tp1=tpProfit(x,m.tp1), tp2=tpProfit(x,m.tp2), tp3=tpProfit(x,m.tp3);
     return `<div class="chartcard"><div class="charthead"><div><div class="charttitle">${esc(x.symbol)} Candlestick</div><div class="sub">${esc(m.name||"ไม่พบในผลสแกน")} • Avg $${fmt(x.avgPrice,6)} • Now ${x.currentPrice?'$'+fmt(x.currentPrice,6):'-'}</div></div><div class="chartmeta">${x.value?'P/L $'+fmt(x.pnl,2)+'<br>'+fmt(x.pnlPct,2)+'%':'No price'}</div></div>${drawCandleSVG(x)}<div class="tpbox"><div class="tpitem"><span>TP1</span><b>${m.tp1?'$'+fmt(m.tp1,6):'-'}</b><span>${m.tp1?'กำไร $'+fmt(tp1.profit,2)+' / '+fmt(tp1.pct,2)+'%':'-'}</span></div><div class="tpitem"><span>TP2</span><b>${m.tp2?'$'+fmt(m.tp2,6):'-'}</b><span>${m.tp2?'กำไร $'+fmt(tp2.profit,2)+' / '+fmt(tp2.pct,2)+'%':'-'}</span></div><div class="tpitem"><span>TP3</span><b>${m.tp3?'$'+fmt(m.tp3,6):'-'}</b><span>${m.tp3?'กำไร $'+fmt(tp3.profit,2)+' / '+fmt(tp3.pct,2)+'%':'-'}</span></div></div></div>`;
   }).join("");
 }
 box.innerHTML='<table><thead><tr><th>เหรียญ</th><th>จำนวน</th><th>ราคาเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>P/L</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>Decision</th></tr></thead><tbody>'+
 data.map(x=>{
   const m=x.market||{};
   const tp1=tpProfit(x,m.tp1), tp2=tpProfit(x,m.tp2), tp3=tpProfit(x,m.tp3);
   return `<tr><td><b>${esc(x.symbol)}</b><br><small>${esc(m.name||"ไม่พบในผลสแกน")}</small></td><td>${fmt(x.qty,8)}</td><td>$${fmt(x.avgPrice,6)}</td><td>${x.currentPrice?'$'+fmt(x.currentPrice,6):'-'}</td><td style="color:${x.pnl>=0?'#6bff9d':'#fb7185'}">${x.value?'$'+fmt(x.pnl,2)+' ('+fmt(x.pnlPct,2)+'%)':'-'}</td><td>${m.sl?'$'+fmt(m.sl,6):'-'}</td><td>${m.tp1?'$'+fmt(m.tp1,6)+'<br><small>$'+fmt(tp1.profit,2)+'</small>':'-'}</td><td>${m.tp2?'$'+fmt(m.tp2,6)+'<br><small>$'+fmt(tp2.profit,2)+'</small>':'-'}</td><td>${m.tp3?'$'+fmt(m.tp3,6)+'<br><small>$'+fmt(tp3.profit,2)+'</small>':'-'}</td><td>${m.decisionAI?badge(m.decisionAI.action):'-'}</td></tr>`;
 }).join("")+'</tbody></table>';
}

function exportPortfolioCSV(){
 const data=portfolioRows();
 if(!data.length){showError("ไม่มีข้อมูลพอร์ตสำหรับ Export");return}
 const cols=["symbol","qty","avgPrice","currentPrice","cost","value","pnl","pnlPct","sl","tp1","tp2","tp3","decision","grade"];
 const lines=[cols.join(",")].concat(data.map(x=>[x.symbol,x.qty,x.avgPrice,x.currentPrice,x.cost,x.value,x.pnl,x.pnlPct,x.market?.sl||"",x.market?.tp1||"",x.market?.tp2||"",x.market?.tp3||"",x.market?.decisionAI?.action||"",x.market?.grade||""].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")));
 const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="personal-portfolio-tp-v15-7.csv";a.click();URL.revokeObjectURL(a.href);
}

async function askAI(){$("aiBox").textContent="AI กำลังวิเคราะห์...";try{const r=await post("/api/ai-chat",{q:$("aiQ").value});$("aiBox").innerHTML="<b>คำตอบ AI:</b><br>"+esc(r.answer).replaceAll("\\n","<br>")}catch(e){$("aiBox").textContent="AI error: "+(e.message||String(e))}}
async function renderHealth(){try{const [h,v]=await Promise.all([api("/api/health",12000),api("/api/version",12000)]);$("raw").textContent=JSON.stringify({version:v,health:h},null,2);$("healthGrid").innerHTML=(h.services||[]).map(s=>`<div class="health-card ${s.ok?"ok":"err"}"><h3>${s.ok?"✅":"❌"} ${esc(s.name)}</h3><p>${esc(s.status)} • ${esc(s.latencyMs)}ms</p></div>`).join("")}catch(e){showError("Health error: "+e.message)}}
function exportCSV(){if(!rows.length)return showError("ไม่มีข้อมูล");const cols=["symbol","decisionScore","verdict","grade","expectedValue","riskLevel","action","tradeBrief"];const lines=[cols.join(",")].concat(rows.map(x=>[x.symbol,x.decisionAI.decisionScore,x.decisionAI.verdict,x.grade,x.quant.expectedValue,x.decisionAI.riskLevel,x.decisionAI.action,x.decisionAI.tradeBrief].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")));const blob=new Blob([lines.join("\\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crypto-scanner-v15-5-decision.csv";a.click();URL.revokeObjectURL(a.href)}
function init(){activateTabs();$("refresh").onclick=scan;$("scanBtn").onclick=scan;$("q").oninput=renderRows;$("askAI").onclick=askAI;$("exportBtn").onclick=exportCSV; if($("addHolding"))$("addHolding").onclick=addHolding; if($("clearPortfolio"))$("clearPortfolio").onclick=clearPortfolio; if($("exportPortfolio"))$("exportPortfolio").onclick=exportPortfolioCSV;loadVersion().then(scan).catch(e=>showError(e.message));renderHealth(); renderPortfolioPL()}
window.addEventListener("error",e=>showError(e.message));window.addEventListener("unhandledrejection",e=>showError(e.reason?.message||String(e.reason)));init();
})();