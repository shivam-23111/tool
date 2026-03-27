const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/gemini', async (req, res) => {
  // Strict security: API key must come from environment only, never from request
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set in environment');
    return res.status(500).json({ error: 'API not configured' });
  }

  const content = req.body?.content;
  const maxTokens = req.body?.maxTokens || 1200;

  if (!content || !content.toString().trim()) {
    return res.status(400).json({ error: 'Missing content for Gemini request.' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-pro:predict', {
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
      return res.status(response.status).json({ error: 'API call failed' });
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

    return res.json({ text });
  } catch (err) {
    console.error('Gemini proxy error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

