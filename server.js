const express = require('express');
const path = require('path');

const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC2UsOg2uMCEwGfpyCtvBhocZ2o5fDwG5w';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/gemini', async (req, res) => {
  const apiKey = (req.body.apiKey || DEFAULT_GEMINI_API_KEY).trim();
  const content = req.body.content;
  const maxTokens = req.body.maxTokens || 1200;

  if (!content || !content.toString().trim()) {
    return res.status(400).json({ error: 'Missing content for Gemini request.' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing API key (server-side).' });
  }

  try {
    const response = await fetch('https://api.labs.google.com/v1alpha2/models/gemini-1.5-pro:predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        instances: [{ content }],
        parameters: {
          temperature: 0.0,
          max_output_tokens: Math.min(maxTokens, 3200)
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || JSON.stringify(data) });
    }

    let text = '';
    if (data.predictions && Array.isArray(data.predictions)) {
      text = data.predictions.map(p => p.content || '').join('\n');
    } else if (data.output && Array.isArray(data.output)) {
      text = data.output.map(o => o.content || o.text || '').join('\n');
    } else if (data.candidates && Array.isArray(data.candidates)) {
      text = data.candidates.map(c => c.content || c.text || '').join('\n');
    } else {
      text = JSON.stringify(data);
    }

    return res.json({ text, raw: data });
  } catch (err) {
    return res.status(500).json({ error: 'Gemini proxy failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (serving index.html + /api/gemini)`);
});
