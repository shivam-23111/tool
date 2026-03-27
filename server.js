const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/gemini', async (req, res) => {
  // Strict security: API key must come from environment only, never from request
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set in environment');
    return res.status(500).json({ error: 'API not configured' });
  }

  const content = req.body?.content;
  const maxTokens = req.body?.maxTokens || 1200;

  if (!content || !content.toString().trim()) {
    return res.status(400).json({ error: 'Missing content for OpenAI request.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content }],
        temperature: 0.0,
        max_tokens: Math.min(maxTokens, 4096)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'API call failed' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ text });
  } catch (err) {
    console.error('OpenAI proxy error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

