export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey, content, maxTokens = 1200 } = req.body || {};
    const keyToUse = (apiKey || process.env.GEMINI_API_KEY || 'AIzaSyC2UsOg2uMCEwGfpyCtvBhocZ2o5fDwG5w').trim();

    if (!keyToUse) {
      return res.status(400).json({ error: 'Missing Gemini API key' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Missing content' });
    }

    const apiResponse = await fetch('https://api.labs.google.com/v1alpha2/models/gemini-1.5-pro:predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + keyToUse
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
      return res.status(apiResponse.status).json({ error: data.error?.message || JSON.stringify(data) });
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

    return res.status(200).json({ text, raw: data });
  } catch (error) {
    return res.status(500).json({ error: 'Proxy fallback failed: ' + (error.message || error) });
  }
}
