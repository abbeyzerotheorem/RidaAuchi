// geocode-proxy.js
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'zerotheorem01@gmail.com';

app.get('/geocode', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    const r = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q, format: 'json', limit: 1 },
      headers: {
        'User-Agent': `RidaAuchi/1.0 (${CONTACT_EMAIL})`,
        'From': CONTACT_EMAIL,
        'Accept-Language': 'en'
      },
      timeout: 10000
    });
    res.json(r.data);
  } catch (err) {
    console.error('proxy geocode error:', err?.response?.status, err?.response?.data || err.message);
    res.status(500).json({ error: 'geocode_failed' });
  }
});

app.listen(PORT, () => console.log(`Geocode proxy listening ${PORT}`));