const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 📍 City adjustment (light variation)
const cityFactors = {
  hyderabad: 1.00,
  vijayawada: 0.998,
  chennai: 1.01,
  mumbai: 1.015,
  delhi: 1.01,
  bangalore: 1.012
};

// ⚡ FAST GOLD CALCULATION (NO SCRAPING)
async function getGoldPrice(city) {
  const res = await axios.get('https://api.gold-api.com/price/XAU', {
    timeout: 5000
  });

  const ounceUSD = res.data.price;

  const usdToInr = 83;

  // Clean conversion (NO overpricing)
  let priceINR = ounceUSD * usdToInr;

  let pricePerGram = priceINR / 31.1;

  let gold24 = pricePerGram * 10;

  // India realistic adjustment
  gold24 = gold24 * 1.12;

  // City variation
  const factor = cityFactors[city] || 1;
  gold24 = gold24 * factor;

  gold24 = Math.round(gold24);
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
      source: "fast_live_api",
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
  res.send('⚡ Ultra Fast Gold API Running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});