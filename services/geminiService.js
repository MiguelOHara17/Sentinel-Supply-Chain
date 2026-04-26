const https = require('https');
require('dotenv').config();

const SYSTEM_PROMPT = `You are Sentinel AI — a senior supply chain disruption analyst.
Respond with:
1. IMPACT ASSESSMENT (quantified, 2-3 lines)
2. IMMEDIATE ACTIONS (3-5 numbered steps)
3. REROUTING RECOMMENDATION (specific corridors)
4. RISK TIMELINE (24h / 72h / 7-day outlook)
Be precise and actionable. Under 400 words.`;

async function analyzeDisruption(prompt, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\nDISRUPTION:\n' + prompt }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 550 },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
     path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('Empty Gemini response'));
          resolve(text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

module.exports = { analyzeDisruption };