const express  = require('express');
const router   = express.Router();
const { getDb }     = require('../config/firebase');
const { pushEvent } = require('../services/wsSimulator');
const mockData      = require('../data/disruptions.json');

router.get('/', async (req, res, next) => {
  try {
    let data = mockData;
    const db = getDb();
    if (db) {
      const snap = await db.collection('disruptions').orderBy('timestamp','desc').limit(50).get();
      if (!snap.empty) data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    res.json({ success: true, active: data.filter(d=>!d.resolved).length, disruptions: data });
  } catch(err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, severity, cause, body, affectedShipments = [] } = req.body;
    if (!title || !severity) return res.status(400).json({ success: false, error: 'title and severity required' });
    const d = { id:'D-'+Date.now(), title, severity, cause, body, affectedShipments, resolved:false, timestamp:new Date().toISOString() };
    const db = getDb();
    if (db) await db.collection('disruptions').doc(d.id).set(d);
    pushEvent('DISRUPTION_DETECTED', { disruption: d });
    res.status(201).json({ success: true, disruption: d });
  } catch(err) { next(err); }
});

router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const db = getDb();
    if (db) await db.collection('disruptions').doc(req.params.id).update({ resolved:true, resolvedAt:new Date().toISOString() });
    pushEvent('ALERT_CLEARED', { disruptionId: req.params.id });
    res.json({ success: true, message: 'Disruption resolved' });
  } catch(err) { next(err); }
});

module.exports = router;