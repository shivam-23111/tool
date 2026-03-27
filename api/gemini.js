export default async function handler(req, res) {
  // Strict security: only accept POST, require API key from environment
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Do NOT accept API key in request body for security
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Log to console for debugging but don't expose details to client
    console.error('GEMINI_API_KEY not configured in environment');
    return res.status(500).json({ error: 'API not configured' });
  }

  try {
    const { content, maxTokens = 1200 } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Missing content' });
    }

    const apiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-pro:predict', {
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

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: 'API call failed' });
    }

    let text = '';
    if (Array.isArray(data.predictions)) {
      text = data.predictions.map(p => p.content || '').join('\n');
    } else if (Array.isArray(data.output)) {
      text = data.output.map(o => o.content || o.text || '').join('\n');
    } else if (Array.isArray(data.candidates)) {
      text = data.candidates.map(c => c.content || c.text || '').join('\n');
    } else {
      text = JSON.stringify(data);
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Gemini API proxy error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
