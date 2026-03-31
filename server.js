const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 📍 City adjustment factors (very small variations)
const cityFactors = {
  hyderabad: 1.000,
  vijayawada: 0.998,
  chennai: 1.005,
  mumbai: 1.010,
  delhi: 1.006,
  bangalore: 1.008
};

// ⚡ MAIN GOLD ENGINE
async function getGoldPrice(city) {
  const res = await axios.get('https://api.gold-api.com/price/XAU', {
    timeout: 5000
  });

  const ounceUSD = res.data.price;

  const usdToInr = 83;

  // Step 1: USD → INR
  let priceINR = ounceUSD * usdToInr;

  // Step 2: ounce → gram
  let pricePerGram = priceINR / 31.1;

  // Step 3: per 10 grams
  let gold24 = pricePerGram * 10;

  // 🔥 SMART DYNAMIC CALIBRATION
  const baseFactor = 1.17;
  const microAdjust = (ounceUSD % 20) / 1000;
  const dynamicFactor = baseFactor + microAdjust;

  gold24 = gold24 * dynamicFactor;

  // 📍 Apply city variation
  const factor = cityFactors[city] || 1;
  gold24 = gold24 * factor;

  gold24 = Math.round(gold24);

  // Step 4: 22K
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🌍 API
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  try {
    const data = await getGoldPrice(city);

    return res.json({
      city,
      ...data,
      source: "smart_live_api",
      timestamp: new Date()
    });

  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch gold price",
      details: error.message
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('🔥 Smart Gold API Running');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});