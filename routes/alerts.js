const express = require('express');
const router  = express.Router();
const { computeRisk } = require('../services/riskEngine');
const ships           = require('../data/shipments.json');

router.get('/', async (req, res, next) => {
  try {
    const alerts = ships
      .map(s => ({ s, risk: computeRisk(s, { weatherSeverity: s.weather?.severity }) }))
      .filter(({ risk }) => risk.level !== 'low')
      .map(({ s, risk }) => ({
        id: 'ALERT-' + s.id, shipmentId: s.id,
        level: risk.level, score: risk.score,
        reasons: risk.breakdown,
        message: `${risk.level.toUpperCase()} risk on ${s.id} (${s.origin} → ${s.destination})`,
        recommendedAction: risk.level === 'high' ? 'Immediate reroute evaluation' : 'Monitor closely',
        timestamp: new Date().toISOString(),
      }))
      .sort((a, b) => b.score - a.score);
    res.json({ success: true, count: alerts.length, alerts });
  } catch(err) { next(err); }
});

module.exports = router;