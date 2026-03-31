const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// 🏙️ City price adjustment factors
const cityFactors = {
  hyderabad: 1.00,
  vijayawada: 1.01,
  chennai: 1.02,
  mumbai: 1.015,
  delhi: 1.01,
  bangalore: 1.02,
};

// Root route
app.get('/', (req, res) => {
  res.send('Gold API is running 🚀');
});

// Gold API with location
app.get('/gold', async (req, res) => {
  try {
    const city = (req.query.city || 'hyderabad').toLowerCase();

    // Get factor
    const factor = cityFactors[city] || 1.00;

    // Global gold price
    const response = await axios.get('https://api.gold-api.com/price/XAU');
    const ounceUSD = response.data.price;

    // USD → INR
    const usdToInr = 83;

    // India premium
    const premium = 1.12;

    let priceINR = ounceUSD * usdToInr * premium;

    // Apply city factor
    priceINR = priceINR * factor;

    // Convert to gram
    const gram = priceINR / 31.1;

    // Final prices (per 10g)
    const gold24 = Math.round(gram * 10);
    const gold22 = Math.round(gold24 * 0.916);

    res.json({
      city,
      gold24,
      gold22,
      currency: "INR",
      unit: "10g",
      source: "location_based",
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch gold price",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});