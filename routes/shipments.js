const express = require('express');
const router  = express.Router();
const { computeRisk } = require('../services/riskEngine');
const { getDb }       = require('../config/firebase');
const ships           = require('../data/shipments.json');

router.get('/', async (req, res, next) => {
  try {
    let data = ships;
    const db = getDb();
    if (db) {
      const snap = await db.collection('shipments').get();
      if (!snap.empty) data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const scored = data.map(s => ({ ...s, riskScore: computeRisk(s, { weatherSeverity: s.weather?.severity }) }));
    res.json({ success: true, count: scored.length, shipments: scored });
  } catch(err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const s = ships.find(s => s.id === req.params.id);
    if (!s) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, shipment: { ...s, riskScore: computeRisk(s, { weatherSeverity: s.weather?.severity }) } });
  } catch(err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['on-track','delayed','disrupted','rerouted'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
    const db = getDb();
    if (db) await db.collection('shipments').doc(req.params.id).update({ status, updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Status updated to: ' + status });
  } catch(err) { next(err); }
});

module.exports = router;