import { useState, useEffect, useCallback, useRef } from "react";

/*
══════════════════════════════════════════════════════════════
  DRUG WARS: EMPIRE — NEUROCHEMICAL EDITION

  DOPAMINE: Variable-ratio rewards, near-misses, streaks,
            price spikes you ALMOST caught, escalating multipliers,
            "just one more turn" compulsion loops

  SEROTONIN: Territory ownership, reputation rank progression,
             tribute income, status symbols, milestone collection

  OXYTOCIN: Informant relationship/loyalty, gang alliances,
            2P shared-screen betrayal tension, protecting your rat

  ENDORPHIN: Screen shake, close escapes, health-danger zone,
             cop shootouts, near-death survival, loss aversion
══════════════════════════════════════════════════════════════
*/

// ── AUDIO ──────────────────────────────────────────────────
const SFX = {
  c: null,
  i() { if (!this.c) try { this.c = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} },
  p(f, d=0.08, t="square", v=0.05) {
    try { this.i(); const o=this.c.createOscillator(),g=this.c.createGain(); o.type=t; o.frequency.value=f; g.gain.setValueAtTime(v,this.c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.c.currentTime+d); o.connect(g); g.connect(this.c.destination); o.start(); o.stop(this.c.currentTime+d); } catch(e){}
  },
  buy() { this.p(520,0.05); setTimeout(()=>this.p(660,0.06),50); },
  sell() { this.p(440,0.04); setTimeout(()=>this.p(880,0.1,"sine"),40); },
  big() { [0,70,140,210,280].forEach((d,i)=>setTimeout(()=>this.p(440+i*110,0.15,"sine",0.07),d)); },
  bad() { this.p(180,0.2,"sawtooth",0.07); },
  miss() { this.p(300,0.08); setTimeout(()=>this.p(220,0.12),80); },
  lvl() { [0,90,180].forEach((d,i)=>setTimeout(()=>this.p(523+i*131,0.18,"sine",0.08),d)); },
  tick() { this.p(1200,0.02,"sine",0.02); },
};

// ── CONFIG ─────────────────────────────────────────────────
const DAYS = 30, CASH0 = 2000, DEBT0 = 5500, SPACE0 = 100;
const DINT = 0.10, BINT = 0.05;
const HEAT_CAP = 100;
const CONSIGNMENT_TURNS = 5;
const CONSIGNMENT_MARKUP = 2.0;
const R = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const C = p => Math.random()<p;
const $ = n => { if(n<0)return`-${$(-n)}`; if(n>=1e6)return`$${(n/1e6).toFixed(2)}M`; if(n>=1e4)return`$${(n/1e3).toFixed(1)}K`; return`$${n.toLocaleString()}`; };

const DRUGS = [
  { id:"cocaine",name:"Cocaine",e:"❄️",min:15000,max:29000,t:3 },
  { id:"heroin",name:"Heroin",e:"💉",min:5000,max:14000,t:3 },
  { id:"ecstasy",name:"Ecstasy",e:"💎",min:2000,max:8000,t:2 },
  { id:"acid",name:"Acid",e:"🌈",min:1000,max:4500,t:2 },
  { id:"weed",name:"Weed",e:"🌿",min:300,max:900,t:1 },
  { id:"speed",name:"Speed",e:"⚡",min:70,max:250,t:1 },
  { id:"ludes",name:"Ludes",e:"💊",min:10,max:60,t:1 },
];

const REGIONS = [
  { id:"nyc",name:"New York",em:"🗽",c:"#ef4444",rep:0,fly:0,td:0,pm:{},law:{fn:"NYPD",fe:"🚔",bm:1.0,ab:0,hdb:0,em2:0,bh:"brutal"},cs:0.35,cb:["cocaine","heroin"] },
  { id:"colombia",name:"Colombia",em:"🇨🇴",c:"#dc2626",rep:30,fly:3000,td:2,pm:{cocaine:0.3,heroin:0.8},law:{fn:"Policia Nacional",fe:"🇨🇴",bm:0.5,ab:-1,hdb:3,em2:-0.05,bh:"corrupt"},cs:0.15,cb:["heroin"] },
  { id:"netherlands",name:"Netherlands",em:"🇳🇱",c:"#f97316",rep:50,fly:5000,td:2,pm:{ecstasy:0.35,weed:0.4,acid:0.5},law:{fn:"Politie",fe:"🇳🇱",bm:1.8,ab:-1,hdb:5,em2:-0.08,bh:"methodical"},cs:0.25,cb:["ecstasy","weed","acid"] },
  { id:"thailand",name:"Thailand",em:"🇹🇭",c:"#14b8a6",rep:40,fly:4000,td:2,pm:{heroin:0.3,speed:0.35},law:{fn:"Royal Thai Police",fe:"🇹🇭",bm:0.6,ab:0,hdb:2,em2:0,bh:"corrupt"},cs:0.30,cb:["heroin","speed"] },
  { id:"france",name:"France",em:"🇫🇷",c:"#6366f1",rep:60,fly:4500,td:2,pm:{heroin:0.45,cocaine:0.65},law:{fn:"Gendarmerie",fe:"🇫🇷",bm:1.5,ab:1,hdb:1,em2:0.03,bh:"methodical"},cs:0.40,cb:["cocaine","heroin"] },
];

const NYC = [
  { id:"bronx",name:"The Bronx",e:"🏚️",c:"#ef4444",bank:true,shark:true,r:"nyc" },
  { id:"ghetto",name:"The Ghetto",e:"🔥",c:"#a855f7",r:"nyc" },
  { id:"central_park",name:"Central Park",e:"🌳",c:"#22c55e",r:"nyc" },
  { id:"manhattan",name:"Manhattan",e:"🏙️",c:"#3b82f6",r:"nyc" },
  { id:"coney",name:"Coney Island",e:"🎡",c:"#f59e0b",r:"nyc" },
  { id:"brooklyn",name:"Brooklyn",e:"🌉",c:"#ec4899",r:"nyc" },
];
const COLOMBIA = [
  { id:"bogota",name:"Bogotá",e:"🏛️",c:"#dc2626",bank:true,shark:true,r:"colombia" },
  { id:"medellin",name:"Medellín",e:"💀",c:"#991b1b",r:"colombia" },
  { id:"cali",name:"Cali",e:"🌴",c:"#b91c1c",r:"colombia" },
  { id:"cartagena",name:"Cartagena",e:"⚓",c:"#ef4444",r:"colombia" },
  { id:"barranquilla",name:"Barranquilla",e:"🏖️",c:"#f87171",r:"colombia" },
  { id:"bucaramanga",name:"Bucaramanga",e:"⛰️",c:"#fca5a5",r:"colombia" },
];
const NETH = [
  { id:"amsterdam",name:"Amsterdam",e:"🌷",c:"#f97316",bank:true,shark:true,r:"netherlands" },
  { id:"rotterdam",name:"Rotterdam",e:"🚢",c:"#ea580c",r:"netherlands" },
  { id:"the_hague",name:"The Hague",e:"⚖️",c:"#c2410c",r:"netherlands" },
  { id:"utrecht",name:"Utrecht",e:"🏰",c:"#fb923c",r:"netherlands" },
  { id:"eindhoven",name:"Eindhoven",e:"💡",c:"#fdba74",r:"netherlands" },
  { id:"groningen",name:"Groningen",e:"🌾",c:"#fed7aa",r:"netherlands" },
];
const THAI = [
  { id:"bangkok",name:"Bangkok",e:"🛕",c:"#14b8a6",bank:true,shark:true,r:"thailand" },
  { id:"chiang_mai",name:"Chiang Mai",e:"🏔️",c:"#0d9488",r:"thailand" },
  { id:"phuket",name:"Phuket",e:"🏝️",c:"#0f766e",r:"thailand" },
  { id:"pattaya",name:"Pattaya",e:"🌃",c:"#2dd4bf",r:"thailand" },
  { id:"chiang_rai",name:"Chiang Rai",e:"🔺",c:"#5eead4",r:"thailand" },
  { id:"hat_yai",name:"Hat Yai",e:"🌧️",c:"#99f6e4",r:"thailand" },
];
const FRAN = [
  { id:"marseille",name:"Marseille",e:"🚢",c:"#6366f1",bank:true,shark:true,r:"france" },
  { id:"paris",name:"Paris",e:"🗼",c:"#4f46e5",r:"france" },
  { id:"lyon",name:"Lyon",e:"🍷",c:"#4338ca",r:"france" },
  { id:"nice",name:"Nice",e:"🌊",c:"#818cf8",r:"france" },
  { id:"toulouse",name:"Toulouse",e:"🌹",c:"#a5b4fc",r:"france" },
  { id:"bordeaux",name:"Bordeaux",e:"🍇",c:"#c7d2fe",r:"france" },
];
const LOCS = [...NYC,...COLOMBIA,...NETH,...THAI,...FRAN];
const getRegion = lid => { const l=LOCS.find(x=>x.id===lid); return l?REGIONS.find(r=>r.id===l.r):REGIONS[0]; };
const getRegionLocs = rid => LOCS.filter(l=>l.r===rid);

const GANGS = [
  { id:"col",name:"The Colombians",e:"🐍",c:"#dc2626",turf:["ghetto"] },
  { id:"tri",name:"The Triads",e:"🐉",c:"#f59e0b",turf:["manhattan"] },
  { id:"bra",name:"The Bratva",e:"🐻",c:"#6366f1",turf:["brooklyn"] },
  { id:"lcn",name:"La Cosa Nostra",e:"🎰",c:"#059669",turf:["coney"] },
  { id:"car",name:"Medellín Cartel",e:"☠️",c:"#991b1b",turf:["medellin","cali"] },
  { id:"pen",name:"The Penose",e:"🌑",c:"#ea580c",turf:["amsterdam","rotterdam"] },
  { id:"jao",name:"Jao Pho",e:"🐅",c:"#0d9488",turf:["bangkok","chiang_rai"] },
  { id:"cor",name:"The Corsicans",e:"🗡️",c:"#4f46e5",turf:["marseille","nice"] },
];

const RANKS = [
  {n:"Corner Boy",r:0,e:"🧢"},{n:"Street Dealer",r:15,e:"🔑"},{n:"Shot Caller",r:35,e:"📱"},
  {n:"Lieutenant",r:60,e:"💼"},{n:"Underboss",r:100,e:"🎯"},{n:"Kingpin",r:160,e:"👑"},
  {n:"Drug Lord",r:250,e:"🏆"},{n:"Ghost",r:400,e:"👻"},
];

