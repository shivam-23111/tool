export default async function handler(req, res) {
  // Strict security: only accept POST, require API key from environment
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Do NOT accept API key in request body for security
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured in environment');
    return res.status(500).json({ error: 'API not configured' });
  }

  try {
    const { content, maxTokens = 1200 } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Missing content' });
    }

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: 'API call failed' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch (error) {
    console.error('OpenAI API proxy error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
