const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Root route
app.get('/', (req, res) => {
  res.send('Gold API is running 🚀');
});

// Gold price API
app.get('/gold', async (req, res) => {
  try {
    // Fetch international gold price (USD per ounce)
    const response = await axios.get('https://api.gold-api.com/price/XAU');

    const pricePerOunceUSD = response.data.price;

    // USD → INR
    const usdToInr = 83;

    // Add Indian market premium (import duty + GST + margin)
    const premium = 1.12;

    const priceINR = pricePerOunceUSD * usdToInr * premium;

    // Convert ounce → gram (1 ounce = 31.1 grams)
    const pricePerGram = priceINR / 31.1;

    // Final realistic Indian prices (per 10g)
    const gold24 = Math.round(pricePerGram * 10);
    const gold22 = Math.round(gold24 * 0.916);

    res.json({
      gold24,
      gold22,
      currency: "INR",
      unit: "10g",
      source: "api_gold_adjusted",
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

// Server start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});