const EVTS = [
  // Global
  {m:"Cops busted a shipment! Prices skyrocketed!",d:"cocaine",x:4,t:"spike",rid:null},
  {m:"Cheap heroin flooding in from overseas!",d:"heroin",x:0.35,t:"crash",rid:null},
  {m:"Acid factory raided! Prices soaring!",d:"acid",x:4,t:"spike",rid:null},
  {m:"Market flooded with cheap acid!",d:"acid",x:0.25,t:"crash",rid:null},
  {m:"Weed drought — prices skyrocketed!",d:"weed",x:3.5,t:"spike",rid:null},
  {m:"Dealers dumping weed everywhere!",d:"weed",x:0.25,t:"crash",rid:null},
  {m:"Quaalude factory raided!",d:"ludes",x:6,t:"spike",rid:null},
  {m:"Ludes dirt cheap everywhere!",d:"ludes",x:0.15,t:"crash",rid:null},
  // NYC
  {m:"DEA raid in the Bronx! Heroin supply dried up!",d:"heroin",x:4,t:"spike",rid:"nyc"},
  {m:"Wall Street party weekend — cocaine demand insane!",d:"cocaine",x:6,t:"spike",rid:"nyc"},
  {m:"Junkies desperate in the subway — heroin prices insane!",d:"heroin",x:7,t:"spike",rid:"nyc"},
  {m:"Colombian shipment arrives in NYC!",d:"cocaine",x:0.3,t:"crash",rid:"nyc"},
  {m:"Dutch ecstasy floods the US market!",d:"ecstasy",x:0.3,t:"crash",rid:"nyc"},
  {m:"Speed addicts paying premium in Brooklyn!",d:"speed",x:5,t:"spike",rid:"nyc"},
  // Colombia
  {m:"Cartel lab discovered — cocaine flooding streets!",d:"cocaine",x:0.2,t:"crash",rid:"colombia"},
  {m:"Government airstrike on coca fields!",d:"cocaine",x:5,t:"spike",rid:"colombia"},
  {m:"Rival cartel war — supply cut off!",d:"cocaine",x:4,t:"spike",rid:"colombia"},
  {m:"New coca harvest — prices plummeting!",d:"cocaine",x:0.25,t:"crash",rid:"colombia"},
  // Netherlands
  {m:"Rave festival in Amsterdam — ecstasy demand insane!",d:"ecstasy",x:5,t:"spike",rid:"netherlands"},
  {m:"Coffee shop surplus — weed dirt cheap!",d:"weed",x:0.2,t:"crash",rid:"netherlands"},
  {m:"Dutch lab bust — ecstasy prices soaring!",d:"ecstasy",x:4,t:"spike",rid:"netherlands"},
  {m:"Acid flooding Amsterdam clubs!",d:"acid",x:0.3,t:"crash",rid:"netherlands"},
  // Thailand
  {m:"Golden Triangle pipeline opened — cheap heroin!",d:"heroin",x:0.25,t:"crash",rid:"thailand"},
  {m:"Thai police crackdown on ya ba!",d:"speed",x:5,t:"spike",rid:"thailand"},
  {m:"Full moon party demand — ecstasy prices insane!",d:"ecstasy",x:5,t:"spike",rid:"thailand"},
  {m:"Opium surplus from the hills!",d:"heroin",x:0.3,t:"crash",rid:"thailand"},
  // France
  {m:"Corsican connection intercepted!",d:"heroin",x:5,t:"spike",rid:"france"},
  {m:"Marseille port smuggling ring busted!",d:"cocaine",x:4,t:"spike",rid:"france"},
  {m:"Riviera party season — cocaine demand surging!",d:"cocaine",x:5,t:"spike",rid:"france"},
  {m:"New pipeline from Morocco — cheap speed!",d:"speed",x:0.2,t:"crash",rid:"france"},
];

const RATNAMES = ["Jimmy Two-Shoes","Skinny Pete","Maria Espinoza","Dice","Nails","Whisper","Tina Blade","Switchblade Sam"];
const RATTYPES = ["nervous","cocky","loyal","greedy"];

const MILES = [
  {id:"ft",cond:s=>s.trades>=1,m:"First Trade",e:"🎯"},
  {id:"df",cond:s=>s.debt<=0,m:"Debt Free",e:"🦈"},
  {id:"10k",cond:s=>s.cash+s.bank>=10000,m:"$10K Club",e:"💰"},
  {id:"50k",cond:s=>s.cash+s.bank>=50000,m:"$50K",e:"💎"},
  {id:"100k",cond:s=>s.cash+s.bank>=100000,m:"$100K",e:"🏆"},
  {id:"ter",cond:s=>Object.keys(s.terr).length>=1,m:"First Territory",e:"🏴"},
  {id:"emp",cond:s=>Object.keys(s.terr).length>=3,m:"Empire",e:"👑"},
  {id:"s5",cond:s=>s.mstrk>=5,m:"5x Streak",e:"🔥"},
  {id:"s10",cond:s=>s.mstrk>=10,m:"10x Streak",e:"🔥"},
  {id:"surv",cond:s=>s.close>=3,m:"Survivor",e:"💀"},
  {id:"intl",cond:s=>s.intl,m:"International",e:"✈️"},
  {id:"gun",cond:s=>s.gun,m:"Armed",e:"🔫"},
  {id:"big",cond:s=>s.best>=50000,m:"Big Score",e:"💥"},
  {id:"rat",cond:s=>s.rat.hired,m:"Connected",e:"🐀"},
  {id:"smug",cond:s=>s.customsEvasions>=3,m:"Smuggler",e:"🧳"},
  {id:"debtor",cond:s=>s.consignment===null&&s.fingers<10,m:"Scarred",e:"✂️"},
  {id:"dealer",cond:s=>s.consignmentsCompleted>=1,m:"Deal Maker",e:"🤝"},
];

function getRank(rep) { let r=RANKS[0]; for(const x of RANKS) if(rep>=x.r) r=x; return r; }

function genP(loc, ev) {
  const reg = getRegion(loc);
  const pm = reg?.pm || {};
  const p = {};
  DRUGS.forEach(d => {
    const isEvDrug = ev && ev.d===d.id;
    if(!isEvDrug && C(0.12)){p[d.id]=null;return;}
    let pr = R(d.min,d.max);
    if(pm[d.id]) pr = Math.round(pr*pm[d.id]);
    if(isEvDrug) { pr = Math.round(d.min*ev.x + Math.random()*d.min*0.15); if(pm[d.id]) pr=Math.round(pr*pm[d.id]); }
    p[d.id] = Math.max(1,pr);
  });
  return p;
}

function mkRat() { return {name:RATNAMES[R(0,RATNAMES.length-1)],pers:RATTYPES[R(0,3)],loy:50+R(-15,15),intel:R(1,3),alive:true,hired:false,cost:R(200,800),tips:0,pendingTip:null}; }

function init(mode="solo") {
  const ev = C(0.35) ? EVTS[R(0,EVTS.length-1)] : null;
  const base = () => ({
    day:1,cash:CASH0,debt:DEBT0,bank:0,loc:"bronx",inv:{},spc:SPACE0,
    prices:genP("bronx",ev),prev:{},gun:false,hp:100,heat:0,
    rep:0,profit:0,best:0,trades:0,strk:0,mstrk:0,combo:1,
    avg:{},terr:{},gang:Object.fromEntries(GANGS.map(g=>[g.id,0])),
    rat:mkRat(),ev:ev,evs:ev?[{d:1,m:ev.m,t:ev.t}]:[],
    nms:[],offer:null,cops:null,trib:0,intl:false,recentSold:[],
    close:0,miles:[],newMile:null,customsEvasions:0,customsCaught:0,
    consignment:null,fingers:10,consignmentsCompleted:0,
  });
  if(mode==="2p"){const ev2=C(0.35)?EVTS[R(0,EVTS.length-1)]:null;return {mode:"2p",phase:"title",turn:1,p1:{...base(),nm:"Player 1",pc:"#ef4444"},p2:{...base(),nm:"Player 2",pc:"#3b82f6",loc:"brooklyn",ev:ev2,evs:ev2?[{d:1,m:ev2.m,t:ev2.t}]:[],prices:genP("brooklyn",ev2)}};}
  return {mode:"solo",phase:"title",...base()};
}

function selectEvent(regionId, ratTip, baseChance) {
  if(!C(baseChance)){
    if(ratTip&&ratTip.acc&&ratTip.tu<=0&&C(0.55)){
      const ms=EVTS.filter(e=>(!e.rid||e.rid===regionId)&&e.d===ratTip.did&&e.t===ratTip.dir);
      return ms.length?ms[R(0,ms.length-1)]:null;
    }
    return null;
  }
  const eligible=EVTS.filter(e=>!e.rid||e.rid===regionId);
  if(!eligible.length)return null;
  if(ratTip&&ratTip.acc&&ratTip.tu<=0&&C(0.55)){
    const ms=eligible.filter(e=>e.d===ratTip.did&&e.t===ratTip.dir);
    if(ms.length)return ms[R(0,ms.length-1)];
  }
  return eligible[R(0,eligible.length-1)];
}

function genRatTip(rat, regionId) {
  const acc = C(0.35 + rat.intel * 0.15);
  if(acc){
    const eligible=EVTS.filter(e=>!e.rid||e.rid===regionId);
    if(!eligible.length)return null;
    const ev=eligible[R(0,eligible.length-1)];
    return {did:ev.d,dir:ev.t,conf:rat.intel,tu:R(1,2),acc:true};
  }
  const drug=DRUGS[R(0,DRUGS.length-1)];
  return {did:drug.id,dir:C(0.5)?"spike":"crash",conf:rat.intel,tu:R(1,2),acc:false};
}

function genConsignmentOffer(p, loc) {
  if(p.consignment) return null;
  if(p.rep < 15) return null;
  const gang = GANGS.find(g => g.turf.includes(loc));
  if(!gang) return null;
  if((p.gang[gang.id] ?? 0) < -5) return null;
  if(!C(0.15)) return null;
  const weights = DRUGS.map(d => ({drug:d, w:d.t*d.t}));
  const tw = weights.reduce((s,w) => s+w.w, 0);
  let roll = Math.random() * tw;
  let picked = weights[0].drug;
  for(const w of weights) { roll -= w.w; if(roll <= 0) { picked = w.drug; break; } }
  let qty;
  if(picked.t === 3) qty = R(3,8);
  else if(picked.t === 2) qty = R(5,15);
  else qty = R(10,30);
  const wholesale = Math.round((picked.min + picked.max) / 2);
  const owed = Math.round(wholesale * CONSIGNMENT_MARKUP * qty);
  return {did:picked.id, qty, owed, gid:gang.id};
}

