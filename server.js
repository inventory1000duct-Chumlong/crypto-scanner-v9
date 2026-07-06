
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

const PRODUCT="Crypto Scanner Pro", VERSION="19.0.0", EDITION="Quant AI Decision Engine", BUILD="2026.07.06-V19", API_VERSION="19.0.0-quant-ai-decision-engine";
const PORT=process.env.PORT||3000;
const __filename=fileURLToPath(import.meta.url), __dirname=path.dirname(__filename);
const app=express();
app.use(cors()); app.use(helmet({contentSecurityPolicy:false})); app.use(compression()); app.use(express.json({limit:"1mb"})); app.use(express.static(path.join(__dirname,"public")));

const cache=new Map(), lastGood=new Map();
const CG="https://api.coingecko.com/api/v3";
const FNG="https://api.alternative.me/fng/?limit=1";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=(n,d=2)=>{const p=10**d; return Math.round(n*p)/p};
const avg=a=>{a=a.filter(Number.isFinite); return a.length?a.reduce((x,y)=>x+y,0)/a.length:0};
const median=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]||0:0};
const pct=(arr,v)=>{arr=arr.filter(Number.isFinite).sort((x,y)=>x-y); if(!arr.length||!Number.isFinite(v)) return 50; return clamp(Math.round(arr.filter(x=>x<=v).length/arr.length*100),0,100)};
const gradeRank=g=>({"A+":5,A:4,B:3,C:2,D:1}[g]||0);
const cacheMeta=()=>[...cache.entries()].map(([key,val])=>({key,ageSec:Math.round((Date.now()-val.t)/1000)}));

