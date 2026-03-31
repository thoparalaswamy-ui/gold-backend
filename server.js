const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// 📍 City variation
const cityFactors = {
  hyderabad: 1.00,
  vijayawada: 0.995,
  chennai: 1.01,
  mumbai: 1.02,
  delhi: 1.01,
  bangalore: 1.015,
};

app.get('/', (req, res) => {
  res.send('Gold API running 🚀');
});

app.get('/gold', async (req, res) => {
  try {
    const city = (req.query.city || 'hyderabad').toLowerCase();
    const factor = cityFactors[city] || 1.0;

    // 🟡 MCX gold price (simulate via reliable INR gold API)
    const response = await axios.get(
      'https://api.metals.live/v1/spot/gold'
    );

    // Format: [ [ "gold", price_per_ounce ] ]
    const ounceUSD = response.data[0][1];

    // USD → INR
    const usdToInr = 83;

    let priceINR = ounceUSD * usdToInr;

    // Ounce → gram
    let pricePerGram = priceINR / 31.1;

    // Convert to 10g
    let gold24 = pricePerGram * 10;

    // Add GST (3%) + margin (~5%)
    gold24 = gold24 * 1.08;

    // Apply city factor
    gold24 = gold24 * factor;

    gold24 = Math.round(gold24);
    const gold22 = Math.round(gold24 * 0.916);

    res.json({
      city,
      gold24,
      gold22,
      source: "mcx_based",
      currency: "INR",
      unit: "10g",
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch Indian gold price",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});