export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { image, mediaType } = req.body;

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image }
            },
            {
              type: 'text',
              text: `You are a fashion AI analyzing an outfit photo. Identify every visible clothing item and accessory being worn. For each item return: name, color, category (Tops/Bottoms/Shoes/Outerwear/Bags/Accessories), and a short style note. Respond ONLY with a JSON array like this, no other text:
[
  {"name": "Black wide-leg trousers", "color": "#1a1a1a", "category": "Bottoms", "note": "Tailored silhouette, high-waist"},
  {"name": "Cream fitted blazer", "color": "#e8ddd0", "category": "Tops", "note": "Single-breasted, structured"}
]
If this is not a photo of a person or outfit, return an empty array [].`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    try {
      const items = JSON.parse(text.replace(/```json|```/g, '').trim());
      res.status(200).json({ items });
    } catch {
      res.status(200).json({ items: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