async function fetchText(url,timeout=12000){
 const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const res=await fetch(url,{signal:ctrl.signal,headers:{"accept":"application/json,text/plain,*/*","user-agent":"Mozilla/5.0 crypto-scanner-v15.5"}}); return {ok:res.ok,status:res.status,text:await res.text()};}
 finally{clearTimeout(timer)}
}
async function resilientJSON(key,url,opt={}){
 const ttl=opt.ttl??30000, stale=opt.stale??1800000, retries=opt.retries??2, timeout=opt.timeout??12000;
 const hit=cache.get(key); if(hit&&Date.now()-hit.t<ttl) return {data:hit.v,source:"fresh-cache",cacheAgeSec:Math.round((Date.now()-hit.t)/1000)};
 let err=null;
 for(let i=0;i<=retries;i++){
  try{const start=Date.now(); const r=await fetchText(url,timeout); const latencyMs=Date.now()-start; if(!r.ok) throw Error(`HTTP ${r.status}: ${r.text.slice(0,100)}`); const data=JSON.parse(r.text); cache.set(key,{t:Date.now(),v:data}); lastGood.set(key,{t:Date.now(),v:data}); return {data,source:i?`live-retry-${i}`:"live",latencyMs,cacheAgeSec:0};}
  catch(e){err=e; await sleep(350*(i+1));}
 }
 const old=lastGood.get(key)||cache.get(key); if(old&&Date.now()-old.t<stale) return {data:old.v,source:"stale-cache",error:err?.message,cacheAgeSec:Math.round((Date.now()-old.t)/1000)};
 throw Error(`${key} failed: ${err?.message||"unknown"}`);
}
function normalizeCoins(data){
 if(!Array.isArray(data)) return [];
 return data.map(x=>({id:x.id,symbol:String(x.symbol||"").toUpperCase(),name:x.name||x.id,price:+x.current_price,change24h:+(x.price_change_percentage_24h||0),change7d:+(x.price_change_percentage_7d_in_currency||0),volume:+(x.total_volume||0),marketCap:+(x.market_cap||0),rank:+(x.market_cap_rank||999999),high24h:+(x.high_24h||0),low24h:+(x.low_24h||0)})).filter(x=>x.symbol&&Number.isFinite(x.price)&&x.price>0&&x.rank<500);
}
function demoCoins(){
 return [["BTC","Bitcoin",65000,1.8,5.2,25000000000,1,1.02,.98],["ETH","Ethereum",3400,2.4,7.5,12000000000,2,1.03,.985],["SOL","Solana",150,4.1,12,4200000000,5,1.06,.975],["RNDR","Render",8.2,4.6,13.5,460000000,55,1.07,.96],["FET","Fetch.ai",1.35,3.9,11.1,430000000,58,1.06,.965],["WLD","Worldcoin",2.1,1.5,4.2,520000000,80,1.04,.98],["LINK","Chainlink",14.5,2.8,6.3,600000000,16,1.05,.97],["DOGE","Dogecoin",.13,5.5,9.1,1800000000,8,1.08,.96],["AVAX","Avalanche",28,3.2,8.4,700000000,12,1.06,.965],["ADA","Cardano",.42,2.1,4.5,800000000,10,1.04,.975]].map(([symbol,name,price,change24h,change7d,volume,rank,hi,lo])=>({id:symbol.toLowerCase(),symbol,name,price,change24h,change7d,volume,rank,marketCap:volume*20,high24h:price*hi,low24h:price*lo}));
}
async function getCoins(limit){
 const diagnostics=[];
 try{const url=`${CG}/coins/markets?vs_currency=usd&order=volume_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`; const r=await resilientJSON(`cg_${limit}`,url,{ttl:30000,stale:1800000,retries:3,timeout:12000}); const coins=normalizeCoins(r.data); diagnostics.push({provider:"CoinGecko",ok:coins.length>0,source:r.source,error:r.error||null,cacheAgeSec:r.cacheAgeSec??0,latencyMs:r.latencyMs??null}); if(coins.length) return {source:`CoinGecko (${r.source})`,coins,diagnostics,dataQuality:r.source==="live"||r.source.startsWith("live")?"LIVE":r.source==="fresh-cache"?"CACHE":"STALE"};}
 catch(e){diagnostics.push({provider:"CoinGecko",ok:false,error:e.message});}
 diagnostics.push({provider:"DemoFallback",ok:true,source:"local-safe-data"});
 return {source:"DemoFallback",coins:demoCoins().slice(0,limit),diagnostics,dataQuality:"DEMO"};
}
async function getFng(){
 try{const r=await resilientJSON("fng",FNG,{ttl:1800000,stale:21600000,retries:1,timeout:8000}); return {value:+(r.data?.data?.[0]?.value||0)||null,source:r.source,cacheAgeSec:r.cacheAgeSec??0};}
 catch(e){return {value:null,source:"unavailable",error:e.message,cacheAgeSec:null};}
}
function sectorOf(c){const s=(c.symbol+" "+c.name).toUpperCase(); if(/WLD|FET|RNDR|RENDER|TAO|AI|AGIX|OCEAN|AKT|NMR|ARKM/.test(s))return"AI"; if(/DOGE|SHIB|PEPE|BONK|FLOKI|MEME|WIF/.test(s))return"Meme"; if(/UNI|AAVE|MKR|COMP|CRV|SNX|DYDX|LDO|PENDLE|ENA/.test(s))return"DeFi"; if(/ETH|SOL|BNB|ADA|AVAX|NEAR|APT|SUI|DOT|ATOM|SEI|INJ|TON/.test(s))return"Layer1"; if(/ARB|OP|MATIC|POL|STRK|IMX/.test(s))return"Layer2"; if(/BTC|BCH|LTC|XRP|XLM/.test(s))return"Major"; return"Altcoin";}
function buildSectors(coins){const map={}; for(const c of coins){const s=sectorOf(c); (map[s]??=[]).push(c)} return Object.entries(map).map(([sector,items])=>{const a24=avg(items.map(x=>x.change24h)),a7=avg(items.map(x=>x.change7d)); return {sector,count:items.length,avg24:round(a24,2),avg7:round(a7,2),strength:clamp(Math.round(50+a24*4+a7*1.5),0,100),volume:items.reduce((s,x)=>s+x.volume,0)}}).sort((a,b)=>b.strength-a.strength)}
function marketRegime(avg24,medAbs,fear){if(avg24<-4)return{name:"CRASH_RISK",risk:"HIGH",multiplier:.62}; if(medAbs>10)return{name:"HIGH_VOLATILITY",risk:"HIGH",multiplier:.78}; if(avg24>1.2&&(fear===null||fear<78))return{name:"BULL",risk:"MEDIUM",multiplier:1.08}; if(avg24<-1.2)return{name:"BEAR",risk:"HIGH",multiplier:.72}; if(avg24>.2)return{name:"ACCUMULATION",risk:"MEDIUM",multiplier:1.02}; return{name:"SIDEWAY",risk:"MEDIUM",multiplier:.92}}
function tradePlan(c){const range=c.price?Math.abs((c.high24h-c.low24h)/c.price)*100:4, vol=Math.max(Math.abs(c.change24h||0),range,2); let rr=c.change24h>0&&c.change24h<8?2:c.change24h>=8?1.45:c.change24h<0?1.55:1.75; if(c.change7d>0)rr+=.12; if(vol>=2&&vol<=10)rr+=.15; if(vol>16)rr-=.25; rr=clamp(rr,1.1,2.6); const atr=c.price*Math.max(vol/100,.018), entryHigh=c.price, entryLow=Math.max(c.price-atr*.35,c.price*.985), sl=Math.max(c.price-atr*.75,c.price*.97); return {volatility:vol,atr,rr,entryLow,entryHigh,sl,tp1:c.price+(c.price-sl)*1.2,tp2:c.price+(c.price-sl)*2,tp3:c.price+(c.price-sl)*3}}
function components({coin,volRatio,rr,regime,sectorStrength,fear,liquidityPct,momentumPct,volumePct}){return{trend:clamp(50+coin.change7d*2.2+coin.change24h*2.8,0,100),momentum:clamp(momentumPct*.7+(coin.change24h>0?18:0)-(coin.change24h>10?20:0),0,100),volume:clamp(volumePct*.75+(volRatio>=2?20:volRatio>=1.4?12:0),0,100),relativeStrength:clamp(45+coin.change7d*2+coin.change24h*2,0,100),sector:sectorStrength??50,regime:regime.name==="BULL"?82:regime.name==="ACCUMULATION"?70:regime.name==="SIDEWAY"?58:regime.name==="HIGH_VOLATILITY"?38:regime.name==="BEAR"?30:20,fearGreed:fear===null?55:(fear>=25&&fear<=75?78:fear>82?35:fear<18?40:58),liquidity:liquidityPct,risk:clamp(100-(coin.change24h>10?25:0)-(coin.change24h<-6?20:0)-(regime.risk==="HIGH"?22:0),0,100),rr:clamp(rr*40,0,100)}}
function aiScore(c){const w={trend:.13,momentum:.12,volume:.13,relativeStrength:.11,sector:.10,regime:.12,fearGreed:.07,liquidity:.08,risk:.08,rr:.06}; let total=0,xai=[]; for(const[k,weight]of Object.entries(w)){const contribution=c[k]*weight; total+=contribution; xai.push({component:k,score:round(c[k],1),weight,contribution:round(contribution,1)})} return {score:clamp(Math.round(total),0,100),xai:xai.sort((a,b)=>b.contribution-a.contribution)}}
function confidence({score,comps,penalties,providerQuality}){const vals=Object.values(comps), dispersion=Math.max(...vals)-Math.min(...vals); let c=score*.62+comps.risk*.16+comps.liquidity*.10+providerQuality*.12; if(dispersion>65)c-=12; c-=Math.min(18,(penalties||[]).length*5); return clamp(Math.round(c),0,98)}
function quantMetrics({score,conf,rr,volatility,regime,components}){const winProb=clamp(Math.round(35+score*.34+conf*.22-(regime.risk==="HIGH"?12:0)-(volatility>12?8:0)),5,92); const lossProb=100-winProb; const ev=round((winProb/100)*rr-(lossProb/100)*1,2); const quality=clamp(Math.round(score*.35+conf*.35+components.risk*.15+components.liquidity*.15),0,100); const maxRiskPct=quality>=85?1.25:quality>=70?1:quality>=55?.65:.35; const kelly=round(clamp(((winProb/100)*rr-(lossProb/100))/Math.max(rr,1),0,.5),3); return {winProb,lossProb,expectedValue:ev,signalQuality:quality,maxRiskPct:round(maxRiskPct,2),kelly,quantGrade:quality>=85?"Q1":quality>=70?"Q2":quality>=55?"Q3":"Q4"}}
function grade({score,conf,rr,volRatio,regime,riskScore,ev}){if(regime.name==="CRASH_RISK")return"D"; if(score>=84&&conf>=82&&rr>=2&&volRatio>=1.8&&riskScore>=60&&ev>1)return"A+"; if(score>=75&&conf>=70&&rr>=1.75&&volRatio>=1.3&&riskScore>=55&&ev>.55)return"A"; if(score>=62&&conf>=55&&ev>.15)return"B"; if(score>=50)return"C"; return"D"}
function decision(g,conf,regime,ev){if(ev<0)return"AVOID"; if(regime.risk==="HIGH"&&g!=="A+")return"WAIT_RISK_HIGH"; if(g==="A+"&&conf>=85)return"STRONG_BUY_ZONE"; if(g==="A")return"BUY_WAIT_ENTRY"; if(g==="B")return"SMALL_POSITION"; if(g==="C")return"WATCH"; return"AVOID"}
function position(entry,sl,riskPct,capital=10000){const riskAmount=capital*(riskPct/100), riskPerUnit=Math.max(entry-sl,entry*.002), qty=riskAmount/riskPerUnit; return {capital,riskPct,riskAmount:round(riskAmount,2),qty:round(qty,6),positionValue:round(qty*entry,2)}}
function futuresMetrics(row){const bias=row.grade==="A+"||row.grade==="A"?"LONG":row.grade==="D"?"SHORT/AVOID":"NEUTRAL"; const funding=round(((row.change24h||0)/1000)+(row.volumeRatio-1)*0.0008,4); const oiScore=clamp(Math.round(50+row.volumeRatio*8+Math.abs(row.change24h)*2),0,100); const liqRisk=clamp(Math.round(row.volatility*5+(row.change24h>8?20:0)),0,100); return {bias,funding,openInterestScore:oiScore,liquidationRisk:liqRisk,maxLeverage:row.quant.signalQuality>=85?3:row.quant.signalQuality>=70?2:1}}
function onchainProxy(row){const exchangeFlow=row.change24h>0&&row.volumeRatio>1.5?"Outflow proxy / accumulation":"Neutral flow proxy"; const whale=row.volumeRatio>2.5&&row.change24h>0?"Whale Buy Proxy":row.volumeRatio>2&&row.change24h<0?"Whale Sell Proxy":"Normal"; return {exchangeFlow,whale,stablecoinLiquidity:row.sector==="Major"||row.sector==="Layer1"?"High liquidity":"Medium liquidity",onchainScore:clamp(Math.round(row.components.liquidity*.45+row.components.volume*.35+row.components.risk*.20),0,100)}}
function decisionIntelligence(row,market){
 const drivers=row.xai.slice(0,5).map(x=>({factor:x.component,score:x.score,impact:x.contribution,meaning:`${x.component} สนับสนุนคะแนน +${x.contribution}`}));
 const blockers=[]; if(row.confidence<70)blockers.push("ความมั่นใจยังไม่สูงพอ"); if(row.quant.expectedValue<0.8)blockers.push("Expected Value ยังไม่เด่น"); if(row.futures.liquidationRisk>65)blockers.push("Liquidation risk สูง"); if(row.volatility>12)blockers.push("Volatility สูง เสี่ยงโดนสะบัด"); if(market.risk==="HIGH")blockers.push("Market risk สูง"); if(row.onchain.whale==="Whale Sell Proxy")blockers.push("พบแรงขายเชิง Proxy");
 const entryChecklist=(row.grade==="A+"||row.grade==="A")?[`รอราคาเข้าโซน Entry ${row.entryLow} - ${row.entryHigh}`,`ต้องยืนเหนือ SL ${row.sl}`,"ถ้าปริมาณซื้อหายหรือหลุด SL ให้ยกเลิกแผน"]:["รอให้ Score > 75 และ Confidence > 75%","รอให้ EV > 1.0 และ Risk ลดลง","รอให้ Sector strength ดีขึ้น"];
 const verdict=row.decision==="STRONG_BUY_ZONE"?"เข้าได้เมื่อราคาอยู่ในโซนและยอมรับความเสี่ยง":row.decision==="BUY_WAIT_ENTRY"?"น่าสนใจ แต่ควรรอจังหวะเข้า":row.decision==="SMALL_POSITION"?"เข้าได้เฉพาะไม้เล็ก":row.decision==="WATCH"?"เฝ้าดู ยังไม่ควรรีบเข้า":"หลีกเลี่ยงหรือรอเงื่อนไขใหม่";
 const riskLevel=row.components.risk>=80?"LOW":row.components.risk>=60?"MEDIUM":"HIGH";
 const tradeBrief=`${row.symbol} ได้ ${row.grade} เพราะ ${drivers.slice(0,3).map(d=>d.factor).join(", ")} เด่น แต่ต้องระวัง ${blockers[0]||"การไล่ราคา"} คำตัดสิน: ${verdict}`;
 return {verdict,action:row.decision,riskLevel,drivers,blockers,entryChecklist,invalidations:[`หลุด SL ${row.sl}`,"EV ลดต่ำกว่า 0.5","Confidence ต่ำกว่า 60%","Market Regime เปลี่ยนเป็น CRASH_RISK"],tradeBrief,decisionScore:clamp(Math.round(row.score*.35+row.confidence*.25+row.quant.signalQuality*.20+row.components.risk*.10+row.onchain.onchainScore*.10),0,100)};
}
function backtestProxy(row){const expected30=round(row.quant.expectedValue*18 + row.change7d*.7,2); const maxDD=round(Math.max(4,row.volatility*1.35),2); return {expected30dPct:expected30,maxDrawdownPct:maxDD,sharpeProxy:round((row.quant.expectedValue+0.2)/(maxDD/20),2)}}
function summary(rows,sectors,market){return {buyCount:rows.filter(x=>["A+","A"].includes(x.grade)).length,watchCount:rows.filter(x=>x.grade==="B").length,avoidCount:rows.filter(x=>["C","D"].includes(x.grade)).length,topSymbols:rows.slice(0,5).map(x=>x.symbol),bestSector:sectors[0]?.sector||"-",marketRisk:market.risk,summaryText:`ตลาด ${market.regime} / Top ${rows[0]?.symbol||"-"} / Sector เด่น ${sectors[0]?.sector||"-"}`}}

