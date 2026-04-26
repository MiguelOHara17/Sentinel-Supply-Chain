const express  = require('express');
const router   = express.Router();
const { recommend }         = require('../services/routeOptimizer');
const { analyzeDisruption } = require('../services/geminiService');
const ships                 = require('../data/shipments.json');
const disruptions           = require('../data/disruptions.json');

router.get('/optimize/:id', async (req, res, next) => {
  try {
    const s = ships.find(s => s.id === req.params.id);
    if (!s) return res.status(404).json({ success: false, error: 'Shipment not found' });
    const rec = recommend(s, disruptions.filter(d => !d.resolved));
    res.json({ success: true, shipmentId: s.id, recommendation: rec });
  } catch(err) { next(err); }
});

router.post('/analyze', async (req, res, next) => {
  try {
    const { prompt, apiKey } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });
    const analysis = await analyzeDisruption(prompt, apiKey);
    res.json({ success: true, analysis, model: 'gemini-1.5-flash', timestamp: new Date().toISOString() });
  } catch(err) { next(err); }
});

router.get('/optimize-all', async (req, res, next) => {
  try {
    const active = disruptions.filter(d => !d.resolved);
    const results = ships
      .filter(s => ['disrupted','delayed'].includes(s.status))
      .map(s => ({ shipmentId: s.id, ...recommend(s, active) }));
    res.json({ success: true, count: results.length, recommendations: results });
  } catch(err) { next(err); }
});

module.exports = router;