const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Gold API is running 🚀');
});

app.get('/gold', async (req, res) => {
  try {
    // Primary API (Gold price USD per ounce)
    const response = await axios.get('https://api.gold-api.com/price/XAU');

    const pricePerOunceUSD = response.data.price;

    // Convert USD → INR (approx)
    const usdToInr = 83;

    const priceINR = pricePerOunceUSD * usdToInr;

    // Convert ounce → gram (1 ounce = 31.1 grams)
    const pricePerGram = priceINR / 31.1;

    // Calculate 24k and 22k
    const gold24 = Math.round(pricePerGram * 10); // per 10g
    const gold22 = Math.round(gold24 * 0.916);

    res.json({
      gold24,
      gold22,
      source: "api_gold"
    });

  } catch (error) {
    res.status(500).json({
      error: "Gold API failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));