function technicalEngine(row, market){
  const px=row.price||1;
  const c24=row.change24h||0, c7=row.change7d||0;
  const trendScore=clamp(Math.round(50+c7*3+c24*2),0,100);
  const ema20=round(px*(1-(c24/100)*0.18),8);
  const ema50=round(px*(1-(c7/100)*0.10),8);
  const ema200=round(px*(1-(c7/100)*0.28),8);
  const rsi=clamp(Math.round(50+c24*3+c7*0.8),5,95);
  const macd=round((ema20-ema50)/px*100,3);
  const atrPct=round(Math.max(row.volatility||0, Math.abs(c24), 2),2);
  const bbWidth=round(atrPct*1.65,2);
  const trend=ema20>ema50&&ema50>ema200?"BULL":ema20<ema50&&ema50<ema200?"BEAR":"MIXED";
  const momentum=rsi>=70?"OVERBOUGHT":rsi<=30?"OVERSOLD":rsi>=55?"BULLISH":rsi<=45?"BEARISH":"NEUTRAL";
  const signalScore=clamp(Math.round(row.score*.35+row.confidence*.25+trendScore*.2+(rsi>=45&&rsi<=68?15:5)+(macd>0?8:0)),0,100);
  return {ema20,ema50,ema200,rsi,macd,atrPct,bbWidth,trend,momentum,trendScore,signalScore,summary:`Trend ${trend}, RSI ${rsi}, MACD ${macd>0?"positive":"negative"}, ATR ${atrPct}%`};
}
function timeframeSignal(row){
  const base=row.technical?.signalScore||row.score||50;
  const vol=row.volatility||3;
  const mk=(tf,adj)=> {
    const s=clamp(Math.round(base+adj-(vol>12?8:0)),0,100);
    const sig=s>=80?"STRONG_BUY":s>=68?"BUY":s>=52?"NEUTRAL":s>=40?"SELL":"STRONG_SELL";
    return {tf,score:s,signal:sig};
  };
  return [mk("5m",(row.change24h||0)>0?4:-4),mk("15m",(row.change24h||0)>1?6:-3),mk("1h",(row.change24h||0)*.8),mk("4h",(row.change7d||0)*.45),mk("1D",(row.change7d||0)*.25),mk("1W",row.sector==="Major"?3:0)];
}
function marketBreadth(rows){
  const up=rows.filter(x=>x.change24h>0).length, down=rows.filter(x=>x.change24h<0).length;
  const total=rows.length||1;
  const a=avg(rows.map(x=>x.change24h));
  return {up,down,flat:total-up-down,upPct:round(up/total*100,1),downPct:round(down/total*100,1),avgChange24h:round(a,2),mode:up/total>.6?"BROAD_RISK_ON":down/total>.6?"BROAD_RISK_OFF":"MIXED"};
}
function heatmapData(rows){
  return rows.slice(0,36).map(x=>({symbol:x.symbol,name:x.name,sector:x.sector,change24h:x.change24h,score:x.score,grade:x.grade,size:Math.max(1,Math.log10((x.marketCap||x.volume||1)+10)),decision:x.decisionAI?.action||x.decision}));
}


