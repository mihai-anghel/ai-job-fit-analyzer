require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', ORIGIN);
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Generic OpenAI proxy endpoint (simple forwarding)
app.post('/api/openai', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body)
    });
    const json = await response.json();
    res.status(response.status).json(json);
  } catch (err) {
    console.error('OpenAI proxy error', err);
    res.status(502).json({ error: 'Failed to reach OpenAI' });
  }
});

// Generic Anthropic proxy endpoint (example)
app.post('/api/anthropic', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(req.body)
    });
    const json = await response.json();
    res.status(response.status).json(json);
  } catch (err) {
    console.error('Anthropic proxy error', err);
    res.status(502).json({ error: 'Failed to reach Anthropic' });
  }
});

app.listen(PORT, () => {
  console.log(`AI proxy running on port ${PORT}`);
});
