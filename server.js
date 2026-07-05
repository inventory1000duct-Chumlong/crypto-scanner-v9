
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

const PRODUCT = "Crypto Scanner Pro";
const VERSION = "10.1.0";
const EDITION = "AI Engine";
const BUILD = "2026.07.05";
const API_VERSION = `${VERSION}-${EDITION.toLowerCase().replaceAll(" ","-")}`;
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.static(path.join(__dirname, "public")));

const cache = new Map();
const lastGood = new Map();
const CG = "https://api.coingecko.com/api/v3";
const FNG = "https://api.alternative.me/fng/?limit=1";

const now = () => new Date().toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (n,min,max) => Math.max(min, Math.min(max,n));
const round = (n,d=2) => { const p=10**d; return Math.round(n*p)/p; };
const avg = a => { a=a.filter(Number.isFinite); return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0; };
const median = a => { a=a.filter(Number.isFinite).sort((x,y)=>x-y); return a.length ? a[Math.floor(a.length/2)] : 0; };
const pct = (arr,v) => {
  arr = arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!arr.length || !Number.isFinite(v)) return 50;
  return clamp(Math.round(arr.filter(x=>x<=v).length / arr.length * 100), 0, 100);
};
const gradeRank = g => ({ "A+":5, A:4, B:3, C:2, D:1 })[g] || 0;