function quantV19(row, market){
  const tech=row.technical||{};
  const prob=clamp(Math.round(38+(row.score||50)*0.26+(row.confidence||50)*0.22+(tech.signalScore||50)*0.18+(row.quant?.expectedValue||0)*8-(market.risk==="HIGH"?10:0)),5,95);
  const gain=round(Math.max(1.5,((row.tp2-row.price)/row.price*100)||((row.quant?.expectedValue||0)*8)),2);
  const loss=round(Math.max(1.0,((row.price-row.sl)/row.price*100)||((row.volatility||3)*.7)),2);
  const riskScore=clamp(Math.round((row.volatility||3)*5+(market.risk==="HIGH"?25:0)+(row.futures?.liquidationRisk||0)*.35-(row.components?.liquidity||50)*.25),0,100);
  const rr=gain/loss;
  const kelly=round(clamp(((prob/100)*rr-(1-prob/100))/(rr||1),0,.5),3);
  const confidence=clamp(Math.round(prob*.55+(row.confidence||50)*.25+(tech.signalScore||50)*.2-riskScore*.15),0,100);
  return {probability:prob,expectedGainPct:gain,expectedLossPct:loss,riskScore,riskLevel:riskScore>=70?"HIGH":riskScore>=45?"MEDIUM":"LOW",kelly,positionConfidence:confidence,quantRank:confidence>=85?"Q1":confidence>=70?"Q2":confidence>=55?"Q3":"Q4"};
}
function scenarioV19(row, market){
  const q=row.quantV19||{};
  const bull=clamp(Math.round((q.probability||50)*.62+(row.technical?.trend==="BULL"?18:6)+(market.risk==="HIGH"?-10:5)),5,85);
  const bear=clamp(Math.round((100-(q.probability||50))*.45+(q.riskScore||40)*.35+(market.risk==="HIGH"?18:2)),5,80);
  const base=clamp(100-bull-bear,5,80), total=bull+base+bear;
  return {bull:{prob:round(bull/total*100,1),target:row.tp2,comment:"โมเมนตัมและ Sector สนับสนุน"},base:{prob:round(base/total*100,1),target:row.tp1,comment:"แกว่งในกรอบ รอจังหวะเข้า"},bear:{prob:round(bear/total*100,1),target:row.sl,comment:"หลุดแผน ต้องคุมความเสี่ยง"}};
}
function regimeV19(market,breadth){
  if(market.risk==="HIGH"&&(breadth?.downPct||0)>60)return"PANIC";
  if((breadth?.upPct||0)>70&&market.fng>75)return"EUPHORIA";
  if(market.regime==="BULL"&&(breadth?.upPct||0)>55)return"TREND";
  if(market.regime==="ACCUMULATION")return"ACCUMULATION";
  if(market.regime==="BEAR")return"DISTRIBUTION";
  return"SIDEWAY";
}
function correlationProxy(rows){
  const top=rows.slice(0,10);
  return top.map(a=>({symbol:a.symbol,items:top.filter(b=>b.symbol!==a.symbol).slice(0,6).map(b=>({symbol:b.symbol,corr:clamp(round(0.35+(a.sector===b.sector?0.28:0)+(Math.sign(a.change24h)===Math.sign(b.change24h)?0.18:-0.05)+(1-Math.min(1,Math.abs((a.volatility||0)-(b.volatility||0))/20))*.22,2),0.05,0.95)}))}));
}
function portfolioOptimizer(rows){
  const picks=rows.filter(x=>["A+","A","B"].includes(x.grade)).slice(0,8);
  const total=picks.reduce((s,x)=>s+(x.quantV19?.positionConfidence||x.score||50),0)||1;
  const alloc=picks.map(x=>({symbol:x.symbol,weightPct:round(((x.quantV19?.positionConfidence||x.score||50)/total)*80,1),reason:`${x.grade} / Prob ${x.quantV19?.probability}% / Risk ${x.quantV19?.riskLevel}`}));
  alloc.push({symbol:"CASH",weightPct:round(Math.max(10,100-alloc.reduce((s,x)=>s+x.weightPct,0)),1),reason:"กันความเสี่ยงและรอจังหวะ"});
  return alloc;
}
function aiDecisionReport(payload){
  const top=payload.rows?.[0], b=payload.terminal?.breadth||{};
  const leaders=(payload.terminal?.technicalLeaders||[]).slice(0,5).map(x=>x.symbol).join(", ");
  return `ตลาดอยู่ในโหมด ${payload.terminal?.regimeV19||payload.market?.regime} | Breadth Up ${b.upPct||0}% / Down ${b.downPct||0}% | Sector เด่น ${payload.summary?.bestSector||"-"} | Technical Leaders ${leaders||"-"} | Top Quant ${top?.symbol||"-"} Probability ${top?.quantV19?.probability||"-"}%, Risk ${top?.quantV19?.riskLevel||"-"}. ใช้ Position Size ตาม Risk และไม่ไล่ราคาเมื่อ Volatility สูง`;
}

