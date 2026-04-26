const { RISK_WEIGHTS, CONGESTED_PORTS, UNRELIABLE_CARRIERS } = require('../config/constants');

function computeRisk(shipment, context = {}) {
  let score = 0;
  const breakdown = [];

  if (context.weatherSeverity === 'severe')
    { score += RISK_WEIGHTS.WEATHER_SEVERE;   breakdown.push('Severe weather on corridor (+35)'); }
  else if (context.weatherSeverity === 'moderate')
    { score += RISK_WEIGHTS.WEATHER_MODERATE; breakdown.push('Moderate weather advisory (+15)'); }

  const portRisk = CONGESTED_PORTS.some(p =>
    (shipment.origin||'').includes(p) || (shipment.destination||'').includes(p));
  if (portRisk)
    { score += RISK_WEIGHTS.PORT_CONGESTION;  breakdown.push('High-congestion port on route (+20)'); }

  if (UNRELIABLE_CARRIERS.includes(shipment.carrier))
    { score += RISK_WEIGHTS.CARRIER_UNRELIABLE; breakdown.push(shipment.carrier+' capacity issues (+15)'); }

  const dh = shipment.delayHistory || 0;
  if (dh >= 3)      { score += RISK_WEIGHTS.DELAY_HISTORY_HIGH; breakdown.push(dh+' prior delays — pattern detected (+20)'); }
  else if (dh >= 1) { score += RISK_WEIGHTS.DELAY_HISTORY_MED;  breakdown.push(dh+' prior delay on record (+10)'); }

  if (shipment.status === 'disrupted')
    { score += RISK_WEIGHTS.ROUTE_ACTIVE_DISRUPTION; breakdown.push('Active disruption flag (+25)'); }

  score = Math.min(score, 100);
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, level, action: level === 'high' ? 'reroute' : level === 'medium' ? 'alert' : 'monitor', breakdown };
}

function scoreAll(shipments, globalContext = {}) {
  return shipments.map(s => ({ ...s, riskScore: computeRisk(s, globalContext) }));
}

module.exports = { computeRisk, scoreAll };