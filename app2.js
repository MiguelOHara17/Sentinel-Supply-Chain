async function simEvent(){
  const evs=[{title:'⚡ Flash Strike — Felixstowe Dockers',severity:'critical',body:'Work stoppage. 80 vessels affected. 72h+ backlog.',affectedShipments:['SHP-7720']},{title:'🌊 Tsunami Advisory — Pacific Rim',severity:'high',body:'Japan/Korea ports on alert. 4 vessels rerouting.',affectedShipments:['SHP-1173','SHP-5514']},{title:'📋 EU Customs Documentation Hold',severity:'medium',body:'New manifest rules. 6-12h delays at EU ports.',affectedShipments:['SHP-2987','SHP-3302']}];
  const e=evs[Math.floor(Math.random()*evs.length)];
  if(S.backendOnline){try{await fetch(CFG.api+'/api/disruptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)});await loadDisruptions();renderFeed();updateKPIs();toast('err','🚨 Posted to backend: '+e.title);return;}catch{}}
  S.disruptions.unshift({...e,id:'D-SIM-'+Date.now(),resolved:false,timestamp:new Date().toISOString()});
  addTL('crit','[SIM] '+e.title+': '+e.body,new Date().toLocaleTimeString());renderFeed();renderTimeline();updateKPIs();toast('err','🚨 Simulated: '+e.title);
}
const SC={weather:'Tropical cyclone forming in Bay of Bengal. 6 active shipments on corridor. 120 kt winds within 36h. Suggest rerouting and pre-positioning.',port:'Rotterdam at 98% capacity. 240 vessels queued, avg 48h wait. SHP-3302, SHP-4821, SHP-7720 in queue. Immediate actions?',customs:'New EU customs requirement effective immediately. 12 shipments lack updated manifests. 48-72h delays. Prioritise and advise.',carrier:'DHL-EU announced 15% capacity reduction due to labour dispute. 23 shipments booked. Contingency plan?'};
function prefill(){const v=document.getElementById('gscen').value;if(SC[v])document.getElementById('gprompt').value=SC[v];}
async function runGemini(){
  const key=document.getElementById('gkey').value.trim(),prompt=document.getElementById('gprompt').value.trim();
  const out=document.getElementById('gout'),btn=document.getElementById('gbtn');
  if(!prompt){toast('err','Enter a disruption scenario');return;}
  btn.disabled=true;btn.textContent='⟳ Analysing…';out.classList.add('vis');out.textContent='Connecting…';

  // 1. Try backend first
  if(S.backendOnline){
    try{
      const r=await fetch(CFG.api+'/api/routes/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,apiKey:key||undefined})});
      const d=await r.json();
      if(d.success){out.textContent=d.analysis;toast('ok','✓ Gemini via backend');closeModal('gemini');btn.disabled=false;btn.textContent='✨ Analyze';return;}
    }catch{}
  }

  // 2. Try Gemini directly with multiple models
  if(key){
    const models=['gemini-1.5-flash-8b','gemini-1.5-flash','gemini-2.0-flash'];
    const sys='You are Sentinel AI, a supply chain disruption analyst. Respond with:\n1. IMPACT ASSESSMENT\n2. IMMEDIATE ACTIONS (3-5 steps)\n3. REROUTING RECOMMENDATION\n4. RISK TIMELINE (24h/72h/7-day)\nUnder 350 words.';
    for(const model of models){
      try{
        out.textContent=`Trying ${model}…`;
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:sys+'\n\nDISRUPTION:\n'+prompt}]}],generationConfig:{temperature:.35,maxOutputTokens:550}})});
        const d=await r.json();
        if(!d.error){
          const t=d.candidates?.[0]?.content?.parts?.[0]?.text||'No response.';
          out.textContent=t;
          document.getElementById('ai-txt').textContent=t.slice(0,200);
          toast('ok',`✓ Gemini complete (${model})`);
          closeModal('gemini');
          btn.disabled=false;btn.textContent='✨ Analyze';
          return;
        }
      }catch{}
    }
  }

  // 3. Smart offline fallback — always works for demo
  const fallback=generateOfflineAnalysis(prompt);
  out.textContent=fallback;
  document.getElementById('ai-txt').textContent=fallback.slice(0,200);
  toast('inf','✓ Sentinel AI (offline mode)');
  closeModal('gemini');
  btn.disabled=false;btn.textContent='✨ Analyze';
}

