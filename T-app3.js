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
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surf2);border-radius:6px;border-left:3px solid ${col}">
        <span style="font-family:var(--mono);color:var(--pri);font-size:11px;min-width:76px">${s.id}</span>
        <span style="flex:1;font-size:11px;color:var(--muted)">${s.origin} → ${s.destination}</span>
        <div class="rbar"><div class="rbar-track"><div class="rbar-fill" style="width:${r.score}%;background:${col}"></div></div></div>
        <span style="color:${col};font-weight:700;font-size:11px;min-width:24px">${r.score}</span>
        <span class="rb ${r.level}">${r.level}</span>
      </div>`;
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
      return `<div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:8px;padding:12px;text-align:center">
        <div style="font-weight:700;font-size:12px;margin-bottom:6px">${c}</div>
        <div style="font-size:24px;font-weight:800;color:${col}">${pct}%</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">${ships.length} shipment${ships.length>1?'s':''}</div>
      </div>`;
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
// end app2
// end app3
