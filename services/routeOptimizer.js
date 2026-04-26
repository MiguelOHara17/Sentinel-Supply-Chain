const ALTERNATES = {
  'Rotterdam': { alternate:'Antwerp, BE',          corridor:'North Sea Alt — Hamburg anchor', savings:14, confidence:87 },
  'Malacca':   { alternate:'Lombok Strait',          corridor:'Indonesia Alt Corridor',         savings:8,  confidence:91 },
  'Suez':      { alternate:'Cape of Good Hope',      corridor:'South Africa Bypass',            savings:-18,confidence:78 },
  'Shanghai':  { alternate:'Ningbo-Zhoushan Port',   corridor:'Yangtze Delta Alt',              savings:6,  confidence:94 },
  'Dubai':     { alternate:'Jebel Ali South Berth',  corridor:'UAE Internal Bypass',            savings:10, confidence:82 },
};

function recommend(shipment, activeDisruptions = []) {
  const disruptedPorts = activeDisruptions.filter(d => !d.resolved).map(d => d.title).join(' ');
  let best = null;
  for (const [port, route] of Object.entries(ALTERNATES)) {
    if ((shipment.origin||'').includes(port) || (shipment.destination||'').includes(port) || disruptedPorts.includes(port)) {
      if (!best || route.confidence > best.confidence) best = { port, ...route };
    }
  }
  if (!best) return { recommended: false, reason: 'No congested nodes detected. Current route optimal.' };
  return {
    recommended: true,
    shipmentId: shipment.id,
    blockedPort: best.port,
    alternatePort: best.alternate,
    corridor: best.corridor,
    delaySavedHours: best.savings,
    confidence: best.confidence,
    action: best.savings > 0
      ? `Reroute via ${best.alternate} — saves ~${best.savings}h`
      : `Reroute via ${best.alternate} — avoids ${Math.abs(best.savings)}h queue`,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { recommend };