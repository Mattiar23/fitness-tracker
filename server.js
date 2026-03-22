const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/food', async (req, res) => {
  const { name, qty, unit } = req.body;
  if (!name || !qty) return res.status(400).json({ error: 'Dati mancanti' });

  const unitDesc = unit === 'g' ? `${qty}g` : `${qty} ${qty == 1 ? 'pezzo' : 'pezzi'}`;
  const prompt = `Sei un nutrizionista. Per "${name}" (${unitDesc}), rispondi SOLO con JSON valido, zero testo extra, zero markdown, zero backtick. Formato:
{"name":"nome normalizzato","qty_desc":"${unitDesc}","kcal":intero,"protein":decimale1,"carbs":decimale1,"fat":decimale1}
Valori per le quantità indicate. Se è cibo cotto, considera cotto. Se sono pezzi, stima il peso medio tipico del pezzo.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    const raw = data.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Errore AI' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server su porta ${PORT}`));