async function terminalPayload(limit=80){
 const pack=await getCoins(limit), fng=await getFng(), coins=pack.coins;
 const avg24=avg(coins.map(x=>x.change24h)), medAbs=median(coins.map(x=>Math.abs(x.change24h))), reg=marketRegime(avg24,medAbs,fng.value);
 const sectors=buildSectors(coins), secMap=Object.fromEntries(sectors.map(x=>[x.sector,x.strength]));
 const medVol=median(coins.map(x=>x.volume)), volumes=coins.map(x=>x.volume), momentums=coins.map(x=>x.change24h+x.change7d*.35), liquidities=coins.map(x=>x.marketCap||x.volume);
 const providerQuality=pack.dataQuality==="LIVE"?95:pack.dataQuality==="CACHE"?82:pack.dataQuality==="STALE"?65:45;
 const market={regime:reg.name,risk:reg.risk,multiplier:reg.multiplier,fng:fng.value,avg24:round(avg24,2),medAbs:round(medAbs,2),fearSource:fng.source,fngCacheAgeSec:fng.cacheAgeSec};
 const rows=coins.map(coin=>{
  const p=tradePlan(coin), volRatio=medVol?Math.max(.1,coin.volume/medVol):1, sec=sectorOf(coin), momentum=coin.change24h+coin.change7d*.35;
  const comps=components({coin,volRatio,rr:p.rr,regime:reg,sectorStrength:secMap[sec]||50,fear:fng.value,liquidityPct:pct(liquidities,coin.marketCap||coin.volume),momentumPct:pct(momentums,momentum),volumePct:pct(volumes,coin.volume)});
  const penalties=[]; if(coin.change24h>=10)penalties.push("ราคาวิ่งแรงเกิน ระวังไล่ราคา"); if(coin.change24h<-6)penalties.push("Momentum อ่อน"); if(reg.risk==="HIGH")penalties.push("Market Regime เสี่ยงสูง"); if(p.rr<1.75)penalties.push("R:R ต่ำ");
  const ai=aiScore(comps), conf=confidence({score:ai.score,comps,penalties,providerQuality}), qm=quantMetrics({score:ai.score,conf,rr:p.rr,volatility:p.volatility,regime:reg,components:comps});
  const g=grade({score:ai.score,conf,rr:p.rr,volRatio,regime:reg,riskScore:comps.risk,ev:qm.expectedValue}), pos=position(p.entryHigh,p.sl,qm.maxRiskPct);
  const row={symbol:coin.symbol,name:coin.name,sector:sec,price:coin.price,rank:coin.rank,change24h:round(coin.change24h,2),change7d:round(coin.change7d,2),volume:coin.volume,marketCap:coin.marketCap,volumeRatio:round(volRatio,2),score:ai.score,confidence:conf,grade:g,decision:decision(g,conf,reg,qm.expectedValue),quant:qm,xai:ai.xai,components:comps,reasons:ai.xai.slice(0,4).map(x=>`${x.component} +${x.contribution}`),penalties,rr:round(p.rr,2),volatility:round(p.volatility,2),atr:round(p.atr,8),entryLow:round(p.entryLow,8),entryHigh:round(p.entryHigh,8),sl:round(p.sl,8),tp1:round(p.tp1,8),tp2:round(p.tp2,8),tp3:round(p.tp3,8),position:pos};
  row.futures=futuresMetrics(row); row.onchain=onchainProxy(row); row.backtest=backtestProxy(row); row.technical=technicalEngine(row,market); row.timeframes=timeframeSignal(row); row.quantV19=quantV19(row,market); row.scenario=scenarioV19(row,market); row.decisionAI=decisionIntelligence(row,market); return row;
 }).sort((a,b)=>b.decisionAI.decisionScore-a.decisionAI.decisionScore||gradeRank(b.grade)-gradeRank(a.grade)||b.confidence-a.confidence);
 const breadth=marketBreadth(rows);
 const terminal={breadth,heatmap:heatmapData(rows),regimeV19:regimeV19(market,breadth),technicalLeaders:rows.slice().sort((a,b)=>(b.technical?.signalScore||0)-(a.technical?.signalScore||0)).slice(0,10).map(x=>({symbol:x.symbol,score:x.technical.signalScore,trend:x.technical.trend,rsi:x.technical.rsi,signal:x.timeframes?.[3]?.signal})),quantLeaders:rows.slice().sort((a,b)=>(b.quantV19?.positionConfidence||0)-(a.quantV19?.positionConfidence||0)).slice(0,15).map(x=>({symbol:x.symbol,probability:x.quantV19.probability,risk:x.quantV19.riskLevel,kelly:x.quantV19.kelly,rank:x.quantV19.quantRank})),portfolioOptimizer:portfolioOptimizer(rows),correlation:correlationProxy(rows),alerts:rows.slice(0,10).map(x=>({symbol:x.symbol,type:x.decisionAI.action,message:x.decisionAI.tradeBrief}))};
 const payload={ok:true,product:PRODUCT,edition:EDITION,version:API_VERSION,build:BUILD,source:pack.source,dataQuality:pack.dataQuality,cache:cacheMeta(),time:new Date().toISOString(),diagnostics:pack.diagnostics,market,sectors,summary:summary(rows,sectors,market),terminal,topOpportunity:rows[0]||null,rows};
 payload.aiDecisionReport=aiDecisionReport(payload);
 return payload;
}
async function healthOne(name,url){const st=Date.now();try{const r=await fetchText(url,8000);return{name,ok:r.ok,status:String(r.status),latencyMs:Date.now()-st}}catch(e){return{name,ok:false,status:e.message,latencyMs:Date.now()-st}}}
app.get("/api/version",(req,res)=>res.json({product:PRODUCT,edition:EDITION,version:VERSION,apiVersion:API_VERSION,build:BUILD,backend:"Node.js",frontend:"V19 Quant AI Decision Engine",modules:["Quant Engine 2.0","AI Probability","Scenario Analysis","Portfolio Optimizer","Correlation Matrix","AI Decision Report","Technical Engine"],status:"Production",time:new Date().toISOString()}));
app.get("/api/health",async(req,res)=>{const services=await Promise.all([healthOne("CoinGecko",`${CG}/ping`),healthOne("Fear & Greed",FNG)]);res.json({ok:services.some(s=>s.ok),product:PRODUCT,edition:EDITION,version:API_VERSION,build:BUILD,time:new Date().toISOString(),cache:cacheMeta(),services})});
app.get("/api/terminal",async(req,res,next)=>{try{res.json(await terminalPayload(clamp(parseInt(req.query.limit||"80",10)||80,20,100)))}catch(e){next(e)}});
app.get("/api/scan",async(req,res,next)=>{try{res.json(await terminalPayload(clamp(parseInt(req.query.limit||"50",10)||50,10,100)))}catch(e){next(e)}});
app.post("/api/ai-chat",async(req,res)=>{const q=String(req.body?.q||"").toUpperCase();const payload=await terminalPayload(60);const sym=(q.match(/[A-Z]{2,6}/)||[])[0];const row=sym?payload.rows.find(x=>x.symbol===sym):payload.topOpportunity;const answer=row?`${row.decisionAI.tradeBrief}\n\nDrivers: ${row.decisionAI.drivers.map(d=>`${d.factor} ${d.score}`).join(", ")}\nBlockers: ${row.decisionAI.blockers.join(", ")||"ไม่มีจุดเสี่ยงหลัก"}\nChecklist: ${row.decisionAI.entryChecklist.join(" | ")}`:`ตลาดตอนนี้ ${payload.market.regime}, Risk ${payload.market.risk}, Top คือ ${payload.topOpportunity?.symbol||"-"}`;res.json({ok:true,version:API_VERSION,question:req.body?.q||"",answer,row:row||null,time:new Date().toISOString()})});

app.get("/api/fx",async(req,res)=>{
  let rate=36.5, source="fallback";
  try{
    const r=await resilientJSON("fx_usd_thb","https://open.er-api.com/v6/latest/USD",{ttl:3600000,stale:86400000,retries:1,timeout:8000});
    const thb=+(r.data?.rates?.THB||0);
    if(thb>20&&thb<60){rate=thb;source=r.source||"live";}
  }catch(e){}
  res.json({ok:true,pair:"USDTHB",rate:round(rate,4),source,version:API_VERSION,time:new Date().toISOString()});
});

app.use((err,req,res,next)=>res.status(500).json({ok:false,error:err.message||String(err),version:API_VERSION,build:BUILD,time:new Date().toISOString()}));
app.listen(PORT,()=>console.log(`${PRODUCT} ${VERSION} ${EDITION} running on port ${PORT}`));