async function fetchText(url, timeout=12000){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try{
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {"accept":"application/json,text/plain,*/*", "user-agent":"Mozilla/5.0 crypto-scanner-v10.1"}
    });
    return {ok:res.ok, status:res.status, text: await res.text()};
  } finally { clearTimeout(timer); }
}
async function resilientJSON(key, url, opt={}){
  const ttl = opt.ttl ?? 30000, stale = opt.stale ?? 1800000, retries = opt.retries ?? 2, timeout = opt.timeout ?? 12000;
  const hit = cache.get(key);
  if(hit && Date.now() - hit.t < ttl) return {data:hit.v, source:"fresh-cache", error:null};
  let err = null;
  for(let i=0;i<=retries;i++){
    try{
      const r = await fetchText(url, timeout);
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${r.text.slice(0,100)}`);
      const data = JSON.parse(r.text);
      cache.set(key, {t:Date.now(), v:data});
      lastGood.set(key, {t:Date.now(), v:data});
      return {data, source:i?`live-retry-${i}`:"live", error:null};
    }catch(e){
      err=e;
      await sleep(350*(i+1));
    }
  }
  const old = lastGood.get(key) || cache.get(key);
  if(old && Date.now() - old.t < stale) return {data:old.v, source:"stale-cache", error:err?.message || "fetch failed"};
  throw new Error(`${key} failed: ${err?.message || "unknown"}`);
}
function normalizeCoins(data){
  if(!Array.isArray(data)) return [];
  return data.map(x => ({
    id:x.id,
    symbol:String(x.symbol||"").toUpperCase(),
    name:x.name || x.id,
    price:+x.current_price,
    change24h:+(x.price_change_percentage_24h || 0),
    change7d:+(x.price_change_percentage_7d_in_currency || 0),
    volume:+(x.total_volume || 0),
    marketCap:+(x.market_cap || 0),
    rank:+(x.market_cap_rank || 999999),
    high24h:+(x.high_24h || 0),
    low24h:+(x.low_24h || 0)
  })).filter(x => x.symbol && Number.isFinite(x.price) && x.price > 0 && x.rank < 500);
}
function demoCoins(){
  return [
    ["BTC","Bitcoin",65000,1.8,5.2,25000000000,1,1.02,.98],
    ["ETH","Ethereum",3400,2.4,7.5,12000000000,2,1.03,.985],
    ["SOL","Solana",150,4.1,12,4200000000,5,1.06,.975],
    ["RNDR","Render",8.2,4.6,13.5,460000000,55,1.07,.96],
    ["FET","Fetch.ai",1.35,3.9,11.1,430000000,58,1.06,.965],
    ["WLD","Worldcoin",2.1,1.5,4.2,520000000,80,1.04,.98],
    ["LINK","Chainlink",14.5,2.8,6.3,600000000,16,1.05,.97],
    ["DOGE","Dogecoin",.13,5.5,9.1,1800000000,8,1.08,.96],
    ["AVAX","Avalanche",28,3.2,8.4,700000000,12,1.06,.965],
    ["ADA","Cardano",.42,2.1,4.5,800000000,10,1.04,.975]
  ].map(([symbol,name,price,change24h,change7d,volume,rank,hi,lo]) => ({
    id:symbol.toLowerCase(), symbol, name, price, change24h, change7d, volume, rank,
    marketCap:volume*20, high24h:price*hi, low24h:price*lo
  }));
}
async function getCoins(limit){
  const diagnostics = [];
  try{
    const url = `${CG}/coins/markets?vs_currency=usd&order=volume_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`;
    const r = await resilientJSON(`cg_${limit}`, url, {ttl:30000, stale:1800000});
    const coins = normalizeCoins(r.data);
    diagnostics.push({provider:"CoinGecko", ok:coins.length>0, source:r.source, error:r.error});
    if(coins.length) return {source:`CoinGecko (${r.source})`, coins, diagnostics};
  }catch(e){ diagnostics.push({provider:"CoinGecko", ok:false, error:e.message}); }
  diagnostics.push({provider:"DemoFallback", ok:true, source:"local-safe-data", error:"CoinGecko unavailable"});
  return {source:"DemoFallback", coins:demoCoins().slice(0,limit), diagnostics};
}
async function getFng(){
  try{
    const r = await resilientJSON("fng", FNG, {ttl:1800000, stale:21600000, retries:1, timeout:8000});
    return {value:+(r.data?.data?.[0]?.value || 0) || null, source:r.source, error:r.error};
  }catch(e){ return {value:null, source:"unavailable", error:e.message}; }
}

function sectorOf(c){
  const s = (c.symbol + " " + c.name).toUpperCase();
  if(/WLD|FET|RNDR|RENDER|TAO|AI|AGIX|OCEAN|AKT|NMR|ARKM/.test(s)) return "AI";
  if(/DOGE|SHIB|PEPE|BONK|FLOKI|MEME|WIF/.test(s)) return "Meme";
  if(/UNI|AAVE|MKR|COMP|CRV|SNX|DYDX|LDO|PENDLE|ENA/.test(s)) return "DeFi";
  if(/ETH|SOL|BNB|ADA|AVAX|NEAR|APT|SUI|DOT|ATOM|SEI|INJ|TON/.test(s)) return "Layer1";
  if(/ARB|OP|MATIC|POL|STRK|IMX/.test(s)) return "Layer2";
  if(/BTC|BCH|LTC|XRP|XLM/.test(s)) return "Major";
  return "Altcoin";
}
function buildSectors(coins){
  const map = {};
  for(const c of coins){ const s=sectorOf(c); (map[s]??=[]).push(c); }
  return Object.entries(map).map(([sector, items]) => {
    const a24=avg(items.map(x=>x.change24h)), a7=avg(items.map(x=>x.change7d));
    const strength = clamp(Math.round(50 + a24*4 + a7*1.5),0,100);
    return {sector, count:items.length, avg24:round(a24,2), avg7:round(a7,2), strength, volume:items.reduce((s,x)=>s+x.volume,0)};
  }).sort((a,b)=>b.strength-a.strength);
}
function marketRegime(avg24, medAbs, fear){
  if(avg24 < -4) return {name:"CRASH_RISK", risk:"HIGH", multiplier:.62};
  if(medAbs > 10) return {name:"HIGH_VOLATILITY", risk:"HIGH", multiplier:.78};
  if(avg24 > 1.2 && (fear===null || fear < 78)) return {name:"BULL", risk:"MEDIUM", multiplier:1.08};
  if(avg24 < -1.2) return {name:"BEAR", risk:"HIGH", multiplier:.72};
  if(avg24 > .2) return {name:"ACCUMULATION", risk:"MEDIUM", multiplier:1.02};
  return {name:"SIDEWAY", risk:"MEDIUM", multiplier:.92};
}
function tradePlan(c){
  const range = c.price ? Math.abs((c.high24h-c.low24h)/c.price)*100 : 4;
  const volatility = Math.max(Math.abs(c.change24h||0), range, 2);
  let rr = c.change24h>0&&c.change24h<8 ? 2 : c.change24h>=8 ? 1.45 : c.change24h<0 ? 1.55 : 1.75;
  if(c.change7d>0) rr += .12;
  if(volatility>=2 && volatility<=10) rr += .15;
  if(volatility>16) rr -= .25;
  rr = clamp(rr,1.1,2.6);
  const atr = c.price * Math.max(volatility/100, .018);
  const entryHigh=c.price, entryLow=Math.max(c.price-atr*.35, c.price*.985), sl=Math.max(c.price-atr*.75, c.price*.97);
  return {volatility, rr, entryLow, entryHigh, sl, tp1:c.price+(c.price-sl)*1.2, tp2:c.price+(c.price-sl)*2, tp3:c.price+(c.price-sl)*3};
}
function components({coin, volRatio, rr, regime, sectorStrength, fear, liquidityPct, momentumPct, volumePct}){
  return {
    trend: clamp(50 + coin.change7d*2.2 + coin.change24h*2.8,0,100),
    momentum: clamp(momentumPct*.7 + (coin.change24h>0?18:0) - (coin.change24h>10?20:0),0,100),
    volume: clamp(volumePct*.75 + (volRatio>=2?20:volRatio>=1.4?12:0),0,100),
    relativeStrength: clamp(45 + coin.change7d*2 + coin.change24h*2,0,100),
    sector: sectorStrength ?? 50,
    regime: regime.name==="BULL"?82:regime.name==="ACCUMULATION"?70:regime.name==="SIDEWAY"?58:regime.name==="HIGH_VOLATILITY"?38:regime.name==="BEAR"?30:20,
    fearGreed: fear===null?55:(fear>=25&&fear<=75?78:fear>82?35:fear<18?40:58),
    liquidity: liquidityPct,
    risk: clamp(100 - (coin.change24h>10?25:0) - (coin.change24h<-6?20:0) - (regime.risk==="HIGH"?22:0),0,100),
    rr: clamp(rr*40,0,100)
  };
}
function aiScore(comps){
  const w = {trend:.13,momentum:.12,volume:.13,relativeStrength:.11,sector:.10,regime:.12,fearGreed:.07,liquidity:.08,risk:.08,rr:.06};
  let total=0, xai=[];
  for(const [k,weight] of Object.entries(w)){
    const contribution = comps[k]*weight;
    total += contribution;
    xai.push({component:k, score:round(comps[k],1), weight, contribution:round(contribution,1)});
  }
  return {score:clamp(Math.round(total),0,100), xai:xai.sort((a,b)=>b.contribution-a.contribution)};
}
function confidence({score, comps, penalties, providerQuality}){
  const vals = Object.values(comps);
  const dispersion = Math.max(...vals) - Math.min(...vals);
  let c = score*.62 + comps.risk*.16 + comps.liquidity*.10 + providerQuality*.12;
  if(dispersion > 65) c -= 12;
  c -= Math.min(18, (penalties||[]).length*5);
  return clamp(Math.round(c),0,98);
}
function grade({score, conf, rr, volRatio, regime, riskScore}){
  if(regime.name === "CRASH_RISK") return "D";
  if(score>=84 && conf>=82 && rr>=2 && volRatio>=1.8 && riskScore>=60) return "A+";
  if(score>=75 && conf>=70 && rr>=1.75 && volRatio>=1.3 && riskScore>=55) return "A";
  if(score>=62 && conf>=55) return "B";
  if(score>=50) return "C";
  return "D";
}
function decision(g, conf, regime){
  if(regime.risk==="HIGH" && g!=="A+") return "Watch / Risk High";
  if(g==="A+" && conf>=85) return "Strong Buy Zone";
  if(g==="A") return "Buy / Wait Entry";
  if(g==="B") return "Small Position";
  if(g==="C") return "Watch";
  return "Avoid";
}
function position(entry, sl, capital=10000, riskPct=1){
  const riskAmount = capital*(riskPct/100);
  const riskPerUnit = Math.max(entry-sl, entry*.002);
  const qty = riskAmount/riskPerUnit;
  return {capital, riskPct, riskAmount:round(riskAmount,2), qty:round(qty,6), positionValue:round(qty*entry,2)};
}

app.get("/api/version", (req,res) => res.json({
  product:PRODUCT, edition:EDITION, version:VERSION, apiVersion:API_VERSION, build:BUILD,
  backend:"Node.js", frontend:"V10.1 AI Engine", status:"Production", time:now()
}));

app.get("/api/health", async (req,res) => {
  const services = [];
  for(const [name,url] of [["CoinGecko",`${CG}/ping`],["Fear & Greed",FNG]]){
    const start=Date.now();
    try{ const r=await fetchText(url,8000); services.push({name, ok:r.ok, status:String(r.status), latencyMs:Date.now()-start}); }
    catch(e){ services.push({name, ok:false, status:e.message, latencyMs:Date.now()-start}); }
  }
  res.json({ok:services.some(s=>s.ok), product:PRODUCT, edition:EDITION, version:API_VERSION, build:BUILD, time:now(), services});
});

app.get("/api/scan", async (req,res,next) => {
  try{
    const limit = clamp(parseInt(req.query.limit||"50",10)||50,10,100);
    const pack = await getCoins(limit);
    const fng = await getFng();
    const coins = pack.coins;
    const avg24 = avg(coins.map(x=>x.change24h));
    const medAbs = median(coins.map(x=>Math.abs(x.change24h)));
    const regime = marketRegime(avg24, medAbs, fng.value);
    const sectors = buildSectors(coins);
    const secMap = Object.fromEntries(sectors.map(x=>[x.sector,x.strength]));
    const medVol = median(coins.map(x=>x.volume));
    const volumes = coins.map(x=>x.volume);
    const momentums = coins.map(x=>x.change24h + x.change7d*.35);
    const liquidities = coins.map(x=>x.marketCap || x.volume);
    const providerQuality = pack.source.includes("DemoFallback") ? 45 : pack.source.includes("stale") ? 70 : 90;

    const rows = coins.map(coin => {
      const plan = tradePlan(coin);
      const volRatio = medVol ? Math.max(.1, coin.volume/medVol) : 1;
      const sec = sectorOf(coin);
      const momentum = coin.change24h + coin.change7d*.35;
      const comps = components({
        coin, volRatio, rr:plan.rr, regime, sectorStrength:secMap[sec]||50, fear:fng.value,
        liquidityPct:pct(liquidities, coin.marketCap||coin.volume),
        momentumPct:pct(momentums, momentum),
        volumePct:pct(volumes, coin.volume)
      });
      const penalties = [];
      if(coin.change24h >= 10) penalties.push("ราคาวิ่งแรงเกิน ระวังไล่ราคา");
      if(coin.change24h < -6) penalties.push("Momentum อ่อน");
      if(regime.risk === "HIGH") penalties.push("Market Regime เสี่ยงสูง");
      if(plan.rr < 1.75) penalties.push("R:R ต่ำ");

      const ai = aiScore(comps);
      const conf = confidence({score:ai.score, comps, penalties, providerQuality});
      const g = grade({score:ai.score, conf, rr:plan.rr, volRatio, regime, riskScore:comps.risk});
      const pos = position(plan.entryHigh, plan.sl);

      return {
        symbol:coin.symbol, name:coin.name, sector:sec, price:coin.price, rank:coin.rank,
        change24h:round(coin.change24h,2), change7d:round(coin.change7d,2),
        volume:coin.volume, marketCap:coin.marketCap, volumeRatio:round(volRatio,2),
        score:ai.score, confidence:conf, grade:g, decision:decision(g,conf,regime),
        xai:ai.xai, components:comps,
        reasons:ai.xai.slice(0,4).map(x=>`${x.component} +${x.contribution}`),
        penalties,
        rr:round(plan.rr,2), volatility:round(plan.volatility,2),
        entryLow:round(plan.entryLow,8), entryHigh:round(plan.entryHigh,8), sl:round(plan.sl,8),
        tp1:round(plan.tp1,8), tp2:round(plan.tp2,8), tp3:round(plan.tp3,8),
        position:pos
      };
    }).sort((a,b)=>gradeRank(b.grade)-gradeRank(a.grade)||b.confidence-a.confidence||b.score-a.score);

    res.json({
      ok:true, product:PRODUCT, edition:EDITION, version:API_VERSION, build:BUILD, source:pack.source, time:now(),
      diagnostics:pack.diagnostics,
      market:{regime:regime.name, risk:regime.risk, multiplier:regime.multiplier, fng:fng.value, avg24:round(avg24,2), medAbs:round(medAbs,2), fearSource:fng.source, fearError:fng.error},
      sectors, topOpportunity:rows[0]||null, rows
    });
  }catch(e){ next(e); }
});

app.get("/api/debug", (req,res) => res.json({ok:true, product:PRODUCT, edition:EDITION, version:API_VERSION, build:BUILD, cacheKeys:[...cache.keys()], lastGoodKeys:[...lastGood.keys()], time:now()}));
app.use((err,req,res,next) => res.status(500).json({ok:false, error:err.message||String(err), version:API_VERSION, build:BUILD, time:now()}));
app.listen(PORT, () => console.log(`${PRODUCT} ${VERSION} ${EDITION} running on port ${PORT}`));
