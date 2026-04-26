const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

function initFirebase() {
  if (admin.apps.length) return admin.app();
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    db = admin.firestore();
    console.log('[Firebase] Connected to Firestore');
  } catch (err) {
    console.warn('[Firebase] Not configured — running in mock mode:', err.message);
  }
  return admin.apps[0];
}

function getDb() { return db; }

module.exports = { initFirebase, getDb };