function generateOfflineAnalysis(prompt){
  const p=prompt.toLowerCase();
  const isWeather=p.includes('storm')||p.includes('weather')||p.includes('typhoon')||p.includes('cyclone')||p.includes('wind');
  const isPort=p.includes('port')||p.includes('congestion')||p.includes('rotterdam')||p.includes('shanghai');
  const isCustoms=p.includes('custom')||p.includes('manifest')||p.includes('documentation');
  const isCarrier=p.includes('carrier')||p.includes('capacity')||p.includes('dhl')||p.includes('maersk');
  if(isWeather) return `1. IMPACT ASSESSMENT
Severe weather event detected on primary corridor. 6-8 active shipments at risk with estimated 24-72h delays. Wave heights exceeding safe operating thresholds. Port operations suspended at affected terminals.

2. IMMEDIATE ACTIONS
• Halt all non-critical departures from affected corridor for 48h
• Activate pre-approved alternate routing via southern passage
• Notify consignees of estimated 2-3 day delay — file force majeure documentation
• Coordinate with Maersk/MSC for vessel repositioning
• Deploy expedited air freight for time-critical cargo (pharma, perishables)

3. REROUTING RECOMMENDATION
Primary: Divert via Cape of Good Hope (+4 days, avoids storm entirely)
Secondary: Hold at nearest safe port and await weather window (36-48h)
Estimated cost impact: $180,000-$240,000 per rerouted vessel

4. RISK TIMELINE
24h: Maximum weather intensity — zero vessel movement recommended
72h: Storm passing, port reopening expected, backlog clearing begins
7-day: Full corridor restoration, 340 backlogged shipments cleared`;

  if(isPort) return `1. IMPACT ASSESSMENT
Port congestion creating cascading delays across European supply chain. Vessel queue averaging 48-72h wait time. 240+ vessels affected. Inland logistics backing up at rail and road connections.

2. IMMEDIATE ACTIONS
• Divert low-priority vessels to Hamburg, Felixstowe, or Antwerp
• Negotiate priority berthing slots for high-value cargo (add'l cost ~$15K/vessel)
• Activate inland rail alternatives from Bremerhaven for time-sensitive loads
• Issue shipper advisories — set new ETAs +3-5 days
• Pre-clear customs documentation to minimise terminal dwell time

3. REROUTING RECOMMENDATION
Hamburg: +18h transit, 60% capacity available — recommended for SHP-3302, SHP-4821
Felixstowe: +24h, good rail connections to European distribution hubs
Antwerp: Best option for Rhine corridor destinations

4. RISK TIMELINE
24h: Congestion worsening — avoid new bookings into affected port
72h: Partial berth availability as earliest vessels clear
7-day: Return to normal operations if no secondary disruptions`;

  if(isCustoms) return `1. IMPACT ASSESSMENT
Customs documentation backlog affecting 12-18 shipments. New regulatory requirement creating 48-72h processing delays. Risk of perishable cargo loss and contractual penalty exposure estimated at $2.1M.

2. IMMEDIATE ACTIONS
• Immediately file updated manifests for all affected shipments via customs portal
• Engage licensed customs broker for expedited processing — priority queue available
• Identify which shipments have time-critical delivery windows (flag for air reroute)
• Brief sales and operations teams on delay notifications to end customers
• Request temporary storage at bonded warehouse to avoid demurrage charges

3. REROUTING RECOMMENDATION
Air freight for highest-value / most time-sensitive cargo (top 20% by value)
Road transport for EU-internal shipments avoiding customs bottleneck
Remaining cargo: hold at port under bonded status pending clearance

4. RISK TIMELINE
24h: File all manifest updates — broker engagement critical
72h: Expedited processing expected for compliant shipments
7-day: Full backlog cleared, normal processing resumed`;

  return `1. IMPACT ASSESSMENT
Disruption detected affecting ${S.shipments?.filter(s=>s.status==='disrupted').length||3} active shipments. Risk engine flagging elevated exposure across primary trade corridors. Estimated delay impact: 24-96 hours depending on disruption severity.

2. IMMEDIATE ACTIONS
• Activate Sentinel real-time monitoring for all affected shipment IDs
• Initiate carrier communication protocol for status confirmation
• Assess inventory buffer at destination warehouses — flag if <7 days stock
• Prepare customer advisory for potential delay notification
• Review insurance coverage for force majeure clause applicability

3. REROUTING RECOMMENDATION
Sentinel Route Optimizer identifying alternate corridors with lower risk exposure. Estimated delay savings of 12-18 hours available via eastern corridor bypass. Cost delta: approximately $45,000 per affected vessel.

4. RISK TIMELINE
24h: Monitor situation closely — avoid committing additional cargo to affected route
72h: Rerouting decision window closes — commit to alternate by hour 36
7-day: Full risk assessment and carrier performance review`;
}
function exportCSV(){
  const hdr=['ID','Origin','Destination','Carrier','ETA','Weather','Risk Score','Risk Level','Status'];
  const rows=S.shipments.map(s=>{const r=s.riskScore||calcRisk(s);return[s.id,s.origin,s.destination,s.carrier,(s.eta||'').split('T')[0],s.weather?.severity||'—',r.score+'%',r.level,s.status];});
  const csv=[hdr,...rows].map(r=>r.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='sentinel-shipments.csv';a.click();toast('ok','✓ CSV exported');
}
function openModal(id){if(id==='config'){document.getElementById('cfg-api').value=CFG.api;document.getElementById('cfg-ws').value=CFG.ws;}document.getElementById('m-'+id).classList.add('open');}
function closeModal(id){document.getElementById('m-'+id).classList.remove('open');}
function saveConfig(){CFG.api=document.getElementById('cfg-api').value.trim()||'https://sentinel-supply-chain.onrender.com';CFG.ws=document.getElementById('cfg-ws').value.trim()||'wss://sentinel-supply-chain.onrender.com';// localStorage.setItem('sentinel_api',CFG.api);// localStorage.setItem('sentinel_ws',CFG.ws);toast('ok','✓ Config saved');loadAll();if(S.wsConn)S.wsConn.close();connectWS();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal('gemini');closeModal('config');}});
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');}));
function toggleTheme(){const h=document.documentElement,n=h.getAttribute('data-theme')==='dark'?'light':'dark';h.setAttribute('data-theme',n);toast('inf','Switched to '+n+' mode');}
function setNav(el,name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('page-title').textContent=name;
  const raw=el.textContent.replace(/[^a-zA-Z\s]/g,'').trim().toLowerCase().replace(/\s+/g,'');
  const vmap={dashboard:'view-dashboard',shipments:'view-shipments',routeoptimizer:'view-routeoptimizer',analytics:'view-analytics'};
  const vid=vmap[raw]||'view-dashboard';
  document.querySelectorAll('.view-section').forEach(s=>s.style.display='none');
  const t=document.getElementById(vid);
  if(t)t.style.display='flex';
  if(raw==='dashboard'&&leafMap)setTimeout(()=>leafMap.invalidateSize(),200);
  syncViews();
}
function toast(type,msg){const c=document.getElementById('tc'),t=document.createElement('div');t.className='toast '+type;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},3800);}
let dStep=-1;
const DEMO=[()=>toast('inf','Step 1/4 — KPI cards show live health metrics'),()=>{leafMap&&leafMap.setView([31.2,121.5],5,{animate:true});toast('inf','Step 2/4 — SHP-4821 focused. Click marker for full risk breakdown.');},()=>simEvent(),()=>{autoReroute();toast('ok','Step 4/4 — Route optimised. 18h delay avoided!');dStep=-1;}];
function runDemo(){dStep=(dStep+1)%DEMO.length;DEMO[dStep]();}
// end app2