function customsCheck(p, destReg) {
  const total=Object.values(p.inv).reduce((a,b)=>a+b,0);
  if(total<=0)return null;
  let det=destReg.cs+total*0.002+p.heat*0.002-(p.spc>SPACE0?0.05:0);
  det=Math.max(0.05,Math.min(0.75,det));
  if(!C(det))return null;
  const carried=Object.entries(p.inv).filter(([,q])=>q>0);
  if(!carried.length)return null;
  const contrab=carried.filter(([id])=>destReg.cb.includes(id));
  const target=contrab.length?contrab[R(0,contrab.length-1)][0]:carried[R(0,carried.length-1)][0];
  const qty=p.inv[target];
  const confQty=Math.max(1,Math.ceil(qty*R(30,80)/100));
  const drug=DRUGS.find(d=>d.id===target);
  const sv=confQty*R(drug.min,drug.max);
  const fine=Math.min(Math.round(sv*R(10,30)/100),p.cash);
  const hg=R(8,20);
  return {drug:target,qty:confQty,fine,hg,msg:`Customs seized ${confQty} ${drug.e} ${drug.name} and fined you ${$(fine)}!`};
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
export default function App() {
  const [gs,sGs] = useState(()=>init());
  const [ui,sUi] = useState({tr:null,tq:"",tab:"market",shk:false,sub:null,nots:[]});
  const nt = useRef(null);

  const cp = gs.mode==="2p" ? (gs.turn===1?gs.p1:gs.p2) : gs;
  const scp = fn => {
    sGs(p => {
      if(p.mode==="2p"){const k=p.turn===1?"p1":"p2";const u=fn(p[k]);return{...p,[k]:{...p[k],...u}};}
      const u=fn(p);return{...p,...u};
    });
  };

  const used = Object.values(cp.inv).reduce((a,b)=>a+b,0);
  const effSpc = cp.spc - (10 - (cp.fingers||10)) * 5;
  const free = effSpc - used;
  const loc = LOCS.find(l=>l.id===cp.loc);
  const rank = getRank(cp.rep);
  const nw = cp.cash+cp.bank-cp.debt+Object.entries(cp.inv).reduce((s,[id,q])=>{const d=DRUGS.find(x=>x.id===id);return s+q*(cp.prices[id]||d.min);},0);

  const notify = useCallback((m,t="info")=>{
    sUi(u=>({...u,nots:[...u.nots.slice(-3),{m,t,k:Date.now()}]}));
    if(nt.current)clearTimeout(nt.current);
    nt.current=setTimeout(()=>sUi(u=>({...u,nots:[]})),3500);
  },[]);
  const shake = useCallback(()=>{ sUi(u=>({...u,shk:true})); setTimeout(()=>sUi(u=>({...u,shk:false})),500); },[]);

  function chkMiles(s) {
    const ms=[...(s.miles||[])]; let nm=null;
    for(const m of MILES){if(m.cond(s)&&!ms.includes(m.id)){ms.push(m.id);nm=m;}}
    return {miles:ms,newMile:nm};
  }

  function settleConsignment(p, isOverdue) {
    const con = p.consignment;
    const gang = GANGS.find(g => g.id === con.gid);
    const gn = gang?.name || 'The gang';
    const ge = gang?.e || '☠️';
    let remaining = con.owed - con.paid;
    const cashPay = Math.min(p.cash, remaining);
    p.cash -= cashPay; remaining -= cashPay;
    if(remaining > 0) {
      const order = Object.keys(p.inv).sort((a,b) => a===con.did?-1:b===con.did?1:0);
      for(const did of order) {
        if(remaining <= 0) break;
        const qty = p.inv[did] || 0;
        if(qty <= 0) continue;
        const pr = p.prices[did] || DRUGS.find(d=>d.id===did).min;
        const take = Math.min(qty, Math.ceil(remaining/pr));
        const val = take * pr;
        p.inv = {...p.inv, [did]: qty - take};
        if(p.inv[did] <= 0) delete p.inv[did];
        remaining -= val;
      }
    }
    const totalPaid = con.owed - Math.max(0, remaining);
    const pct = totalPaid / con.owed;
    const fullT = isOverdue ? 999 : 1.0;
    const partT = isOverdue ? 1.0 : 0.7;
    let outcome;
    if(pct >= fullT) {
      outcome = 'full';
      p.gang = {...p.gang, [con.gid]: (p.gang[con.gid]??0)+8};
      p.rep += 5; p.consignmentsCompleted++;
      p.evs = [...p.evs, {d:p.day, m:`${ge} ${gn} pleased! 'You're alright.'`, t:"consignment"}];
      SFX.lvl();
    } else if(pct >= partT) {
      outcome = 'partial';
      p.fingers = Math.max(0, p.fingers-1);
      p.gang = {...p.gang, [con.gid]: (p.gang[con.gid]??0)+(isOverdue?-6:-3)};
      p.evs = [...p.evs, {d:p.day, m:`✂️ ${gn} took a finger. 'Next time, have it ALL.'`, t:"consignment"}];
      SFX.bad(); shake();
    } else {
      outcome = 'poor';
      p.fingers = Math.max(0, p.fingers-2);
      p.gang = {...p.gang, [con.gid]: (p.gang[con.gid]??0)+(isOverdue?-16:-8)};
      p.hp -= R(15,30);
      p.evs = [...p.evs, {d:p.day, m:`✂️✂️ ${gn} took TWO fingers and beat you. 'Pathetic.'`, t:"consignment"}];
      SFX.bad(); shake();
    }
    if(p.fingers <= 4) p.gun = false;
    p.consignment = null;
    const{miles,newMile}=chkMiles(p); p.miles=miles; p.newMile=newMile;
    return outcome;
  }

  function bountyHunterAct(p, action) {
    const con = p.consignment;
    const gang = GANGS.find(g => g.id === con.gid);
    const gn = gang?.name || 'The gang';
    if(action === 'pay') {
      const remaining = con.owed - con.paid;
      let toPay = Math.round(remaining * 1.5);
      const cashPay = Math.min(p.cash, toPay); p.cash -= cashPay; toPay -= cashPay;
      if(toPay > 0) {
        for(const did of Object.keys(p.inv)) {
          if(toPay <= 0) break;
          const qty = p.inv[did]||0; if(qty<=0)continue;
          const pr = p.prices[did] || DRUGS.find(d=>d.id===did).min;
          const take = Math.min(qty, Math.ceil(toPay/pr));
          p.inv = {...p.inv, [did]: qty-take}; if(p.inv[did]<=0)delete p.inv[did];
          toPay -= take * pr;
        }
      }
      p.consignment = null; p.consignmentsCompleted++;
      p.gang = {...p.gang, [con.gid]: (p.gang[con.gid]??0)-2};
      p.evs = [...p.evs, {d:p.day, m:`🤝 Paid off ${gn}'s bounty hunter. Debt settled.`, t:"consignment"}];
    } else if(action === 'fight') {
      const killChance = p.gun ? 0.35 : 0.10;
      if(C(killChance)) {
        p.consignment = {...con, tl: -3};
        p.heat = Math.min(HEAT_CAP, p.heat+12); p.rep += 10;
        p.evs = [...p.evs, {d:p.day, m:`Fought off ${gn}'s bounty hunter! They'll be back...`, t:"consignment"}];
      } else {
        p.fingers = Math.max(0, p.fingers-1); p.hp -= R(15,30);
        const dk = Object.keys(p.inv);
        if(dk.length){const k=dk[R(0,dk.length-1)];const lq=Math.ceil((p.inv[k]||0)*R(30,60)/100);p.inv={...p.inv,[k]:(p.inv[k]||0)-lq};if(p.inv[k]<=0)delete p.inv[k];}
        if(p.fingers<=4) p.gun=false;
        p.evs = [...p.evs, {d:p.day, m:`✂️ ${gn}'s bounty hunter took a finger and beat you down.`, t:"consignment"}];
        shake();
      }
    } else {
      if(C(0.35)) {
        p.evs = [...p.evs, {d:p.day, m:`Escaped ${gn}'s bounty hunter! For now...`, t:"consignment"}];
        p.close++;
      } else {
        p.fingers = Math.max(0, p.fingers-1); p.hp -= R(5,15);
        if(p.fingers<=4) p.gun=false;
        p.evs = [...p.evs, {d:p.day, m:`✂️ Caught by ${gn}'s bounty hunter! Lost a finger.`, t:"consignment"}];
        shake();
      }
    }
    p.cops = null;
    if(p.fingers <= 0) { p.hp=0; p.evs=[...p.evs,{d:p.day,m:"You have nothing left.",t:"danger"}]; }
    return p;
  }

  // ── TRAVEL ───────────────────────────────────────────────
  function travel(lid) {
    if(lid===cp.loc) return;
    SFX.tick();
    const dest=LOCS.find(l=>l.id===lid);
    const srcReg=getRegion(cp.loc);
    const destReg=getRegion(lid);
    const isInterRegion=srcReg.id!==destReg.id;
    if(isInterRegion && destReg.id!=="nyc") {
      if(cp.rep<destReg.rep){notify(`Need ${destReg.rep} rep to unlock ${destReg.name}.`,"danger");return;}
      if(cp.cash<destReg.fly){notify(`Flight costs ${$(destReg.fly)}.`,"danger");return;}
    } else if(isInterRegion && destReg.id==="nyc" && srcReg.id!=="nyc") {
      const rc=Math.round(srcReg.fly/2);
      if(cp.cash<rc){notify(`Return flight costs ${$(rc)}.`,"danger");return;}
    }
    sGs(prev => {
      const p = prev.mode==="2p" ? {...prev[prev.turn===1?"p1":"p2"]} : {...prev};
      let td = isInterRegion ? (destReg.id==="nyc"?srcReg.td:destReg.td) : 1;
      td += p.fingers <= 6 ? 1 : 0;
      p.day+=td;
      if(isInterRegion){
        if(destReg.id==="nyc") p.cash-=Math.round(srcReg.fly/2);
        else p.cash-=destReg.fly;
        p.intl=true;
      }
      // Land at capital when flying to a region
      if(isInterRegion){
        const rl=getRegionLocs(destReg.id);
        p.loc=rl[0].id;
      } else {
        p.loc=lid;
      }
      p.debt=Math.round(p.debt*Math.pow(1+DINT,td));
      p.bank=Math.round(p.bank*Math.pow(1+BINT,td));
      // Heat decay with regional law bonus
      const law=getRegion(p.loc).law||{hdb:0};
      let heatDecay=R(5,12)+law.hdb;
      if(p.heat>60)heatDecay+=Math.floor((p.heat-60)*0.15);
      p.heat=Math.max(0,p.heat-heatDecay);
      // Tribute
      const trib=Object.values(p.terr).reduce((s,d)=>s+(d.tr||0),0);
      p.trib=trib; p.cash+=trib*td;
      // Customs check for inter-region travel
      if(isInterRegion){
        const cr=customsCheck(p,destReg);
        if(cr){
          const ni={...p.inv};ni[cr.drug]=(ni[cr.drug]||0)-cr.qty;if(ni[cr.drug]<=0)delete ni[cr.drug];
          p.inv=ni;p.cash-=cr.fine;p.heat=Math.min(HEAT_CAP,p.heat+cr.hg);p.customsCaught++;
          p.evs=[...p.evs,{d:p.day,m:`🛃 ${cr.msg}`,t:"customs"}];shake();
        } else if(Object.values(p.inv).reduce((a,b)=>a+b,0)>0){
          p.customsEvasions++;
        }
      }
      // Rat tip tick-down
      if(p.rat.pendingTip){
        p.rat={...p.rat,pendingTip:{...p.rat.pendingTip,tu:p.rat.pendingTip.tu-1}};
      }
      // Market
      const curReg2=getRegion(p.loc);
      const ev=selectEvent(curReg2.id,p.rat.pendingTip,0.38);
      p.ev=ev; p.prev={...p.prices}; p.prices=genP(p.loc,ev);
      if(ev){const re=curReg2.id!=="nyc"?`${curReg2.em} `:"";p.evs=[...p.evs,{d:p.day,m:`${re}${ev.m}`,t:ev.t}];}
      // Clear expired rat tip
      if(p.rat.pendingTip&&p.rat.pendingTip.tu<=0){p.rat={...p.rat,pendingTip:null};}
      // NEAR MISS — only for drugs you no longer hold (sold too early)
      const nms=[];
      // SOLD-TOO-EARLY near miss
      if(p.recentSold){
        for(const rs of p.recentSold){
          const now=p.prices[rs.id];
          if(now&&now>rs.price*2) nms.push({drug:DRUGS.find(x=>x.id===rs.id),pr:rs.price,now,q:rs.qty,miss:rs.qty*(now-rs.price),type:"sold_early"});
        }
      }
      p.nms=nms;
      p.recentSold=[];
      // Gang tax
      const lg=GANGS.find(g=>g.turf.includes(p.loc));
      if(lg&&!p.terr[p.loc]&&(p.gang[lg.id]??0)<-15&&C(0.3)){
        const tax=Math.round(p.cash*R(5,18)/100);p.cash-=tax;
        p.evs=[...p.evs,{d:p.day,m:`${lg.e} ${lg.name} taxed you ${$(tax)}!`,t:"danger"}];shake();
      }
      // Consignment countdown
      if(p.consignment) {
        p.consignment = {...p.consignment, tl: p.consignment.tl - 1};
        if(p.consignment.tl === 2) { /* warning handled by notify later */ }
        if(p.consignment.tl === 1) { /* warning handled by notify later */ }
        // Settlement if on origin location
        if(p.loc === p.consignment.origin) {
          const isOv = p.consignment.tl < 0;
          settleConsignment(p, isOv);
          if(p.fingers <= 0 || p.hp <= 0) {
            if(prev.mode==="2p") return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"end"};
            return{...prev,...p,phase:"end"};
          }
        }
        // Bounty hunter if overdue and not on origin
        else if(p.consignment && p.consignment.tl < 0) {
          const ot = Math.abs(p.consignment.tl);
          const bChance = Math.min(0.65, 0.25 + ot * 0.08);
          if(C(bChance)) {
            const con = p.consignment;
            const curLaw2 = getRegion(p.loc).law || {bh:"brutal",bm:1,fn:"POLICE",fe:"🚔"};
            p.cops = {n:1, br:Math.round((con.owed-con.paid)*1.5), law:curLaw2, bh:true, con:con};
            if(prev.mode==="2p") return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"cop"};
            return{...prev,...p,phase:"cop"};
          }
        }
      }
      // Rat
      if(p.rat.hired&&p.rat.alive){
        p.rat={...p.rat,loy:p.rat.loy+R(-3,4)};
        if(p.rat.loy<20&&C(0.03+(50-p.rat.loy)/400)){
          p.rat={...p.rat,alive:false};p.heat=Math.min(HEAT_CAP,p.heat+40);
          p.evs=[...p.evs,{d:p.day,m:`🐀 ${p.rat.name} RATTED YOU OUT! Heat surging!`,t:"danger"}];shake();SFX.bad();
        } else if(C(0.22+p.rat.intel*0.07)&&!p.rat.pendingTip){
          const tip=genRatTip(p.rat,curReg2.id);
          if(tip){
            p.rat={...p.rat,tips:p.rat.tips+1,pendingTip:tip};
            const td2=DRUGS.find(x=>x.id===tip.did);
            p.evs=[...p.evs,{d:p.day,m:`🐀 ${p.rat.name}: "${td2.name} gonna ${tip.dir==="spike"?"explode":"crash"} soon..." ${"⭐".repeat(tip.conf)}`,t:"tip"}];
          }
        }
      }
      // Cops — regionalized
      const curLaw=curReg2.law||{em2:0,ab:0,bm:1,bh:"brutal",fn:"POLICE",fe:"🚔"};
      const copBase=0.08+(p.heat/200)*0.35+curLaw.em2;
      const copChance=Math.min(0.65,copBase);
      if(C(copChance)&&used>0){
        const maxOff=Math.min(6,2+Math.floor(p.heat/35)+curLaw.ab);
        const cnt=R(1,Math.max(1,maxOff));
        const baseBr=R(300,1000);
        p.cops={n:cnt,br:Math.round(baseBr*curLaw.bm),law:curLaw};
        if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"cop"};
        return{...prev,...p,phase:"cop"};
      }
      // Mugging
      if(C(0.07)){const s=Math.round(p.cash*R(8,28)/100);p.cash-=s;p.evs=[...p.evs,{d:p.day,m:`Mugged! Lost ${$(s)}!`,t:"danger"}];shake();}
      // Offers
      p.offer=null;
      // Consignment offer (highest priority)
      const conOff = genConsignmentOffer(p, p.loc);
      if(conOff) {
        const cd = DRUGS.find(d=>d.id===conOff.did);
        const cg = GANGS.find(g=>g.id===conOff.gid);
        p.offer = {type:"consignment", did:conOff.did, qty:conOff.qty, owed:conOff.owed, origin:p.loc, gid:conOff.gid};
      } else if(!p.gun&&C(0.14)) p.offer={type:"gun",price:R(300,600)};
      else if(C(0.12)){const sp=R(20,35);p.offer={type:"coat",price:R(150,400),sp};}
      else if(!p.rat.hired&&C(0.08)&&p.rep>=10) p.offer={type:"rat",rat:mkRat()};
      else if(p.rep>=25&&C(0.1)&&!p.terr[p.loc]){
        const lg2=GANGS.find(g=>g.turf.includes(p.loc));
        if(!lg2||(p.gang[lg2.id]??0)>5) p.offer={type:"terr",lid:p.loc,cost:R(3000,12000),tr:R(100,500)};
      }
      // Milestones
      const{miles,newMile}=chkMiles(p);p.miles=miles;p.newMile=newMile;
      // End?
      if(p.day>DAYS){
        if(prev.mode==="2p"){const k=prev.turn===1?"p1":"p2";const u={...prev,[k]:p};const ok=prev.turn===1?"p2":"p1";if(u[ok].day>DAYS)return{...u,phase:"end"};return{...u,turn:prev.turn===1?2:1,phase:"playing"};}
        return{...prev,...p,phase:p.cash+p.bank>=p.debt?"win":"end"};
      }
      if(p.hp<=0 || p.fingers<=0){
        if(p.fingers<=0) p.evs=[...p.evs,{d:p.day,m:"You have nothing left.",t:"danger"}];
        if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"end"};return{...prev,...p,phase:"end"};
      }
      if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"playing"};
      return{...prev,...p,phase:"playing"};
    });
  }

  // ── TRADE ────────────────────────────────────────────────
  function doTrade() {
    const{tr,tq}=ui; if(!tr)return;
    const drug=DRUGS.find(d=>d.id===tr.did);
    const price=cp.prices[drug.id]; if(!price)return;
    sGs(prev=>{
      const p=prev.mode==="2p"?{...prev[prev.turn===1?"p1":"p2"]}:{...prev};
      const u=Object.values(p.inv).reduce((a,b)=>a+b,0);
      const effSpc = p.spc - (10 - p.fingers) * 5;
      const sp = effSpc - u;
      if(tr.type==="buy"){
        const mx=Math.min(Math.floor(p.cash/price),sp);
        const q=Math.min(tq==="max"?99999:parseInt(tq)||0,mx);
        if(q<=0)return prev;
        p.cash-=q*price;
        p.inv={...p.inv,[drug.id]:(p.inv[drug.id]||0)+q};
        const pq=prev.mode==="2p"?(prev[prev.turn===1?"p1":"p2"].inv[drug.id]||0):(prev.inv[drug.id]||0);
        const pa=prev.mode==="2p"?(prev[prev.turn===1?"p1":"p2"].avg[drug.id]||0):(prev.avg[drug.id]||0);
        p.avg={...p.avg,[drug.id]:(pa*pq+price*q)/(pq+q)};
        p.heat=Math.min(HEAT_CAP,p.heat+Math.min(8,Math.ceil(q*price/25000)));p.trades++;SFX.buy();
      } else {
        const own=p.inv[drug.id]||0;
        const q=Math.min(tq==="max"?99999:parseInt(tq)||0,own);
        if(q<=0)return prev;
        const fingerPen = (10 - p.fingers) * 0.03;
        const rev = Math.round(q * price * (1 - fingerPen));const ab=p.avg[drug.id]||price;
        const pnl=rev-q*ab;
        p.cash+=rev;p.inv={...p.inv,[drug.id]:own-q};
        if(p.inv[drug.id]<=0){delete p.inv[drug.id];const na={...p.avg};delete na[drug.id];p.avg=na;}
        p.profit+=pnl;if(pnl>p.best)p.best=pnl;
        // Track for near-miss (sold-too-early dopamine pain)
        p.recentSold=[...(p.recentSold||[]),{id:drug.id,price,qty:q}];
        if(pnl>0){
          p.strk++;if(p.strk>p.mstrk)p.mstrk=p.strk;
          p.combo=Math.min(5,1+p.strk*0.15);p.rep+=Math.ceil(pnl/4000);
          const g=GANGS.find(x=>x.turf.includes(p.loc));
          if(g)p.gang={...p.gang,[g.id]:p.gang[g.id]+1};
          if(pnl>5000)SFX.big();else SFX.sell();
        }else{p.strk=0;p.combo=1;SFX.miss();}
        p.trades++;p.heat=Math.min(HEAT_CAP,p.heat+Math.min(6,Math.ceil(rev/30000)));
      }
      const{miles,newMile}=chkMiles(p);p.miles=miles;p.newMile=newMile;
      if(newMile)SFX.lvl();
      if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p};
      return{...prev,...p};
    });
    sUi(u=>({...u,tr:null,tq:""}));
  }

  // ── COP ──────────────────────────────────────────────────
  function copAct(a) {
    SFX.bad();
    sGs(prev=>{
      const p=prev.mode==="2p"?{...prev[prev.turn===1?"p1":"p2"]}:{...prev};
      // Bounty hunter
      if(p.cops && p.cops.bh) {
        const bhA = a==="bribe" ? "pay" : a;
        bountyHunterAct(p, bhA);
        p.cops = null;
        if(p.hp<=0){if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"end"};return{...prev,...p,phase:"end"};}
        if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"playing"};
        return{...prev,...p,phase:"playing"};
      }
      const c=p.cops;
      const claw=c.law||{bh:"brutal",bm:1,fn:"POLICE",fe:"🚔"};
      if(a==="run"){
        let runChance=p.gun?0.55:0.38;
        if(claw.bh==="corrupt")runChance+=0.05;
        if(claw.bh==="methodical")runChance-=0.10;
        if(C(runChance)){
          p.evs=[...p.evs,{d:p.day,m:`Escaped the ${claw.fn}! Heart pounding!`,t:"info"}];p.close++;p.heat=Math.min(HEAT_CAP,p.heat+3);
        }else{
          const l=Math.round(p.cash*0.2);p.cash-=l;
          const dk=Object.keys(p.inv);if(dk.length){const k=dk[R(0,dk.length-1)];const confPct=claw.bh==="methodical"?R(30,70):R(30,60);const lq=Math.ceil(p.inv[k]*confPct/100);p.inv={...p.inv,[k]:p.inv[k]-lq};if(p.inv[k]<=0)delete p.inv[k];}
          p.hp-=R(5,18);p.heat=Math.min(HEAT_CAP,p.heat+5);p.close++;shake();
          p.evs=[...p.evs,{d:p.day,m:`${claw.fn} caught you! Lost ${$(l)} and product.`,t:"danger"}];
        }
      }else if(a==="fight"){
        let kl=0,dm=0;
        const killChance=p.gun?0.45:0.15;
        const dmMin=p.gun?5:12;const dmMax=p.gun?15:30;
        if(claw.bh==="corrupt"){for(let i=0;i<c.n;i++){if(C(killChance))kl++;else dm+=Math.max(1,R(dmMin,dmMax)-3);}}
        else{for(let i=0;i<c.n;i++){if(C(killChance))kl++;else dm+=R(dmMin,dmMax);}}
        p.hp-=dm;p.heat=Math.min(HEAT_CAP,p.heat+Math.min(15,5+kl*3));
        let repGain=kl*8;
        if(claw.bh==="brutal")repGain=kl*10;
        p.rep+=repGain;p.close++;shake();
        p.evs=[...p.evs,{d:p.day,m:`Shootout with ${claw.fn}! ${kl}/${c.n} down.${dm>20?" Hurt bad.":""}`,t:"danger"}];
      }else{
        const amt=c.br*c.n;
        if(p.cash>=amt){
          p.cash-=amt;
          const heatReduce=claw.bh==="methodical"?15:12;
          p.heat=Math.max(0,p.heat-heatReduce);
          p.evs=[...p.evs,{d:p.day,m:`Bribed ${claw.fn} for ${$(amt)}. Heat -${heatReduce}.`,t:"info"}];
        }
        else{p.evs=[...p.evs,{d:p.day,m:`Can't afford ${claw.fn} bribe!`,t:"danger"}];return prev;}
      }
      p.cops=null;
      if(p.hp<=0){if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"end"};return{...prev,...p,phase:"end"};}
      if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p,phase:"playing"};
      return{...prev,...p,phase:"playing"};
    });
  }

  // ── OFFER ────────────────────────────────────────────────
  function offer(ok) {
    sGs(prev=>{
      const p=prev.mode==="2p"?{...prev[prev.turn===1?"p1":"p2"]}:{...prev};
      if(!ok){p.offer=null;if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p};return{...prev,...p};}
      const o=p.offer;
      if(o.type==="gun"&&p.cash>=o.price){p.cash-=o.price;p.gun=true;SFX.buy();}
      else if(o.type==="coat"&&p.cash>=o.price){p.cash-=o.price;p.spc+=o.sp;SFX.buy();}
      else if(o.type==="rat"){p.cash-=o.rat.cost;p.rat={...o.rat,hired:true,pendingTip:null};SFX.buy();p.evs=[...p.evs,{d:p.day,m:`🐀 Hired ${o.rat.name}.`,t:"info"}];}
      else if(o.type==="terr"&&p.cash>=o.cost){p.cash-=o.cost;p.terr={...p.terr,[o.lid]:{tr:o.tr,d:p.day}};p.rep+=15;SFX.lvl();p.evs=[...p.evs,{d:p.day,m:`🏴 Claimed ${LOCS.find(l=>l.id===o.lid)?.name}! +${$(o.tr)}/day`,t:"info"}];}
      else if(o.type==="consignment"){
        const cd=DRUGS.find(d=>d.id===o.did);
        const cg=GANGS.find(g=>g.id===o.gid);
        p.inv={...p.inv,[o.did]:(p.inv[o.did]||0)+o.qty};
        p.consignment={gid:o.gid,did:o.did,qty:o.qty,owed:o.owed,paid:0,tl:CONSIGNMENT_TURNS,origin:o.origin,accepted:true};
        p.gang={...p.gang,[o.gid]:(p.gang[o.gid]??0)+3};
        SFX.buy();
        p.evs=[...p.evs,{d:p.day,m:`☠️ Took ${o.qty} ${cd.e} ${cd.name} from ${cg.name}. Owe ${$(o.owed)} in ${CONSIGNMENT_TURNS} turns.`,t:"consignment"}];
      }
      p.offer=null;const{miles}=chkMiles(p);p.miles=miles;
      if(prev.mode==="2p")return{...prev,[prev.turn===1?"p1":"p2"]:p};
      return{...prev,...p};
    });
  }

  function bk(t,a){scp(p=>{const v=a==="all"?(t==="dep"?p.cash:p.bank):Math.max(0,parseInt(a)||0);if(t==="dep"){const x=Math.min(v,p.cash);return{cash:p.cash-x,bank:p.bank+x};}else{const x=Math.min(v,p.bank);return{cash:p.cash+x,bank:p.bank-x};}});}
  function sk(a){scp(p=>{const v=a==="all"?Math.min(p.cash,p.debt):Math.min(parseInt(a)||0,p.cash,p.debt);const r={cash:p.cash-v,debt:p.debt-v};const{miles}=chkMiles({...p,...r});return{...r,miles};});}
  function skBorrow(a){scp(p=>({cash:p.cash+Math.max(0,a),debt:p.debt+Math.max(0,a)}));}
  function payRat(){
    scp(p=>{
      if(p.cash<150||!p.rat.hired||!p.rat.alive)return{};
      const nr={...p.rat,loy:Math.min(100,p.rat.loy+R(5,12))};
      // 30% + intel*10% chance to generate immediate tip
      if(!nr.pendingTip&&C(0.30+nr.intel*0.10)){
        const tip=genRatTip(nr,getRegion(p.loc).id);
        if(tip){
          nr.tips++;nr.pendingTip=tip;
          const td=DRUGS.find(x=>x.id===tip.did);
          return{cash:p.cash-150,rat:nr,evs:[...p.evs,{d:p.day,m:`🐀 ${nr.name}: "${td.name} gonna ${tip.dir==="spike"?"explode":"crash"} soon..." ${"⭐".repeat(tip.conf)}`,t:"tip"}]};
        }
      }
      return{cash:p.cash-150,rat:nr};
    });
    notify("Loyalty boosted.","info");
  }

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  // TITLE
  if(gs.phase==="title"){
    return(
      <div style={Z.root}><style>{CSS}</style>
        <div style={Z.ctr}>
          <div style={{fontSize:9,letterSpacing:8,color:"#334155",textTransform:"uppercase",marginBottom:12}}>Empire Edition</div>
          <h1 style={{fontSize:56,fontWeight:900,margin:0,background:"linear-gradient(135deg, #ef4444, #f59e0b, #ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-3,lineHeight:1}}>DRUG<br/>WARS</h1>
          <div style={{width:80,height:1,background:"linear-gradient(90deg,transparent,#ef4444,transparent)",margin:"16px auto"}}/>
          <p style={{color:"#475569",fontSize:12,lineHeight:1.8,maxWidth:380,margin:"0 auto 20px"}}>
            You owe <b style={{color:"#ef4444"}}>{$(DEBT0)}</b> to the shark. <b style={{color:"#22c55e"}}>{$(CASH0)}</b> in your pocket.
            <b style={{color:"#f59e0b"}}> 30 days</b> to build an empire, go international, control territory, and survive.
          </p>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
            {["🌍 International","🏴 Territory","🐀 Informants","⚔️ Gangs","📈 Near Misses","👑 Ranks"].map((t,i)=>
              <span key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:16,padding:"3px 8px",fontSize:9,color:"#475569"}}>{t}</span>
            )}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>sGs({...init("solo"),phase:"playing"})} style={Z.pri}>SOLO</button>
            <button onClick={()=>sGs({...init("2p"),phase:"playing"})} style={{...Z.pri,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",boxShadow:"0 4px 20px rgba(59,130,246,0.3)"}}>2 PLAYER</button>
          </div>
          <div style={{fontSize:8,color:"#1e293b",marginTop:16}}>Based on John E. Dell's 1984 classic</div>
        </div>
      </div>
    );
  }

  // END/WIN
  if(gs.phase==="end"||gs.phase==="win"){
    const w=gs.phase==="win";
    const fn=cp.cash+cp.bank-cp.debt;
    const fr=getRank(cp.rep);
    return(
      <div style={Z.root}><style>{CSS}</style>
        <div style={Z.ctr}>
          <div style={{fontSize:56,marginBottom:4}}>{w?fr.e:"💀"}</div>
          <h1 style={{fontSize:30,fontWeight:900,color:w?"#22c55e":"#ef4444",margin:"0 0 4px"}}>{w?"SURVIVED":cp.hp<=0?"DEAD":"GAME OVER"}</h1>
          {gs.mode==="2p"?(
            <div style={{margin:"8px 0 16px"}}>
              {[gs.p1,gs.p2].map((px,i)=>{const n2=px.cash+px.bank-px.debt;return(
                <div key={i} style={{fontSize:18,fontWeight:800,color:i===0?"#ef4444":"#3b82f6",margin:"4px 0"}}>P{i+1}: {$(n2)} {getRank(px.rep).e}</div>
              );})}
            </div>
          ):(
            <><div style={{fontSize:13,color:"#f59e0b",fontWeight:800}}>{fr.n}</div>
            <div style={{fontSize:26,fontWeight:900,color:"#f8fafc",margin:"6px 0 12px"}}>Net: {$(fn)}</div></>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,maxWidth:360,margin:"0 auto 16px"}}>
            {[{l:"Trades",v:cp.trades},{l:"Best",v:$(cp.best),c:"#22c55e"},{l:"Streak",v:`${cp.mstrk}x`},{l:"Territories",v:Object.keys(cp.terr).length},{l:"Close Calls",v:cp.close},{l:"Rep",v:cp.rep},{l:"HP",v:`${cp.hp}%`},{l:"Milestones",v:cp.miles?.length||0},{l:"Days",v:Math.min(cp.day-1,30)}].map((s,i)=>
              <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"6px",textAlign:"center"}}>
                <div style={{fontSize:7,color:"#334155",textTransform:"uppercase",letterSpacing:1}}>{s.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:s.c||"#cbd5e1"}}>{s.v}</div>
              </div>
            )}
          </div>
          {/* Milestone trophies */}
          <div style={{display:"flex",gap:3,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
            {MILES.map(m=><span key={m.id} style={{fontSize:18,opacity:cp.miles?.includes(m.id)?1:0.12,filter:cp.miles?.includes(m.id)?"none":"grayscale(1)"}}>{m.e}</span>)}
          </div>
          <button onClick={()=>sGs({...init(),phase:"title"})} style={Z.pri}>PLAY AGAIN</button>
        </div>
      </div>
    );
  }

  // COPS
  if(gs.phase==="cop"){
    const cops2=cp.cops;
    // Bounty hunter mode
    if(cops2.bh) {
      const con = cp.consignment;
      const bGang = GANGS.find(g=>g.id===con.gid);
      const bGn = bGang?.name || 'The gang';
      const remaining = con.owed - con.paid;
      const payAmt = Math.round(remaining * 1.5);
      return(
        <div style={Z.root}><style>{CSS}</style>
          <div className={ui.shk?"shk":""} style={{...Z.ctr,background:"radial-gradient(circle at 50% 20%,rgba(234,179,8,0.08),transparent)"}}>
            <div style={{fontSize:56}}>🤝</div>
            <h2 style={{fontSize:24,fontWeight:900,color:"#f59e0b",margin:"8px 0"}}>BOUNTY HUNTER!</h2>
            <p style={{color:"#fde68a",fontSize:13,margin:"0 0 2px"}}>{bGn} sent someone to collect.</p>
            <p style={{color:"#64748b",fontSize:10,fontStyle:"italic",margin:"0 0 2px"}}>You owe {$(remaining)}. They want {$(payAmt)}.</p>
            <p style={{color:"#475569",fontSize:11,marginBottom:16}}>Cash: {$(cp.cash)} • HP: {cp.hp}</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:240,margin:"0 auto"}}>
              <button onClick={()=>copAct("bribe")} style={{...Z.actBtn,background:"linear-gradient(135deg,#f59e0b,#b45309)"}}>💰 PAY UP <small style={{opacity:0.7}}>{$(payAmt)}</small></button>
              <button onClick={()=>copAct("fight")} style={{...Z.actBtn,background:"linear-gradient(135deg,#ef4444,#b91c1c)"}}>{cp.gun?"🔫":"👊"} FIGHT <small style={{opacity:0.7}}>{cp.gun?"35%":"10%"} win</small></button>
              <button onClick={()=>copAct("run")} style={{...Z.actBtn,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)"}}>🏃 RUN <small style={{opacity:0.7}}>35%</small></button>
            </div>
          </div>
        </div>
      );
    }
    // Normal cop encounter continues...
    const bribeCost=cops2.br*cops2.n;
    const claw=cops2.law||{bh:"brutal",bm:1,fn:"POLICE",fe:"🚔"};
    let runPct=cp.gun?55:38;
    if(claw.bh==="corrupt")runPct+=5;
    if(claw.bh==="methodical")runPct-=10;
    const heatReduce=claw.bh==="methodical"?15:12;
    const flavorText=claw.bh==="corrupt"?"Might look the other way...":claw.bh==="methodical"?"Thorough and relentless.":"Shoot first, ask later.";
    return(
      <div style={Z.root}><style>{CSS}</style>
        <div className={ui.shk?"shk":""} style={{...Z.ctr,background:"radial-gradient(circle at 50% 20%,rgba(239,68,68,0.08),transparent)"}}>
          <div style={{fontSize:56,animation:"pulse 0.7s infinite"}}>🚨</div>
          <h2 style={{fontSize:24,fontWeight:900,color:"#ef4444",margin:"8px 0"}}>{claw.fe} {claw.fn.toUpperCase()}!</h2>
          <p style={{color:"#fca5a5",fontSize:13,margin:"0 0 2px"}}>{cops2.n} officer{cops2.n>1?"s":""} closing in!</p>
          <p style={{color:"#64748b",fontSize:10,fontStyle:"italic",margin:"0 0 2px"}}>{flavorText}</p>
          <p style={{color:"#475569",fontSize:11,marginBottom:16}}>Carrying {used} units • Heat {cp.heat}%</p>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:240,margin:"0 auto"}}>
            <button onClick={()=>copAct("run")} style={{...Z.actBtn,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)"}}>🏃 RUN <small style={{opacity:0.7}}>{runPct}%</small></button>
            <button onClick={()=>copAct("fight")} style={{...Z.actBtn,background:"linear-gradient(135deg,#ef4444,#b91c1c)"}}>{cp.gun?"🔫":"👊"} FIGHT <small style={{opacity:0.7}}>{cp.gun?"armed":"bare fists"}{claw.bh==="brutal"?" (tough)":claw.bh==="corrupt"?" (weak)":""}</small></button>
            <button onClick={()=>copAct("bribe")} disabled={cp.cash < bribeCost} style={{...Z.actBtn,background:cp.cash>=bribeCost?"linear-gradient(135deg,#f59e0b,#b45309)":"#1e293b",opacity:cp.cash>=bribeCost?1:0.4}}>💰 BRIBE <small style={{opacity:0.7}}>{$(bribeCost)} • heat -{heatReduce}</small></button>
          </div>
        </div>
      </div>
    );
  }

  // TRADE MODAL
  if(ui.tr){
    const drug=DRUGS.find(d=>d.id===ui.tr.did);const price=cp.prices[drug.id];
    const own=cp.inv[drug.id]||0;const ib=ui.tr.type==="buy";
    const mb=price?Math.min(Math.floor(cp.cash/price),free):0;const mq=ib?mb:own;
    const q=ui.tq==="max"?mq:Math.min(parseInt(ui.tq)||0,mq);
    const tot=q*(price||0);const ab=cp.avg[drug.id];
    const pnl=!ib&&ab?q*(price-ab):0;const pp=!ib&&ab?((price-ab)/ab*100):0;
    return(
      <div style={Z.root}><style>{CSS}</style>
        <div style={Z.ctr}>
          <div style={{fontSize:36}}>{drug.e}</div>
          <h3 style={{color:"#f8fafc",fontSize:20,fontWeight:900,margin:"4px 0 2px"}}>{ib?"BUY":"SELL"} {drug.name}</h3>
          <div style={{color:"#94a3b8",fontSize:13}}>{$(price)} each</div>
          {!ib&&ab&&<div style={{fontSize:22,fontWeight:900,color:pp>0?"#22c55e":"#ef4444",margin:"4px 0"}}>{pp>0?"+":""}{pp.toFixed(0)}% {pp>80?"🔥":pp>150?"💥":""}</div>}
          <div style={{color:"#475569",fontSize:11,marginBottom:10}}>{ib?`Max ${mb}`:`Own ${own}`} {cp.strk>1&&!ib?`• ${cp.strk}x streak`:""}</div>
          <input type="text" value={ui.tq} autoFocus onChange={e=>sUi(u=>({...u,tq:e.target.value}))} placeholder="Qty..." style={Z.inp}/>
          <div style={{display:"flex",gap:4,margin:"8px 0",justifyContent:"center",flexWrap:"wrap"}}>
            {[1,5,10,25,50].filter(n=>n<=mq).map(n=><button key={n} onClick={()=>sUi(u=>({...u,tq:String(n)}))} style={Z.qb}>{n}</button>)}
            {mq>2&&<button onClick={()=>sUi(u=>({...u,tq:String(Math.floor(mq/2))}))} style={Z.qb}>½</button>}
            <button onClick={()=>sUi(u=>({...u,tq:"max"}))} style={{...Z.qb,background:"#22c55e",color:"#000",fontWeight:800}}>MAX</button>
          </div>
          {q>0&&<div style={{fontSize:12,color:"#94a3b8",margin:"4px 0 10px"}}>Total: <b style={{color:"#f8fafc"}}>{$(tot)}</b>{!ib&&pnl!==0&&<span style={{color:pnl>0?"#22c55e":"#ef4444",fontWeight:700,marginLeft:8}}>({pnl>0?"+":""}{$(pnl)})</span>}</div>}
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={()=>sUi(u=>({...u,tr:null,tq:""}))} style={Z.ghost}>Cancel</button>
            <button onClick={doTrade} disabled={q<=0} style={{...Z.pri,padding:"10px 24px",fontSize:13,opacity:q>0?1:0.3}}>{ib?"BUY":"SELL"} {q>0?q:""}</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════ MAIN GAME ════════
  return(
    <div style={Z.root}><style>{CSS}</style>
      {/* Notifs */}
      <div style={{position:"fixed",top:6,right:6,zIndex:999,display:"flex",flexDirection:"column",gap:4,pointerEvents:"none"}}>
        {ui.nots.map(n=><div key={n.k} style={{background:n.t==="profit"?"#16a34a":n.t==="danger"?"#dc2626":n.t==="tip"?"#7c3aed":"#1e40af",color:"#fff",padding:"6px 12px",borderRadius:5,fontSize:11,fontWeight:600,animation:"si .2s ease",boxShadow:"0 4px 16px rgba(0,0,0,.5)",maxWidth:200}}>{n.m}</div>)}
      </div>
      <div className={ui.shk?"shk":""} style={Z.game}>
        {/* 2P indicator */}
        {gs.mode==="2p"&&<div style={{display:"flex",justifyContent:"center",gap:6,padding:"4px",background:"rgba(255,255,255,0.02)"}}>
          <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:700,background:gs.turn===1?"#ef444422":"transparent",color:gs.turn===1?"#ef4444":"#334155"}}>P1</span>
          <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:700,background:gs.turn===2?"#3b82f622":"transparent",color:gs.turn===2?"#3b82f6":"#334155"}}>P2</span>
        </div>}
        {/* HEADER */}
        <div style={Z.hdr}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:8,color:"#334155",letterSpacing:2}}>DAY {cp.day}/{DAYS}</div>
              <div style={{fontSize:22,fontWeight:900,color:"#f8fafc",lineHeight:1}}>{$(cp.cash)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:8,color:"#475569"}}>{rank.e} {rank.n.toUpperCase()}</div>
              <div style={{fontSize:14,fontWeight:800,color:nw>0?"#22c55e":"#ef4444"}}>{$(nw)}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:3,margin:"5px 0"}}>
            <MS l="DEBT" v={$(cp.debt)} c={cp.debt>0?"#ef4444":"#22c55e"}/>
            <MS l="BANK" v={$(cp.bank)} c="#3b82f6"/>
            <MS l="SPACE" v={`${free}/${cp.spc-(10-cp.fingers)*5}`} c={free<15?"#f59e0b":"#475569"}/>
            <MS l="REP" v={cp.rep} c="#a855f7"/>
          </div>
          <Bar l="🔥 HEAT" p={cp.heat} c={cp.heat<30?"#22c55e":cp.heat<60?"#f59e0b":"#ef4444"}/>
          <Bar l="❤️ HP" p={cp.hp} c={cp.hp>60?"#22c55e":cp.hp>30?"#f59e0b":"#ef4444"}/>
          {cp.strk>1&&<div style={{textAlign:"center",fontSize:10,color:"#f59e0b",fontWeight:700,margin:"2px 0",animation:"pulse 1.5s infinite"}}>🔥 {cp.strk}x STREAK {cp.combo>1.5?"— rep bonus!":""}</div>}
          {cp.newMile&&<div style={{textAlign:"center",fontSize:11,color:"#f59e0b",fontWeight:800,animation:"pulse 1s 3"}}>🏆 MILESTONE: {cp.newMile.e} {cp.newMile.m}!</div>}
          <div style={{height:3,background:"#0f172a",borderRadius:2,overflow:"hidden",marginTop:3}}>
            <div style={{height:"100%",width:`${cp.day/DAYS*100}%`,background:cp.day>25?"linear-gradient(90deg,#f59e0b,#ef4444)":"linear-gradient(90deg,#1e40af,#3b82f6)",transition:"width .5s"}}/>
          </div>
        </div>
        {/* LOCATION */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:loc.c,boxShadow:`0 0 6px ${loc.c}44`}}/>
          <span style={{fontSize:12,fontWeight:800,color:"#e2e8f0"}}>{getRegion(cp.loc)?.id!=="nyc"?`${getRegion(cp.loc).em} ${getRegion(cp.loc).name} > `:""}{loc.e} {loc.name}</span>
          {cp.terr[cp.loc]&&<span style={{fontSize:8,color:"#22c55e"}}>🏴 +{$(cp.terr[cp.loc].tr)}/d</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:3}}>
            {cp.gun&&<span>🔫</span>}{cp.rat.hired&&cp.rat.alive&&<span title={`${cp.rat.name} ${cp.rat.loy}%`}>🐀</span>}
            {Object.keys(cp.terr).length>0&&<span style={{fontSize:10}}>{Object.keys(cp.terr).length}🏴</span>}
            {cp.fingers<10&&<span style={{fontSize:9,fontWeight:700,color:cp.fingers<=4?"#ef4444":cp.fingers<=6?"#f59e0b":"#fdba74"}}>✋ {cp.fingers}/10</span>}
            <button onClick={()=>sUi(u=>({...u,sub:u.sub==="help"?null:"help"}))} style={{width:16,height:16,borderRadius:8,background:"rgba(255,255,255,0.06)",border:"none",fontSize:9,fontWeight:800,color:"#334155",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",padding:0}}>?</button>
          </div>
        </div>
        {cp.consignment&&(()=>{const con=cp.consignment;const cg=GANGS.find(g=>g.id===con.gid);const cl=LOCS.find(l=>l.id===con.origin);return<div style={{margin:"0 8px 3px",padding:"5px 8px",borderRadius:5,background:con.tl<=1?"rgba(239,68,68,0.08)":"rgba(234,179,8,0.06)",border:`1px solid ${con.tl<=1?"rgba(239,68,68,0.2)":"rgba(234,179,8,0.15)"}`,fontSize:10,fontWeight:600,color:con.tl<=1?"#ef4444":"#f59e0b"}}>🤝 Owe {cg?.name} {$(con.owed-con.paid)} • ⏰ {con.tl>0?`${con.tl} turn${con.tl!==1?"s":""}`:"OVERDUE!"} • Return to {cl?.name||"???"}</div>;})()}
        {/* Help panel */}
        {ui.sub==="help"&&<div style={{margin:"0 8px 4px",padding:8,borderRadius:5,background:"rgba(30,41,59,0.95)",border:"1px solid rgba(255,255,255,0.08)",maxHeight:260,overflow:"auto"}}>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:2,marginBottom:2}}>HOW TO PLAY</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Buy low, sell high. Travel between cities to find better prices. Pay off your debt before day 30.</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>BANK & SHARK</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Visit a capital city (marked 🏦🦈) to deposit cash at 5%/day interest, or borrow from the shark at 10%/day. Every region's capital has both.</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>HEAT & COPS</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Buying and selling raises heat (max 100). High heat = more cop encounters (max 65% chance). Each region has its own law force with different behaviors: corrupt (easier to bribe/run), brutal (tougher fights), or methodical (thorough searches, hard to escape).</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>CUSTOMS</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Flying between regions risks customs inspection. They may seize contraband and fine you. Risk depends on cargo amount, heat, and destination strictness. Some drugs are flagged as contraband per region.</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>REPUTATION</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Earn rep by making profitable trades. Higher rep unlocks international regions and new ranks:</div>
          {RANKS.map(r=><div key={r.n} style={{fontSize:8,color:"#475569",paddingLeft:6,lineHeight:1.6}}>{r.e} {r.n} — {r.r} rep</div>)}
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>INTERNATIONAL TRAVEL</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Fly to other regions for cheaper drugs. Each has 6 cities, a local gang, and unique price discounts. Return to NYC costs half price.</div>
          {REGIONS.filter(r=>r.id!=="nyc").map(r=><div key={r.id} style={{fontSize:8,color:"#475569",paddingLeft:6,lineHeight:1.6}}>{r.em} {r.name} — {r.rep} rep, ${r.fly.toLocaleString()} flight{"\n   "}{Object.entries(r.pm).map(([d,m])=>`${DRUGS.find(x=>x.id===d)?.name} -${Math.round((1-m)*100)}%`).join(", ")}</div>)}
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>CONSIGNMENT</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Gangs may offer drugs on credit (2x markup). You have 5 turns to sell and repay. Return to the gang's turf to settle. Pay 100% on time = respect. Partial = lose a finger. Late or short = worse. Don't pay? Bounty hunters come for you.</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Each lost finger: -5 inventory space, -3% sell revenue. At 6 fingers: +1 travel day. At 4: lose your gun. At 0: game over.</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>GANGS & TERRITORY</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>Some cities are gang turf. Trade there to build relations. At 25+ rep you can claim territory for daily tribute income. Bad relations = taxes.</div>
          <div style={{fontSize:8,fontWeight:800,color:"#f59e0b",letterSpacing:1,marginTop:6,marginBottom:2}}>INFORMANTS</div>
          <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.5}}>At 10+ rep you may meet a rat who gives predictive price tips. Pay them to keep loyalty up and sometimes get immediate intel — low loyalty = they flip on you. Tips show predicted drug and direction with confidence stars.</div>
          <button onClick={()=>sUi(u=>({...u,sub:null}))} style={{marginTop:6,background:"rgba(255,255,255,0.05)",border:"none",borderRadius:3,padding:"4px 0",width:"100%",fontSize:9,fontWeight:700,color:"#334155",letterSpacing:1,cursor:"pointer",fontFamily:"inherit"}}>CLOSE</button>
        </div>}
        {/* EVENT */}
        {cp.ev&&<div style={{margin:"0 8px 3px",padding:"5px 8px",borderRadius:5,background:cp.ev.t==="spike"?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)",border:`1px solid ${cp.ev.t==="spike"?"#ef444425":"#22c55e25"}`,fontSize:10,color:cp.ev.t==="spike"?"#fca5a5":"#86efac",fontWeight:600}}>{cp.ev.t==="spike"?"📈":"📉"} {cp.ev.rid?`${REGIONS.find(r=>r.id===cp.ev.rid)?.em||""} `:""}{cp.ev.m}</div>}
        {/* NEAR MISS — DOPAMINE */}
        {cp.nms.length>0&&<div style={{margin:"0 8px 3px",padding:"6px 8px",borderRadius:5,background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.15)",fontSize:10,color:"#fdba74",animation:"pulse 2s infinite"}}>
          😱 <b>{cp.nms[0].type==="sold_early"?"Sold too early!":"Near miss!"}</b> {cp.nms[0].drug.e} {cp.nms[0].drug.name} {cp.nms[0].type==="sold_early"?"jumped to":"spiked to"} {$(cp.nms[0].now)} — {cp.nms[0].type==="sold_early"?"you just sold":"you had"} {cp.nms[0].q}! Missed {$(cp.nms[0].miss)}!
        </div>}
        {/* OFFER */}
        {cp.offer&&<div style={{margin:"0 8px 3px",padding:"6px 8px",borderRadius:5,background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)"}}>
          <div style={{fontSize:11,color:"#a5b4fc",fontWeight:600,marginBottom:3}}>
            {cp.offer.type==="gun"&&`🔫 Piece for sale — ${$(cp.offer.price)}`}
            {cp.offer.type==="coat"&&`🧥 Bigger coat (+${cp.offer.sp}) — ${$(cp.offer.price)}`}
            {cp.offer.type==="rat"&&`🐀 "${cp.offer.rat.name}" wants to be your informant — ${$(cp.offer.rat.cost)} (${cp.offer.rat.pers})`}
            {cp.offer.type==="terr"&&`🏴 Take over ${LOCS.find(l=>l.id===cp.offer.lid)?.name} — ${$(cp.offer.cost)} (+${$(cp.offer.tr)}/day)`}
            {cp.offer.type==="consignment"&&`🤝 ${GANGS.find(g=>g.id===cp.offer.gid)?.name} offers ${cp.offer.qty} ${DRUGS.find(d=>d.id===cp.offer.did)?.e} ${DRUGS.find(d=>d.id===cp.offer.did)?.name} on consignment — owe ${$(cp.offer.owed)} in 5 turns`}
          </div>
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>offer(true)} disabled={cp.offer.type!=="consignment"&&cp.cash<(cp.offer.price||cp.offer.cost||cp.offer.rat?.cost||0)} style={{...Z.sm,background:"#4f46e5"}}>Accept</button>
            <button onClick={()=>offer(false)} style={{...Z.sm,background:"#1e293b"}}>Pass</button>
          </div>
        </div>}
        {/* TABS */}
        <div style={{display:"flex",margin:"3px 8px",gap:1,background:"rgba(255,255,255,0.015)",borderRadius:5,padding:1}}>
          {["market","map","intel"].map(t=><button key={t} onClick={()=>sUi(u=>({...u,tab:t,sub:null}))} style={{flex:1,background:ui.tab===t?"rgba(255,255,255,0.05)":"transparent",border:"none",borderRadius:3,padding:"5px 0",fontSize:9,fontWeight:700,color:ui.tab===t?"#cbd5e1":"#334155",cursor:"pointer",textTransform:"uppercase",letterSpacing:1,fontFamily:"inherit"}}>{t==="market"?"📊 Market":t==="map"?"🗺️ Travel":"📡 Intel"}</button>)}
        </div>

        {/* ── MARKET ── */}
        {ui.tab==="market"&&<div style={{padding:"3px 8px 6px"}}>
          {(loc?.bank||loc?.shark)&&<div style={{display:"flex",gap:4,marginBottom:4}}>
            <button onClick={()=>sUi(u=>({...u,sub:u.sub==="bk"?null:"bk"}))} style={{...Z.sm,flex:1,background:ui.sub==="bk"?"#1e40af":"rgba(59,130,246,0.08)",color:"#93c5fd"}}>🏦 Bank {cp.bank>0&&<small style={{opacity:.6}}>({$(cp.bank)})</small>}</button>
            <button onClick={()=>sUi(u=>({...u,sub:u.sub==="sk"?null:"sk"}))} style={{...Z.sm,flex:1,background:ui.sub==="sk"?"#7f1d1d":"rgba(239,68,68,0.06)",color:"#fca5a5"}}>🦈 Shark {cp.debt>0&&<small style={{opacity:.6}}>({$(cp.debt)})</small>}</button>
          </div>}
          {ui.sub==="bk"&&<div style={{padding:6,background:"rgba(59,130,246,0.04)",borderRadius:5,marginBottom:4,border:"1px solid rgba(59,130,246,0.1)"}}>
            <div style={{fontSize:9,color:"#93c5fd",marginBottom:3}}>Balance: <b>{$(cp.bank)}</b> • 5%/day interest</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}><button onClick={()=>bk("dep","all")} style={Z.sm}>Deposit All</button><button onClick={()=>bk("dep",String(Math.floor(cp.cash/2)))} style={Z.sm}>Deposit Half</button><button onClick={()=>bk("wd","all")} style={Z.sm}>Withdraw All</button>{cp.bank>0&&<button onClick={()=>bk("wd",String(Math.floor(cp.bank/2)))} style={Z.sm}>Withdraw Half</button>}</div>
          </div>}
          {ui.sub==="sk"&&<div style={{padding:6,background:"rgba(239,68,68,0.04)",borderRadius:5,marginBottom:4,border:"1px solid rgba(239,68,68,0.1)"}}>
            <div style={{fontSize:9,color:"#fca5a5",marginBottom:1}}>Debt: <b>{$(cp.debt)}</b> • 10%/day interest!</div>
            <div style={{fontSize:9,color:"#fca5a5",marginBottom:4}}>Cash: <b>{$(cp.cash)}</b></div>
            {cp.debt>0&&<><div style={{fontSize:7,color:"#334155",letterSpacing:1,marginBottom:2}}>REPAY</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:4}}><button onClick={()=>sk("all")} style={{...Z.sm,background:"#dc2626"}}>Pay All ({$(Math.min(cp.cash,cp.debt))})</button><button onClick={()=>sk(String(Math.floor(Math.min(cp.cash,cp.debt)/2)))} style={{...Z.sm,background:"#991b1b"}}>Pay Half</button><button onClick={()=>sk("1000")} style={{...Z.sm,background:"#991b1b"}}>Pay $1K</button></div></>}
            <div style={{fontSize:7,color:"#334155",letterSpacing:1,marginBottom:2}}>BORROW</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}><button onClick={()=>skBorrow(1000)} style={{...Z.sm,background:"#4c1d95"}}>+$1,000</button><button onClick={()=>skBorrow(5000)} style={{...Z.sm,background:"#4c1d95"}}>+$5,000</button><button onClick={()=>skBorrow(10000)} style={{...Z.sm,background:"#4c1d95"}}>+$10,000</button></div>
            <div style={{fontSize:7,color:"#334155",marginTop:4,fontStyle:"italic"}}>Interest compounds daily. Pay it off fast!</div>
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            {DRUGS.map(d=>{
              const pr=cp.prices[d.id],own=cp.inv[d.id]||0,ab=cp.avg[d.id];
              const pnl=pr&&ab&&own>0?((pr-ab)/ab*100):null;
              const mb=pr?Math.min(Math.floor(cp.cash/pr),free):0;
              const pp=cp.prev[d.id];const pc=pr&&pp?((pr-pp)/pp*100):null;
              return(
                <div key={d.id} style={{display:"grid",gridTemplateColumns:"24px 1fr 68px 36px 46px 46px",alignItems:"center",padding:"5px 6px",borderRadius:4,gap:3,background:pnl&&pnl>30?"rgba(34,197,94,0.03)":"rgba(255,255,255,0.01)",borderLeft:pnl&&pnl>30?"2px solid #22c55e":pnl&&pnl<-20?"2px solid #ef4444":"2px solid transparent",opacity:pr?1:.25}}>
                  <span style={{fontSize:14}}>{d.e}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0"}}>{d.name}</div>
                    {pc!==null&&<div style={{fontSize:8,color:pc>0?"#22c55e":pc<0?"#ef4444":"#334155"}}>{pc>0?"▲":"▼"}{Math.abs(pc).toFixed(0)}%</div>}
                  </div>
                  <div style={{textAlign:"right",fontSize:12,fontWeight:800,color:pr?"#f8fafc":"#1e293b"}}>{pr?$(pr):"—"}</div>
                  <div style={{textAlign:"center",fontSize:10,color:own>0?"#e2e8f0":"#1e293b"}}>{own||"—"}{pnl!==null&&own>0&&<div style={{fontSize:7,fontWeight:700,color:pnl>0?"#22c55e":"#ef4444"}}>{pnl>0?"+":""}{pnl.toFixed(0)}%</div>}</div>
                  <button disabled={!pr||mb<=0} onClick={()=>sUi(u=>({...u,tr:{type:"buy",did:d.id},tq:""}))} style={{...Z.tb,background:pr&&mb>0?"linear-gradient(135deg,#22c55e,#16a34a)":"#0f172a",color:pr&&mb>0?"#fff":"#1e293b"}}>BUY</button>
                  <button disabled={own<=0||!pr} onClick={()=>sUi(u=>({...u,tr:{type:"sell",did:d.id},tq:""}))} style={{...Z.tb,background:own>0&&pr?"linear-gradient(135deg,#f59e0b,#d97706)":"#0f172a",color:own>0&&pr?"#fff":"#1e293b"}}>SELL</button>
                </div>
              );
            })}
          </div>
          {Object.keys(cp.inv).length>0&&<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:7,color:"#334155",letterSpacing:1,marginBottom:2}}>CARRYING {used}/{effSpc}</div>
            {Object.entries(cp.inv).filter(([,q])=>q>0).map(([id,q])=>{const d=DRUGS.find(x=>x.id===id);const pr=cp.prices[id];const val=pr?q*pr:0;const ab=cp.avg[id];const pnl=pr&&ab?((pr-ab)/ab*100):null;return<div key={id} style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.02)",borderRadius:3,padding:"3px 6px",gap:4}}>
              <span style={{fontSize:12}}>{d.e}</span>
              <span style={{fontSize:10,fontWeight:600,color:"#94a3b8",flex:1}}>{d.name}</span>
              <span style={{fontSize:10,fontWeight:800,color:"#e2e8f0"}}>x{q}</span>
              {val>0&&<span style={{fontSize:9,color:"#475569",width:52,textAlign:"right"}}>{$(val)}</span>}
              {pnl!==null&&<span style={{fontSize:8,fontWeight:700,color:pnl>0?"#22c55e":pnl<0?"#ef4444":"#334155",width:32,textAlign:"right"}}>{pnl>0?"+":""}{pnl.toFixed(0)}%</span>}
            </div>;})}
          </div>}
        </div>}

        {/* ── MAP ── */}
        {ui.tab==="map"&&(()=>{const curReg=getRegion(cp.loc);const regLocs=getRegionLocs(curReg.id);const others=REGIONS.filter(r=>r.id!==curReg.id);return<div style={{padding:"4px 8px"}}>
          <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>{curReg.em} {curReg.name.toUpperCase()}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:8}}>
            {regLocs.map(l=>{const cur=l.id===cp.loc;const own=!!cp.terr[l.id];const g=GANGS.find(x=>x.turf.includes(l.id));const isCO=cp.consignment&&cp.consignment.origin===l.id;return(
              <button key={l.id} onClick={()=>travel(l.id)} disabled={cur} style={{background:cur?`${l.c}15`:own?"rgba(34,197,94,0.04)":isCO?"rgba(234,179,8,0.04)":`${l.c}06`,border:`1px solid ${cur?l.c+"35":own?"#22c55e22":isCO?(cp.consignment.tl<=0?"#ef444444":"#f59e0b44"):l.c+"12"}`,borderRadius:5,padding:"6px 3px",textAlign:"center",color:cur?l.c:"#94a3b8",fontSize:10,fontWeight:cur?800:600,cursor:cur?"default":"pointer",opacity:cur?.5:1,fontFamily:"inherit"}}>
                <div style={{fontSize:14,marginBottom:1}}>{l.e}</div>{l.name}
                {own&&<div style={{fontSize:7,color:"#22c55e"}}>🏴 Yours</div>}
                {g&&!own&&<div style={{fontSize:7,color:g.c}}>{g.e}</div>}
                {l.bank&&<div style={{fontSize:6,color:"#334155"}}>🏦🦈</div>}
                {cp.consignment&&cp.consignment.origin===l.id&&<div style={{fontSize:6,fontWeight:700,color:cp.consignment.tl<=0?"#ef4444":"#f59e0b"}}>📍 Return here</div>}
              </button>
            );})}
          </div>
          <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>✈️ FLY TO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {others.map(r=>{const isNyc=r.id==="nyc";const cost=isNyc?Math.round((curReg.fly||0)/2):r.fly;const repN=isNyc?0:r.rep;const ok=cp.rep>=repN;return(
              <button key={r.id} onClick={()=>{const tl=getRegionLocs(r.id);if(tl.length)travel(tl[0].id);}} disabled={!ok} style={{background:ok?`${r.c}06`:"rgba(255,255,255,0.01)",border:`1px solid ${ok?r.c+"18":"#ffffff06"}`,borderRadius:5,padding:"6px",textAlign:"center",color:ok?"#94a3b8":"#1e293b",fontSize:10,fontWeight:600,fontFamily:"inherit",cursor:ok?"pointer":"default",opacity:ok?1:.3}}>
                <span style={{fontSize:14}}>{r.em}</span><div>{r.name}</div>
                {!ok&&<div style={{fontSize:7,color:"#334155"}}>🔒 {repN} rep</div>}
                {ok&&<div style={{fontSize:7,color:"#475569"}}>✈️ {$(cost)} • {isNyc?(curReg.td||2):r.td}d</div>}
                {ok&&!isNyc&&Object.keys(r.pm).length>0&&<div style={{fontSize:6,color:"#334155"}}>{Object.entries(r.pm).map(([d,m])=>`${DRUGS.find(x=>x.id===d)?.e}${Math.round((1-m)*100)}%↓`).join(" ")}</div>}
                {ok&&used>0&&(()=>{
                  const cRisk=Math.round(Math.max(0.05,Math.min(0.75,r.cs+used*0.002+cp.heat*0.002-(cp.spc>SPACE0?0.05:0)))*100);
                  return <div style={{fontSize:6,fontWeight:600,color:cRisk>=50?"#ef4444":cRisk>=30?"#f59e0b":"#475569",marginTop:1}}>
                    🛃 {cRisk}% risk{r.cb.length>0&&` • ${r.cb.map(id=>DRUGS.find(d=>d.id===id)?.e||"").join("")} 2x`}
                  </div>;
                })()}
              </button>
            );})}
          </div>
          {gs.mode==="2p"&&<button onClick={()=>sGs(p=>({...p,turn:p.turn===1?2:1}))} style={{...Z.pri,width:"100%",marginTop:10,background:"linear-gradient(135deg,#6366f1,#4338ca)"}}>END TURN → P{gs.turn===1?2:1}</button>}
        </div>;})()}

        {/* ── INTEL ── */}
        {ui.tab==="intel"&&<div style={{padding:"4px 8px"}}>
          {/* Rat */}
          <div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>🐀 INFORMANT</div>
            {cp.rat.hired&&cp.rat.alive?<div style={{background:"rgba(124,58,237,0.04)",border:"1px solid rgba(124,58,237,0.12)",borderRadius:5,padding:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:700,color:"#c4b5fd"}}>{cp.rat.name}</span>
                <span style={{fontSize:9,color:cp.rat.loy>60?"#22c55e":cp.rat.loy>30?"#f59e0b":"#ef4444"}}>{cp.rat.pers} • {cp.rat.loy}%</span>
              </div>
              <Bar l="" p={cp.rat.loy} c={cp.rat.loy>60?"#7c3aed":cp.rat.loy>30?"#f59e0b":"#ef4444"}/>
              <div style={{fontSize:8,color:"#475569",margin:"2px 0"}}>Intel: {"⭐".repeat(cp.rat.intel)} • Tips: {cp.rat.tips}</div>
              {cp.rat.loy<40&&<div style={{fontSize:9,color:"#ef4444",fontWeight:600,animation:"pulse 2s infinite"}}>⚠️ Might flip!</div>}
              {cp.rat.pendingTip&&(()=>{const tip=cp.rat.pendingTip;const td=DRUGS.find(x=>x.id===tip.did);return<div style={{background:"rgba(124,58,237,0.08)",borderRadius:4,padding:5,margin:"3px 0",border:"1px solid rgba(124,58,237,0.18)"}}>
                <div style={{fontSize:9,fontWeight:700,color:"#c4b5fd",marginBottom:2}}>🐀 {cp.rat.name} says:</div>
                <div style={{fontSize:10,color:"#c4b5fd",fontStyle:"italic"}}>"{td.e} {td.name} gonna {tip.dir==="spike"?"explode":"crash"} soon..."</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:8,color:"#f59e0b",fontWeight:600}}>{"⭐".repeat(tip.conf)} {tip.conf>=3?"HIGH":tip.conf>=2?"MED":"LOW"}</span>
                  <span style={{fontSize:8,color:"#475569"}}>~{tip.tu>0?`${tip.tu} turn${tip.tu>1?"s":""}`:""}</span>
                </div>
              </div>;})()}
              <button onClick={payRat} disabled={cp.cash<150} style={{...Z.sm,background:"#6d28d9",marginTop:3}}>💰 Pay ($150){!cp.rat.pendingTip?" — may get intel":""}</button>
            </div>:cp.rat.hired?<div style={{fontSize:10,color:"#ef4444",padding:6}}>💀 {cp.rat.name} sold you out.</div>:<div style={{fontSize:10,color:"#334155",padding:6}}>No informant yet.</div>}
          </div>
          {/* Consignment */}
          {cp.consignment&&(()=>{const con=cp.consignment;const cg=GANGS.find(g=>g.id===con.gid);const cd=DRUGS.find(d=>d.id===con.did);const cl=LOCS.find(l=>l.id===con.origin);return<div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>🤝 CONSIGNMENT</div>
            <div style={{background:"rgba(234,179,8,0.04)",border:"1px solid rgba(234,179,8,0.12)",borderRadius:5,padding:6}}>
              <div style={{fontSize:10,color:"#94a3b8",padding:"1px 0"}}>Owe: {cg?.e} {cg?.name}</div>
              <div style={{fontSize:10,color:"#94a3b8",padding:"1px 0"}}>Drug: {cd?.e} {cd?.name} ({con.qty} units)</div>
              <div style={{fontSize:10,color:"#94a3b8",padding:"1px 0"}}>Debt: {$(con.owed)} ({$(con.paid)} paid)</div>
              <div style={{fontSize:10,color:con.tl<=1?"#ef4444":con.tl<=2?"#f59e0b":"#94a3b8",padding:"1px 0"}}>Deadline: {con.tl>0?`${con.tl} turn${con.tl!==1?"s":""}`:"OVERDUE!"}</div>
              <div style={{fontSize:10,color:"#94a3b8",padding:"1px 0"}}>Return to: {cl?.e} {cl?.name}</div>
            </div>
          </div>;})()}
          {/* Fingers */}
          {cp.fingers<10&&<div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>✋ FINGERS</div>
            <div style={{fontSize:9,color:cp.fingers<=4?"#ef4444":cp.fingers<=6?"#f59e0b":"#fdba74",padding:"2px 6px"}}>
              {cp.fingers}/10 remaining • -{(10-cp.fingers)*5} space • -{(10-cp.fingers)*3}% sell value{cp.fingers<=6?" • +1 travel day":""}{cp.fingers<=4?" • Can't hold a gun":""}
            </div>
          </div>}
          {/* Territories */}
          <div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>🏴 TERRITORIES</div>
            {Object.keys(cp.terr).length>0?<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {Object.entries(cp.terr).map(([id,d])=>{const l=LOCS.find(x=>x.id===id);return<div key={id} style={{display:"flex",justifyContent:"space-between",background:"rgba(34,197,94,0.03)",borderRadius:3,padding:"3px 6px",fontSize:10}}>
                <span style={{color:"#86efac"}}>{l?.e} {l?.name}</span><span style={{color:"#22c55e",fontWeight:700}}>+{$(d.tr)}/d</span></div>;})}
              <div style={{fontSize:9,color:"#22c55e",fontWeight:600}}>Total: {$(cp.trib)}/day</div>
            </div>:<div style={{fontSize:10,color:"#334155"}}>None yet. Build rep.</div>}
          </div>
          {/* Gangs */}
          <div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>⚔️ GANGS</div>
            {GANGS.map(g=><div key={g.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
              <span style={{fontSize:12}}>{g.e}</span>
              <span style={{fontSize:10,color:g.c,flex:1}}>{g.name}</span>
              <span style={{fontSize:9,color:(cp.gang[g.id]??0)>10?"#22c55e":(cp.gang[g.id]??0)<-10?"#ef4444":"#475569",fontWeight:600}}>{(cp.gang[g.id]??0)>10?"Allied":(cp.gang[g.id]??0)<-10?"Hostile":"Neutral"}</span>
            </div>)}
          </div>
          {/* Milestones */}
          <div style={{marginBottom:6}}>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>🏆 MILESTONES</div>
            <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
              {MILES.map(m=><span key={m.id} style={{fontSize:16,opacity:cp.miles?.includes(m.id)?1:.1,filter:cp.miles?.includes(m.id)?"none":"grayscale(1)",transition:"all .3s"}} title={m.m}>{m.e}</span>)}
            </div>
          </div>
          {/* Log */}
          <div>
            <div style={{fontSize:8,color:"#334155",letterSpacing:2,marginBottom:3}}>📜 LOG</div>
            <div style={{maxHeight:120,overflow:"auto"}}>
              {[...cp.evs].reverse().slice(0,10).map((e,i)=><div key={i} style={{fontSize:9,padding:"1px 0",color:e.t==="danger"?"#fca5a5":e.t==="spike"?"#f9a8d4":e.t==="crash"?"#86efac":e.t==="tip"?"#c4b5fd":e.t==="customs"?"#fdba74":e.t==="consignment"?"#fde68a":"#475569",opacity:1-i*.06}}>
                <span style={{color:"#1e293b"}}>D{e.d}</span> {e.m}</div>)}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}

