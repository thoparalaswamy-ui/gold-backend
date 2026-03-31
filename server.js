const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// 🌍 City price adjustment factors
const cityFactors = {
  hyderabad: 1.00,
  vijayawada: 0.995,
  chennai: 1.01,
  mumbai: 1.02,
  delhi: 1.01,
  bangalore: 1.015,
};

// Root route
app.get('/', (req, res) => {
  res.send('Gold API is running 🚀');
});

// 🟡 Gold API
app.get('/gold', async (req, res) => {
  try {
    const city = (req.query.city || 'hyderabad').toLowerCase();
    const factor = cityFactors[city] || 1.00;

    // 🌐 Fetch global gold price (USD per ounce)
    const response = await axios.get('https://api.gold-api.com/price/XAU');
    const ounceUSD = response.data.price;

    // 💱 USD → INR
    const usdToInr = 83;

    // 🔥 FINAL calibrated premium (India realistic)
    const premium = 2.35;

    // 🧮 Base conversion
    let priceINR = ounceUSD * usdToInr * premium;

    // 📍 Apply city variation
    priceINR = priceINR * factor;

    // ⚖️ Ounce → Gram (1 ounce = 31.1g)
    const pricePerGram = priceINR / 31.1;

    // 🪙 Final price per 10 grams
    const gold24 = Math.round(pricePerGram * 10);
    const gold22 = Math.round(gold24 * 0.916);

    res.json({
      city,
      gold24,
      gold22,
      currency: "INR",
      unit: "10g",
      source: "location_calibrated",
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Error:", error.message);

    res.status(500).json({
      error: "Unable to fetch gold price",
      details: error.message
    });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});