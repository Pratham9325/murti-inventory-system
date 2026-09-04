import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    db = admin.firestore();
  }
} catch (e) { console.error('Firebase Admin setup:', e.message); }

app.get('/api/health', (_req, res) => res.json({ ok: true, firebase: !!db }));
app.get('/api/murtis', async (_req, res) => {
  if (!db) return res.status(503).json({ error: 'Firebase Admin is not configured' });
  try {
    const snap = await db.collection('murtis').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/murtis', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Firebase Admin is not configured' });
  const { number, name = '', location } = req.body || {};
  if (!String(number || '').trim() || !String(location || '').trim()) return res.status(400).json({ error: 'number and location are required' });
  try {
    const ref = await db.collection('murtis').add({ number: String(number).trim(), name: String(name).trim(), location: String(location).trim(), createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.status(201).json({ id: ref.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/murtis/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Firebase Admin is not configured' });
  try { await db.collection('murtis').doc(req.params.id).delete(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on ${port}`));
