export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { image, mediaType } = req.body;

  if (!image) {
    return res.status(400).json({ items: [], error: 'No image provided' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: image
              }
            },
            {
              type: 'text',
              text: `You are a fashion expert analyzing an outfit photo. Identify every clothing item and accessory visible on the person in this image.

Return a JSON array only — no markdown, no backticks, no explanation. Each object must have:
- "name": full descriptive name like "Light blue satin puff sleeve top"
- "color": hex color e.g. "#a8c4e0"
- "category": exactly one of: Tops, Bottoms, Shoes, Outerwear, Bags, Accessories
- "note": one short style detail e.g. "Square neckline, peplum hem"

You must identify at least 1 item if a person is visible. Be thorough — include bags, jewelry, shoes if visible.

Only return [] if there is literally no person in the image.

Return the JSON array now:`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(200).json({ items: [], error: `API error ${response.status}` });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '[]';
    console.log('Raw response:', raw.substring(0, 200));

    let items = [];
    try {
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      // extract array if wrapped in other text
      const match = cleaned.match(/\[[\s\S]*\]/);
      items = match ? JSON.parse(match[0]) : JSON.parse(cleaned);
    } catch (e) {
      console.error('Parse error:', e.message, 'Raw:', raw);
      items = [];
    }

    return res.status(200).json({ items });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(200).json({ items: [], error: err.message });
  }
}
