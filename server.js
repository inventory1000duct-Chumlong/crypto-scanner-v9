
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

const VERSION = "9.0.0-hedge-fund";
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.static(path.join(__dirname, "public")));

const cache = new Map();
const API = {
  cg: "https://api.coingecko.com/api/v3",
  cc: "https://api.coincap.io/v2",
  fng: "https://api.alternative.me/fng/?limit=1"
};

async function cachedJSON(key, url, ttl=30000, timeout=12000){
  const hit = cache.get(key);
  if(hit && Date.now()-hit.t < ttl) return hit.v;
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), timeout);
  try{
    const res = await fetch(url, {signal: ctrl.signal, headers: {"accept":"application/json","user-agent":"crypto-scanner-v9"}});
    const text = await res.text();
    if(!res.ok) throw new Error(`${res.status} ${text.slice(0,120)}`);
    const data = JSON.parse(text);
    cache.set(key,{t:Date.now(),v:data});
    return data;
  } finally { clearTimeout(timer); }
}

function avg(a){a=a.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function median(a){a=a.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function round(n,d=2){const p=10**d;return Math.round(n*p)/p}
function rank(g){return {"A+":5,A:4,B:3,C:2,D:1}[g]||0}
function regime(avg24, medAbs){ if(avg24<-4)return"CRASH_RISK"; if(medAbs>10)return"HIGH_VOL"; if(avg24>1)return"TREND_UP"; if(avg24<-1)return"TREND_DOWN"; return"SIDEWAY"; }

async function getCoins(limit){
  try{
    const url = `${API.cg}/coins/markets?vs_currency=usd&order=volume_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`;
    const data = await cachedJSON(`cg_${limit}`, url, 30000);
    if(Array.isArray(data) && data.length){
      return {source:"CoinGecko", coins:data.map(x=>({
        id:x.id, symbol:String(x.symbol||"").toUpperCase(), name:x.name||x.id,
        price:+x.current_price, change24h:+(x.price_change_percentage_24h||0),
        change7d:+(x.price_change_percentage_7d_in_currency||0),
        volume:+(x.total_volume||0), marketCap:+(x.market_cap||0),
        high24h:+(x.high_24h||0), low24h:+(x.low_24h||0)
      })).filter(x=>x.symbol && Number.isFinite(x.price) && x.price>0)};
    }
  }catch(e){ console.warn("CoinGecko failed", e.message); }
  const cc = await cachedJSON(`cc_${limit}`, `${API.cc}/assets?limit=${limit}`, 30000);
  if(!cc?.data?.length) throw new Error("No market provider available");
  return {source:"CoinCap", coins:cc.data.map(x=>({
    id:x.id, symbol:String(x.symbol||"").toUpperCase(), name:x.name||x.id,
    price:+x.priceUsd, change24h:+(x.changePercent24Hr||0), change7d:0,
    volume:+(x.volumeUsd24Hr||0), marketCap:+(x.marketCapUsd||0),
    high24h:+x.priceUsd*1.03, low24h:+x.priceUsd*0.97
  })).filter(x=>x.symbol && Number.isFinite(x.price) && x.price>0)};
}

async function fng(){
  try{const d=await cachedJSON("fng", API.fng, 1800000); return +(d?.data?.[0]?.value||0)||null;}catch{return null;}
}

function estimateRR(c, v){
  let base = c.change24h>0&&c.change24h<8 ? 2.0 : c.change24h>=8 ? 1.45 : c.change24h<0 ? 1.55 : 1.75;
  if(c.change7d>0) base += .12;
  if(v>=2&&v<=10) base += .15;
  if(v>16) base -= .25;
  return clamp(base,1.1,2.5);
}
function getGrade(score, rr, volRatio, reg){
  if(reg==="CRASH_RISK") return "D";
  if(score>=85 && rr>=2 && volRatio>=2) return "A+";
  if(score>=75 && rr>=1.8 && volRatio>=1.8) return "A";
  if(score>=60) return "B";
  if(score>=50) return "C";
  return "D";
}
function scoreCoin({coin, volRatio, rr, trend, reg, fear}){
  let score=0, reasons=[], penalties=[];
  if(trend==="BULLISH"){score+=18;reasons.push("Market Bull");}
  else if(trend==="NEUTRAL"){score+=8;reasons.push("Market Neutral");}
  else{score-=15;penalties.push("Market Bear");}
  if(reg==="TREND_UP"){score+=12;reasons.push("Regime Trend Up");}
  else if(reg==="HIGH_VOL"){score-=12;penalties.push("High Volatility");}
  else if(reg==="CRASH_RISK"){score-=25;penalties.push("Crash Risk");}
  if(fear!==null){ if(fear>=25&&fear<=75){score+=6;reasons.push("F&G Normal");} else if(fear>82){score-=8;penalties.push("Extreme Greed");} else if(fear<18){score-=6;penalties.push("Extreme Fear");}}
  if(coin.change24h>0&&coin.change24h<8){score+=18;reasons.push("24h Healthy");}
  else if(coin.change24h>=8){score-=10;penalties.push("ระวังไล่ราคา");}
  else if(coin.change24h<-5){score-=10;penalties.push("24h Weak");}
  if(coin.change7d>0&&coin.change7d<25){score+=10;reasons.push("7d Trend ดี");}
  else if(coin.change7d<-12){score-=8;penalties.push("7d Weak");}
  if(volRatio>=2){score+=22;reasons.push("Volume สูง");}
  else if(volRatio>=1.4){score+=14;reasons.push("Volume ดี");}
  else{score+=4;reasons.push("Volume ปานกลาง");}
  if(rr>=2){score+=18;reasons.push("R:R ≥ 1:2");}
  else if(rr>=1.8){score+=12;reasons.push("R:R พอใช้");}
  else{score-=6;penalties.push("R:R ต่ำ");}
  return {score:clamp(Math.round(score),0,100), reasons, penalties};
}

app.get("/api/health", async (req,res)=>{
  const checks = [["CoinGecko",`${API.cg}/ping`],["CoinCap",`${API.cc}/assets?limit=1`],["Fear & Greed",API.fng]];
  const services=[];
  for(const [name,url] of checks){
    const start=Date.now();
    try{const r=await fetch(url,{headers:{"user-agent":"crypto-scanner-v9","accept":"application/json"}}); services.push({name,ok:r.ok,status:String(r.status),latencyMs:Date.now()-start});}
    catch(e){services.push({name,ok:false,status:e.message,latencyMs:Date.now()-start});}
  }
  res.json({ok:services.some(s=>s.ok),version:VERSION,time:new Date().toISOString(),services});
});

app.get("/api/scan", async (req,res,next)=>{
  try{
    const limit=clamp(parseInt(req.query.limit||"50",10)||50,10,100);
    const {source, coins}=await getCoins(limit);
    const fear=await fng();
    const avg24=avg(coins.map(x=>x.change24h));
    const medAbs=median(coins.map(x=>Math.abs(x.change24h)));
    const trend=avg24>1.2?"BULLISH":avg24<-1.2?"BEARISH":"NEUTRAL";
    const reg=regime(avg24, medAbs);
    const medVol=median(coins.map(x=>x.volume));
    const rows=coins.map(coin=>{
      const rangePct=coin.price?Math.abs((coin.high24h-coin.low24h)/coin.price)*100:4;
      const volatility=Math.max(Math.abs(coin.change24h||0),rangePct,2);
      const rr=estimateRR(coin,volatility);
      const atr=coin.price*Math.max(volatility/100,.018);
      const entryHigh=coin.price, entryLow=Math.max(coin.price-atr*.35, coin.price*.985), sl=Math.max(coin.price-atr*.75, coin.price*.97);
      const tp1=coin.price+(coin.price-sl)*1.2, tp2=coin.price+(coin.price-sl)*2, tp3=coin.price+(coin.price-sl)*3;
      const volRatio=medVol?Math.max(.1,coin.volume/medVol):1;
      const sc=scoreCoin({coin,volRatio,rr,trend,reg,fear});
      const grade=getGrade(sc.score,rr,volRatio,reg);
      return {symbol:coin.symbol,name:coin.name,price:coin.price,change24h:round(coin.change24h,2),change7d:round(coin.change7d,2),marketCap:coin.marketCap,volume:coin.volume,volumeRatio:round(volRatio,2),rr:round(rr,2),score:sc.score,grade,reasons:sc.reasons,penalties:sc.penalties,volatility:round(volatility,2),entryLow:round(entryLow,8),entryHigh:round(entryHigh,8),sl:round(sl,8),tp1:round(tp1,8),tp2:round(tp2,8),tp3:round(tp3,8)};
    }).sort((a,b)=>rank(b.grade)-rank(a.grade)||b.score-a.score);
    res.json({ok:true,version:VERSION,source,time:new Date().toISOString(),market:{trend,regime:reg,fng: fear,avg24:round(avg24,2),medAbs:round(medAbs,2)},rows});
  }catch(e){next(e);}
});
app.get("/api/debug",(req,res)=>res.json({ok:true,version:VERSION,cacheKeys:[...cache.keys()],time:new Date().toISOString()}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({ok:false,error:err.message||String(err),version:VERSION});});
app.listen(PORT,()=>console.log(`Crypto Scanner V9 running on port ${PORT}`));
