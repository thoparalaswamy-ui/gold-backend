const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 📁 Load saved city factors
let cityFactors = {
  hyderabad: 1.0,
  vijayawada: 1.0,
  chennai: 1.0,
  mumbai: 1.0,
  delhi: 1.0,
  bangalore: 1.0
};

try {
  const data = fs.readFileSync('cityFactors.json');
  cityFactors = JSON.parse(data);
} catch (e) {
  console.log("No saved factors found, using default");
}

// ⚡ BASE GOLD PRICE (LIVE)
async function getBaseGoldPrice() {
  const [goldRes, forexRes] = await Promise.all([
    axios.get('https://api.gold-api.com/price/XAU', { timeout: 5000 }),
    axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 })
  ]);

  const ounceUSD = goldRes.data.price;
  const usdToInr = forexRes.data.rates.INR;

  let priceINR = ounceUSD * usdToInr;
  let pricePerGram = priceINR / 31.1;

  return {
    base10g: pricePerGram * 10,
    ounceUSD
  };
}

// 🧠 MAIN PRICE FUNCTION
async function getGoldPrice(city) {
  const { base10g, ounceUSD } = await getBaseGoldPrice();

  let gold24 = base10g;

  // 🔥 Smart base calibration
  const baseFactor = 1.185;
  const microAdjust = (ounceUSD % 20) / 1000;
  const dynamicFactor = baseFactor + microAdjust;

  gold24 = gold24 * dynamicFactor;

  // 📍 Apply learned city factor
  const factor = cityFactors[city] || 1;
  gold24 = gold24 * factor;

  gold24 = Math.round(gold24);
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🤖 AUTO CALIBRATION (RUN DAILY)
async function autoCalibrate() {
  console.log("🔄 Running auto calibration...");

  try {
    const { base10g } = await getBaseGoldPrice();

    // 👉 TEMP: Replace with real data source later
    const realMarketPrice = 149000;

    const calculated = base10g * 1.185;

    const newFactor = realMarketPrice / calculated;

    // update all cities (can customize later per city)
    Object.keys(cityFactors).forEach(city => {
      cityFactors[city] = newFactor;
    });

    // 💾 Save to file
    fs.writeFileSync('cityFactors.json', JSON.stringify(cityFactors, null, 2));

    console.log("✅ Updated city factors:", cityFactors);

  } catch (err) {
    console.log("❌ Calibration failed:", err.message);
  }
}

// ⏱ Run once at startup
autoCalibrate();

// ⏱ Run every 24 hours
setInterval(autoCalibrate, 24 * 60 * 60 * 1000);

// 🌍 API ROUTE
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  try {
    const data = await getGoldPrice(city);

    return res.json({
      city,
      ...data,
      source: "auto_calibrated_api",
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
  res.send('🤖 Auto-Calibrated Gold API Running');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});