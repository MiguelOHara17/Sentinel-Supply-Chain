
const CFG={api:'https://sentinel-supply-chain.onrender.com',ws:'wss://sentinel-supply-chain.onrender.com'};
let S={shipments:[],disruptions:[],alerts:[],wsConn:null,backendOnline:false,tlEvents:[],rerouted:0};
const CONGESTED=['Rotterdam','Shanghai','Dubai','Mumbai','Singapore','Felixstowe'];
const BAD_CARRIERS=['MSC','COSCO'];
function calcRisk(s){
  let score=0,breakdown=[];
  const wx=s.weather?.severity||'clear';
  if(wx==='severe'){score+=35;breakdown.push('Severe weather on corridor (+35)');}
  if(wx==='moderate'){score+=15;breakdown.push('Moderate weather advisory (+15)');}
  if(CONGESTED.some(c=>(s.origin||'').includes(c)||(s.destination||'').includes(c))){score+=20;breakdown.push('High-congestion port on route (+20)');}
  if(BAD_CARRIERS.includes(s.carrier)){score+=15;breakdown.push(s.carrier+' capacity issues (+15)');}
  const dh=s.delayHistory||0;
  if(dh>=3){score+=20;breakdown.push(dh+' prior delays — pattern detected (+20)');}
  else if(dh>=1){score+=10;breakdown.push(dh+' prior delay on record (+10)');}
  if(s.status==='disrupted'){score+=25;breakdown.push('Active disruption flag (+25)');}
  score=Math.min(score,100);
  return{score,level:score>=70?'high':score>=40?'medium':'low',breakdown};
}
function riskCol(lv){return lv==='high'?'var(--red)':lv==='medium'?'var(--ylw)':'var(--grn)';}
const MOCK_SHIPS=[
  {id:'SHP-4821',origin:'Shanghai, CN',destination:'Frankfurt, DE',carrier:'MSC',eta:'2026-04-28',status:'disrupted',delayHistory:3,lat:31.2,lng:121.5,dlat:50.1,dlng:8.7,weather:{severity:'moderate',description:'Typhoon advisory, 55 kt winds'}},
  {id:'SHP-3302',origin:'Mumbai, IN',destination:'Rotterdam, NL',carrier:'Maersk',eta:'2026-04-27',status:'delayed',delayHistory:2,lat:18.9,lng:72.8,dlat:51.9,dlng:4.5,weather:{severity:'severe',description:'North Sea storm, 85 kt winds'}},
  {id:'SHP-5514',origin:'Los Angeles, US',destination:'Tokyo, JP',carrier:'Evergreen',eta:'2026-04-30',status:'on-track',delayHistory:0,lat:34.0,lng:-118.2,dlat:35.7,dlng:139.7,weather:{severity:'clear',description:'Sunny, calm Pacific'}},
  {id:'SHP-2987',origin:'Hamburg, DE',destination:'New York, US',carrier:'CMA CGM',eta:'2026-05-02',status:'on-track',delayHistory:1,lat:53.6,lng:10.0,dlat:40.7,dlng:-74.0,weather:{severity:'moderate',description:'Strong winds, 40 kt'}},
  {id:'SHP-6641',origin:'Dubai, UAE',destination:'Singapore, SG',carrier:'COSCO',eta:'2026-04-26',status:'disrupted',delayHistory:4,lat:25.2,lng:55.3,dlat:1.3,dlng:103.8,weather:{severity:'clear',description:'Clear skies, 28°C'}},
  {id:'SHP-1173',origin:'Busan, KR',destination:'Vancouver, CA',carrier:'HMM',eta:'2026-05-05',status:'on-track',delayHistory:0,lat:35.1,lng:129.0,dlat:49.3,dlng:-123.1,weather:{severity:'clear',description:'Partly cloudy, calm seas'}},
  {id:'SHP-7720',origin:'Chennai, IN',destination:'Felixstowe, UK',carrier:'MOL',eta:'2026-05-01',status:'rerouted',delayHistory:2,lat:13.1,lng:80.3,dlat:51.9,dlng:1.3,weather:{severity:'moderate',description:'Monsoon activity, heavy rain'}},
  {id:'SHP-0934',origin:'Guangzhou, CN',destination:'Santos, BR',carrier:'MSC',eta:'2026-05-08',status:'on-track',delayHistory:0,lat:23.1,lng:113.3,dlat:-23.9,dlng:-46.3,weather:{severity:'clear',description:'Clear, 24°C'}},
];
const MOCK_DIS=[
  {id:'D-001',title:'Rotterdam Port Congestion',severity:'critical',body:'240+ vessels queued. Avg wait 48h.',resolved:false,timestamp:'2026-04-25T03:42:00Z'},
  {id:'D-002',title:'North Atlantic Storm System',severity:'high',body:'85-knot winds. 6 vessels rerouting.',resolved:false,timestamp:'2026-04-25T03:15:00Z'},
  {id:'D-003',title:'Suez Canal Inspection Backlog',severity:'high',body:'Inspection backlog adding +12h eastbound.',resolved:false,timestamp:'2026-04-25T02:19:00Z'},
  {id:'D-004',title:'Shanghai Customs Hold',severity:'medium',body:'New manifest requirements. ~3-day backlog.',resolved:false,timestamp:'2026-04-25T02:05:00Z'},
  {id:'D-005',title:'DHL-EU Capacity Reduction',severity:'medium',body:'15% capacity cut. 23 shipments flagged.',resolved:false,timestamp:'2026-04-25T01:00:00Z'},
];
async function checkHealth(){
  // Show connecting state
  document.getElementById('api-label').textContent='API: connecting…';
  try{const r=await fetch(CFG.api+'/api/health',{signal:(()=>{const c=new AbortController();setTimeout(()=>c.abort(),3000);return c.signal;})()});const d=await r.json();
    if(d.status==='ok'){S.backendOnline=true;document.getElementById('api-dot').classList.add('online');document.getElementById('api-label').textContent='API: online';document.getElementById('cfg-api-status').textContent='✓ Connected';document.getElementById('cfg-source').textContent='Live backend';return true;}}
  catch{S.backendOnline=false;document.getElementById('api-dot').classList.remove('online');document.getElementById('api-label').textContent='API: offline';document.getElementById('cfg-api-status').textContent='✗ Offline — using mock data';document.getElementById('cfg-source').textContent='Built-in mock data';}
  return false;
}
function connectWS(){
  try{S.wsConn=new WebSocket(CFG.ws);
    S.wsConn.onopen=()=>{S.wsOnline=true;document.getElementById('ws-dot').classList.add('ws');document.getElementById('ws-label').textContent='WS: live';document.getElementById('cfg-ws-status').textContent='✓ Connected';toast('ws','⚡ WebSocket stream connected');};
    S.wsConn.onmessage=e=>handleWS(JSON.parse(e.data));
    S.wsConn.onclose=()=>{S.wsOnline=false;document.getElementById('ws-dot').classList.remove('ws');document.getElementById('ws-label').textContent='WS: off';setTimeout(connectWS,5000);};
    S.wsConn.onerror=()=>{document.getElementById('cfg-ws-status').textContent='✗ Not reachable';};}catch{}
}
function handleWS({type,payload,timestamp}){
  const t=new Date(timestamp).toLocaleTimeString();
  if(type==='DISRUPTION_DETECTED'&&payload.disruption){S.disruptions.unshift(payload.disruption);addTL('crit','[LIVE] '+payload.disruption.title+': '+payload.disruption.body,t);renderFeed();updateKPIs();toast('err','🚨 WS: '+payload.disruption.title);}
  else if(type==='ROUTE_REROUTED'){addTL('res','[LIVE] Route rerouted for '+payload.shipmentId+'. Saved '+payload.delaySaved+'h.',t);toast('ws','✓ WS: '+payload.shipmentId+' rerouted');}
  else if(type==='SHIPMENT_UPDATE'){addTL('med','[LIVE] '+payload.shipmentId+' — '+payload.update,t);flashRow(payload.shipmentId);}
  else if(type==='ALERT_CLEARED'){addTL('res','[LIVE] Alert cleared: '+payload.shipmentId,t);}
  renderTimeline();
}
async function loadShipments(){
  if(S.backendOnline){try{const r=await fetch(CFG.api+'/api/shipments');const d=await r.json();if(d.success){S.shipments=d.shipments;document.getElementById('table-src').textContent='— live API';document.getElementById('map-src').textContent=d.count+' shipments from API';return;}}catch{}}
  S.shipments=MOCK_SHIPS.map(s=>({...s,riskScore:calcRisk(s)}));document.getElementById('table-src').textContent='— mock data';document.getElementById('map-src').textContent=MOCK_SHIPS.length+' shipments (built-in)';
}
async function loadDisruptions(){
  if(S.backendOnline){try{const r=await fetch(CFG.api+'/api/disruptions');const d=await r.json();if(d.success){S.disruptions=d.disruptions;document.getElementById('alert-src').textContent='(live)';return;}}catch{}}
  S.disruptions=[...MOCK_DIS];document.getElementById('alert-src').textContent='(mock)';
}
async function loadAlerts(){
  if(S.backendOnline){try{const r=await fetch(CFG.api+'/api/alerts');const d=await r.json();if(d.success){S.alerts=d.alerts;return;}}catch{}}
  S.alerts=S.shipments.map(s=>({shipmentId:s.id,...(s.riskScore||calcRisk(s)),reasons:(s.riskScore?.breakdown||calcRisk(s).breakdown)})).filter(a=>a.level!=='low');
}
async function loadAll(){
  await checkHealth();await Promise.all([loadShipments(),loadDisruptions()]);await loadAlerts();
  updateKPIs();renderFeed();renderTable();renderMap();renderAI();renderTimeline();renderRoute();
  toast('ok','✓ Data loaded ('+(S.backendOnline?'live API':'mock')+')');
}
function updateKPIs(){
  const ships=S.shipments,total=ships.length,onTime=ships.filter(s=>s.status==='on-track').length;
  const highRisk=ships.filter(s=>(s.riskScore?.score??calcRisk(s).score)>=70).length;
  const activeDis=S.disruptions.filter(d=>!d.resolved).length;
  document.getElementById('k-ship').textContent=total;
  document.getElementById('k-ship-sub').className='kpi-sub fl';
  document.getElementById('k-ship-sub').textContent=ships.filter(s=>s.status==='rerouted').length+' rerouted today';
  document.getElementById('k-dis').textContent=activeDis;
  document.getElementById('k-dis-sub').className='kpi-sub up';
  document.getElementById('k-dis-sub').textContent=activeDis+' active disruptions';
  const ot=total?((onTime/total)*100).toFixed(1):'0.0';
  document.getElementById('k-ot').textContent=ot+'%';
  document.getElementById('k-ot-sub').className='kpi-sub '+(parseFloat(ot)>=80?'dn':'up');
  document.getElementById('k-ot-sub').textContent=onTime+'/'+total+' on schedule';
  document.getElementById('k-risk').textContent=highRisk;
  document.getElementById('k-risk-sub').className='kpi-sub '+(highRisk>2?'up':'dn');
  document.getElementById('k-risk-sub').textContent=highRisk>0?highRisk+' need attention':'All within threshold';
  document.getElementById('ac').textContent=activeDis||'—';
}
let leafMap=null;
function renderMap(){
  if(!leafMap){leafMap=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([25,30],2);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:16,subdomains:[]}).addTo(leafMap);setTimeout(()=>leafMap.invalidateSize(),400);}
  else{leafMap.eachLayer(l=>{if(!(l instanceof L.TileLayer))leafMap.removeLayer(l);});}
  S.shipments.forEach(s=>{
    const risk=s.riskScore||calcRisk(s),col=riskCol(risk.level);
    const icon=L.divIcon({className:'',iconSize:[13,13],iconAnchor:[6,6],html:`<div style="width:13px;height:13px;border-radius:50%;background:${col};border:2px solid rgba(255,255,255,.7);box-shadow:0 0 8px ${col}99;cursor:pointer"></div>`});
    L.marker([s.lat,s.lng],{icon}).addTo(leafMap).bindPopup(`<div style="font-family:Inter,sans-serif;min-width:200px"><div style="font-weight:700;color:${col};font-size:13px;margin-bottom:6px">${s.id}</div><div style="margin-bottom:4px">📦 <b>${s.origin}</b> → <b>${s.destination}</b></div><div style="margin-bottom:4px">🚢 ${s.carrier} | 📅 ETA: ${(s.eta||'').split('T')[0]}</div><div style="margin-bottom:6px">🌤 ${s.weather?.description||'—'} (${s.weather?.severity||'—'})</div><div style="background:rgba(255,255,255,.05);border-radius:6px;padding:8px"><div style="font-size:11px;color:#6b737e;margin-bottom:4px">RISK SCORE</div><div style="font-size:20px;font-weight:800;color:${col}">${risk.score}% <span style="font-size:11px;text-transform:uppercase">${risk.level}</span></div>${(risk.breakdown||[]).map(b=>`<div style="font-size:10px;color:#6b737e;margin-top:2px">• ${b}</div>`).join('')}</div><div style="margin-top:6px;font-weight:600;color:${col};font-size:11px;text-transform:capitalize">${(s.status||'').replace('-',' ')}</div></div>`);
    L.polyline([[s.lat,s.lng],[s.dlat,s.dlng]],{color:col,weight:1.5,opacity:.4,dashArray:s.status==='disrupted'?'5,5':null}).addTo(leafMap);
    L.marker([s.dlat,s.dlng],{icon:L.divIcon({className:'',iconSize:[7,7],iconAnchor:[3,3],html:`<div style="width:7px;height:7px;border-radius:50%;background:${col};opacity:.4;border:1px solid ${col}"></div>`})}).addTo(leafMap);
  });
}
function renderTable(){
  document.getElementById('tbody').innerHTML=S.shipments.map(s=>{
    const r=s.riskScore||calcRisk(s),col=riskCol(r.level),wx=s.weather||{},wi=wx.severity==='severe'?'🌩':wx.severity==='moderate'?'⛅':'☀';
    return `<tr id="row-${s.id}" onclick="leafMap&&leafMap.setView([${s.lat},${s.lng}],5,{animate:true})"><td><span style="font-family:var(--mono);color:var(--pri)">${s.id}</span></td><td>${s.origin}</td><td>${s.destination}</td><td>${s.carrier}</td><td>${(s.eta||'').split('T')[0]}</td><td title="${wx.description||'—'}">${wi} ${wx.severity||'—'}</td><td><div class="rbar"><div class="rbar-track"><div class="rbar-fill" style="width:${r.score}%;background:${col}"></div></div><span style="color:${col};font-weight:700;font-size:10px">${r.score}%</span></div></td><td><span class="rb ${r.level}">${r.level}</span></td></tr>`;
  }).join('');
}
function flashRow(id){const r=document.getElementById('row-'+id);if(r){r.classList.remove('ws-flash');void r.offsetWidth;r.classList.add('ws-flash');}}
function renderFeed(){
  const a=S.disruptions.filter(d=>!d.resolved);
  document.getElementById('feed').innerHTML=a.slice(0,6).map(d=>{const sv=d.severity==='critical'?'crit':d.severity==='high'?'high':'med';const t=d.timestamp?new Date(d.timestamp).toLocaleTimeString():d.time||'—';return `<div class="fi ${sv}"><div class="fi-top"><span class="fi-title">${d.title}</span><span class="sev ${sv}">${d.severity}</span></div><div class="fi-body">${d.body||''}</div><div class="fi-time">${t}</div></div>`;}).join('')||'<div style="font-size:11px;color:var(--faint);padding:10px">No active disruptions</div>';
}
function addTL(sev,msg,time){S.tlEvents.unshift({sev,msg,time});if(S.tlEvents.length>25)S.tlEvents.pop();}
function renderTimeline(){document.getElementById('tl').innerHTML=S.tlEvents.map(e=>`<div class="tli"><div class="tld ${e.sev}"></div><div><div class="tlm">${e.msg}</div><div class="tlt">${e.time}</div></div></div>`).join('');}
function renderAI(){
  const high=S.shipments.filter(s=>(s.riskScore?.score??calcRisk(s).score)>=70);
  const dis=S.disruptions.filter(d=>!d.resolved).length;
  document.getElementById('ai-txt').textContent=`Monitoring ${S.shipments.length} active shipments. ${dis} active disruptions detected. `+(high.length?`${high.length} at HIGH risk: ${high.map(s=>s.id).join(', ')}. Preemptive rerouting recommended.`:'All shipments within acceptable thresholds.');
  document.getElementById('ai-recs').innerHTML=S.alerts.slice(0,3).map(a=>`<div class="air"><div style="font-size:18px">${a.level==='high'?'🔴':'🟡'}</div><div class="air-txt"><strong>${a.shipmentId} — ${(a.level||'').toUpperCase()} RISK (${a.score}%)</strong>${(a.reasons||a.breakdown||[])[0]||'Risk factors detected.'}</div></div>`).join('')||'<div style="font-size:11px;color:var(--faint)">No alerts — all shipments within threshold</div>';
}
let route=[
  {name:'Shanghai Port',det:'Departed on schedule',eta:'Apr 20',cls:'act'},
  {name:'Taiwan Strait',det:'Transit complete',eta:'Apr 22',cls:'act'},
  {name:'Strait of Malacca',det:'Congestion — 8h delay risk',eta:'Apr 24',cls:'blk'},
  {name:'Port of Colombo',det:'Alternate waypoint (pending)',eta:'Apr 26',cls:''},
  {name:'Suez Canal',det:'Slot awaiting allocation',eta:'Apr 28',cls:''},
  {name:'Frankfurt Inland Hub',det:'Estimated arrival',eta:'Apr 30',cls:''},
];
function renderRoute(){document.getElementById('steps').innerHTML=route.map((r,i)=>`<div class="step ${r.cls}"><div class="step-n">${i+1}</div><div class="step-info"><div class="step-name">${r.name}${r.cls==='blk'?' 🚫':r.cls==='act'?' ✅':''}</div><div class="step-det">${r.det}</div></div><div class="step-eta">${r.eta}</div></div>`).join('');}
async function autoReroute(){
  route[2]={...route[2],cls:'',det:'Rerouted via Bay of Bengal'};route[3]={...route[3],cls:'act',det:'Active reroute waypoint'};
  renderRoute();addTL('res','SHP-4821 auto-rerouted. Malacca bypassed. ETA maintained: Apr 30.',new Date().toLocaleTimeString());renderTimeline();toast('ok','✓ SHP-4821 rerouted — 18h delay avoided');
  if(S.backendOnline){try{await fetch(CFG.api+'/api/shipments/SHP-4821/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'rerouted'})});}catch{}}
}
function initCharts(){
  const tc1=document.getElementById('tc1'),tc2=document.getElementById('tc2');
  if(!tc1||!tc2){console.warn('Charts: canvas not ready');return;}
  const gc='rgba(255,255,255,.04)',tc='#6b737e';
  const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Inter',size:11},boxWidth:12}}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{family:'Inter',size:11}}},y:{grid:{color:gc},ticks:{color:tc,font:{family:'Inter',size:11}}}},animation:{duration:800}};
  new Chart(document.getElementById('tc1').getContext('2d'),{type:'line',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{label:'Disruptions',data:[4,6,5,9,11,8,7],borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#ef4444'},{label:'Rerouted',data:[2,3,2,5,8,6,5],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.06)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#3b82f6'},{label:'Resolved',data:[2,3,3,4,3,2,2],borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.05)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#22c55e'}]},options:opts});
  new Chart(document.getElementById('tc2').getContext('2d'),{type:'doughnut',data:{labels:['Weather','Port Congestion','Carrier Issues','Customs','Infrastructure'],datasets:[{data:[31,27,18,14,10],backgroundColor:['#3b82f6','#ef4444','#f59e0b','#00d9b8','#a78bfa'],borderColor:'#111418',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Inter',size:10},boxWidth:10,padding:12}}},animation:{duration:1000,animateRotate:true}}});
}
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
  if(isWeather) return `1. IMPACT ASSESSMENT\nSevere weather event detected on primary corridor. 6-8 active shipments at risk with estimated 24-72h delays. Wave heights exceeding safe operating thresholds. Port operations suspended at affected terminals.\n\n2. IMMEDIATE ACTIONS\n• Halt all non-critical departures from affected corridor for 48h\n• Activate pre-approved alternate routing via southern passage\n• Notify consignees of estimated 2-3 day delay — file force majeure documentation\n• Coordinate with Maersk/MSC for vessel repositioning\n• Deploy expedited air freight for time-critical cargo (pharma, perishables)\n\n3. REROUTING RECOMMENDATION\nPrimary: Divert via Cape of Good Hope (+4 days, avoids storm entirely)\nSecondary: Hold at nearest safe port and await weather window (36-48h)\nEstimated cost impact: $180,000-$240,000 per rerouted vessel\n\n4. RISK TIMELINE\n24h: Maximum weather intensity — zero vessel movement recommended\n72h: Storm passing, port reopening expected, backlog clearing begins\n7-day: Full corridor restoration, 340 backlogged shipments cleared`;

  if(isPort) return `1. IMPACT ASSESSMENT\nPort congestion creating cascading delays across European supply chain. Vessel queue averaging 48-72h wait time. 240+ vessels affected. Inland logistics backing up at rail and road connections.\n\n2. IMMEDIATE ACTIONS\n• Divert low-priority vessels to Hamburg, Felixstowe, or Antwerp\n• Negotiate priority berthing slots for high-value cargo (add'l cost ~$15K/vessel)\n• Activate inland rail alternatives from Bremerhaven for time-sensitive loads\n• Issue shipper advisories — set new ETAs +3-5 days\n• Pre-clear customs documentation to minimise terminal dwell time\n\n3. REROUTING RECOMMENDATION\nHamburg: +18h transit, 60% capacity available — recommended for SHP-3302, SHP-4821\nFelixstowe: +24h, good rail connections to European distribution hubs\nAntwerp: Best option for Rhine corridor destinations\n\n4. RISK TIMELINE\n24h: Congestion worsening — avoid new bookings into affected port\n72h: Partial berth availability as earliest vessels clear\n7-day: Return to normal operations if no secondary disruptions`;

  if(isCustoms) return `1. IMPACT ASSESSMENT\nCustoms documentation backlog affecting 12-18 shipments. New regulatory requirement creating 48-72h processing delays. Risk of perishable cargo loss and contractual penalty exposure estimated at $2.1M.\n\n2. IMMEDIATE ACTIONS\n• Immediately file updated manifests for all affected shipments via customs portal\n• Engage licensed customs broker for expedited processing — priority queue available\n• Identify which shipments have time-critical delivery windows (flag for air reroute)\n• Brief sales and operations teams on delay notifications to end customers\n• Request temporary storage at bonded warehouse to avoid demurrage charges\n\n3. REROUTING RECOMMENDATION\nAir freight for highest-value / most time-sensitive cargo (top 20% by value)\nRoad transport for EU-internal shipments avoiding customs bottleneck\nRemaining cargo: hold at port under bonded status pending clearance\n\n4. RISK TIMELINE\n24h: File all manifest updates — broker engagement critical\n72h: Expedited processing expected for compliant shipments\n7-day: Full backlog cleared, normal processing resumed`;

  return `1. IMPACT ASSESSMENT\nDisruption detected affecting ${S.shipments?.filter(s=>s.status==='disrupted').length||3} active shipments. Risk engine flagging elevated exposure across primary trade corridors. Estimated delay impact: 24-96 hours depending on disruption severity.\n\n2. IMMEDIATE ACTIONS\n• Activate Sentinel real-time monitoring for all affected shipment IDs\n• Initiate carrier communication protocol for status confirmation\n• Assess inventory buffer at destination warehouses — flag if <7 days stock\n• Prepare customer advisory for potential delay notification\n• Review insurance coverage for force majeure clause applicability\n\n3. REROUTING RECOMMENDATION\nSentinel Route Optimizer identifying alternate corridors with lower risk exposure. Estimated delay savings of 12-18 hours available via eastern corridor bypass. Cost delta: approximately $45,000 per affected vessel.\n\n4. RISK TIMELINE\n24h: Monitor situation closely — avoid committing additional cargo to affected route\n72h: Rerouting decision window closes — commit to alternate by hour 36\n7-day: Full risk assessment and carrier performance review`;
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
document.addEventListener('DOMContentLoaded',async()=>{try{
  // Force clear stale localStorage values and hardcode Render URL
  localStorage.setItem('sentinel_api','https://sentinel-supply-chain.onrender.com');
  localStorage.setItem('sentinel_ws','wss://sentinel-supply-chain.onrender.com');
  const _ae=document.getElementById('cfg-api'),_we=document.getElementById('cfg-ws');
  if(_ae)_ae.value='https://sentinel-supply-chain.onrender.com';
  if(_we)_we.value='wss://sentinel-supply-chain.onrender.com';

  // ── Step 1: Render mock data IMMEDIATELY so app is never blank ──
  initCharts();
  MOCK_DIS.forEach(d=>{const sv=d.severity==='critical'?'crit':d.severity==='high'?'high':'med';addTL(sv,d.title+': '+d.body,new Date(d.timestamp).toLocaleTimeString());});
  addTL('res','SHP-7720 successfully rerouted. 11h delay avoided.','08:53 AM');
  addTL('med','Gemini AI pre-flagged customs bottleneck 6h before onset.','07:55 AM');
  S.shipments=MOCK_SHIPS; S.disruptions=MOCK_DIS;
  try{updateKPIs();}catch(e){}
  try{renderFeed();}catch(e){}
  try{renderTable();}catch(e){}
  try{renderMap();}catch(e){}
  try{renderAI();}catch(e){}
  try{renderTimeline();}catch(e){}
  try{renderRoute();}catch(e){}
  try{syncViews();}catch(e){}
  toast('inf','Loading live data from backend…');

  // ── Step 2: Try backend in background (Render cold start can take 30-60s) ──
  connectWS();
  setTimeout(async()=>{
    await loadAll();
    setTimeout(()=>toast('ok','✓ Sentinel online — monitoring active'),400);
    setInterval(loadAll,120000);
  },100);
}catch(e){console.error('Init error:',e);document.getElementById('api-label').textContent='Init error — check console';};
  addTL('res','SHP-7720 successfully rerouted. 11h delay avoided.','08:53 AM');
  addTL('med','Gemini AI pre-flagged customs bottleneck 6h before onset.','07:55 AM');
  await loadAll();
  connectWS();
  setTimeout(()=>toast('ok','✓ Sentinel online — monitoring active'),800);
  setInterval(loadAll,120000);
});

// ════ syncViews: keeps secondary views in sync with data ════════════════════
function syncViews(){
  if(!S.shipments||!S.shipments.length) return;

  // --- Shipments view ---
  const tb=document.getElementById('tbody-s');
  const tbSrc=document.getElementById('tbody');
  if(tb&&tbSrc) tb.innerHTML=tbSrc.innerHTML;
  const tlS=document.getElementById('tl-s');
  const tlSrc=document.getElementById('tl');
  if(tlS&&tlSrc) tlS.innerHTML=tlSrc.innerHTML;

  // --- Route Optimizer view ---
  const stepsR=document.getElementById('steps-r');
  const stepsSrc=document.getElementById('steps');
  if(stepsR&&stepsSrc) stepsR.innerHTML=stepsSrc.innerHTML;
  const rl=document.getElementById('risk-list-r');
  if(rl){
    rl.innerHTML=S.shipments.map(s=>{
      const r=s.riskScore||calcRisk(s);
      const col=riskCol(r.level);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surf2);border-radius:6px;border-left:3px solid ${col}">\n        <span style="font-family:var(--mono);color:var(--pri);font-size:11px;min-width:76px">${s.id}</span>\n        <span style="flex:1;font-size:11px;color:var(--muted)">${s.origin} → ${s.destination}</span>\n        <div class="rbar"><div class="rbar-track"><div class="rbar-fill" style="width:${r.score}%;background:${col}"></div></div></div>\n        <span style="color:${col};font-weight:700;font-size:11px;min-width:24px">${r.score}</span>\n        <span class="rb ${r.level}">${r.level}</span>\n      </div>`;
    }).join('');
  }
  const riR=document.getElementById('ri-rerouted');
  if(riR) riR.textContent=S.shipments.filter(s=>s.status==='rerouted').length;

  // --- Analytics view ---
  const total=S.shipments.length;
  const disrupted=S.shipments.filter(s=>s.status==='disrupted'||s.status==='delayed').length;
  const scores=S.shipments.map(s=>s.riskScore?.score||calcRisk(s).score);
  const avgRisk=Math.round(scores.reduce((a,b)=>a+b,0)/total);
  const rerouted=S.shipments.filter(s=>s.status==='rerouted').length;
  const disRate=(disrupted/total*100).toFixed(0);
  const g=id=>document.getElementById(id);
  if(g('an-total')){g('an-total').textContent=total;g('an-sub1').textContent=S.shipments.filter(s=>s.status==='on-track').length+' on-track';}
  if(g('an-disrate')){g('an-disrate').textContent=disRate+'%';g('an-sub2').textContent=disrupted+' shipments affected';}
  if(g('an-avgrisk')){g('an-avgrisk').textContent=avgRisk;g('an-sub3').textContent=avgRisk>50?'Above threshold':'Within threshold';}
  if(g('an-rerouted')) g('an-rerouted').textContent=rerouted;

  // Carrier performance grid
  const cg=document.getElementById('carrier-grid');
  if(cg){
    const carriers=[...new Set(S.shipments.map(s=>s.carrier))];
    cg.innerHTML=carriers.map(c=>{
      const ships=S.shipments.filter(s=>s.carrier===c);
      const onT=ships.filter(s=>s.status==='on-track').length;
      const pct=Math.round(onT/ships.length*100);
      const col=pct>=80?'var(--grn)':pct>=50?'var(--ylw)':'var(--red)';
      return `<div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:8px;padding:12px;text-align:center">\n        <div style="font-weight:700;font-size:12px;margin-bottom:6px">${c}</div>\n        <div style="font-size:24px;font-weight:800;color:${col}">${pct}%</div>\n        <div style="font-size:10px;color:var(--muted);margin-top:4px">${ships.length} shipment${ships.length>1?'s':''}</div>\n      </div>`;
    }).join('');
  }

  // Analytics charts - init once
  if(!window._aChartsInited){
    const c1=document.getElementById('tc-a1');
    const c2=document.getElementById('tc-a2');
    if(c1&&c2&&window.Chart){
      window._aChartsInited=true;
      const tc='#6b737e',gc='rgba(255,255,255,.04)';
      const baseOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Inter',size:11},boxWidth:12}}},scales:{x:{grid:{color:gc},ticks:{color:tc}},y:{grid:{color:gc},ticks:{color:tc}}},animation:{duration:700}};
      new Chart(c1.getContext('2d'),{type:'line',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[
        {label:'Disruptions',data:[4,6,5,9,11,8,7],borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#ef4444'},
        {label:'Rerouted',data:[2,3,2,5,8,6,5],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.06)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#3b82f6'},
        {label:'Resolved',data:[2,3,3,4,3,2,2],borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.05)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#22c55e'}
      ]},options:baseOpts});
      new Chart(c2.getContext('2d'),{type:'doughnut',data:{labels:['Weather','Port Congestion','Carrier Issues','Customs','Infrastructure'],datasets:[{data:[31,27,18,14,10],backgroundColor:['#3b82f6','#ef4444','#f59e0b','#00d9b8','#a78bfa'],borderColor:'#111418',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Inter',size:10},boxWidth:10,padding:12}}},animation:{duration:900,animateRotate:true}}});
    }
  }
}