// ── SMALL COMPONENTS ───────────────────────────────────────
function MS({l,v,c}){return<div style={{background:"rgba(255,255,255,0.02)",borderRadius:3,padding:"3px 4px",textAlign:"center"}}><div style={{fontSize:6,color:"#334155",textTransform:"uppercase",letterSpacing:1}}>{l}</div><div style={{fontSize:11,fontWeight:800,color:c||"#cbd5e1"}}>{v}</div></div>;}
function Bar({l,p,c}){const pct=Math.min(Math.max(p,0),100);return<div style={{marginBottom:2}}>{l&&<div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#334155",marginBottom:1}}><span>{l}</span><span>{pct}%</span></div>}<div style={{height:4,background:"#0f172a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:2,transition:"width .4s",boxShadow:pct>75?`0 0 6px ${c}`:"none"}}/></div></div>;}

// ── STYLES ─────────────────────────────────────────────────
const Z = {
  root:{minHeight:"100vh",background:"#060a12",color:"#e2e8f0",fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace",display:"flex",justifyContent:"center",padding:0},
  ctr:{textAlign:"center",padding:"48px 20px",maxWidth:440,margin:"0 auto"},
  game:{width:"100%",maxWidth:480,margin:"0 auto",paddingBottom:16},
  hdr:{padding:"8px 12px 6px",background:"linear-gradient(180deg,rgba(255,255,255,0.02),transparent)",borderBottom:"1px solid rgba(255,255,255,0.03)"},
  pri:{background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",border:"none",borderRadius:6,padding:"12px 32px",fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:1,fontFamily:"inherit",boxShadow:"0 4px 20px rgba(239,68,68,0.25)",transition:"all .15s"},
  ghost:{background:"#111827",color:"#64748b",border:"1px solid #1e293b",borderRadius:6,padding:"10px 18px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  actBtn:{color:"#fff",border:"none",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6},
  sm:{background:"#1e293b",color:"#cbd5e1",border:"none",borderRadius:3,padding:"4px 8px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  tb:{border:"none",borderRadius:3,padding:"4px 0",fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",transition:"all .1s"},
  qb:{background:"#111827",color:"#64748b",border:"1px solid #1e293b",borderRadius:3,padding:"4px 8px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  inp:{background:"#0a0e17",border:"1px solid #1e293b",borderRadius:5,padding:"8px 12px",fontSize:15,color:"#f8fafc",fontFamily:"inherit",textAlign:"center",width:"100%",maxWidth:180,outline:"none",boxSizing:"border-box"},
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;background:#060a12}
button:hover{filter:brightness(1.12);transform:translateY(-1px)}
button:active{transform:translateY(0)}
input::placeholder{color:#334155}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes si{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
.shk{animation:sk .4s ease}
@keyframes sk{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
`;
