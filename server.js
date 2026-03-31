const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 🟡 Scrape function (IMPROVED)
async function scrapeGold(city) {
  const url = `https://www.goodreturns.in/gold-rates/${city}.html`;

  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await axios.get(proxy, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const html = res.data;

  // 🔥 Strong regex extraction
  const match24 = html.match(/24 Carat Gold Rate.*?([0-9,]{5,})/s);
  const match22 = html.match(/22 Carat Gold Rate.*?([0-9,]{5,})/s);

  if (!match24 || !match22) {
    throw new Error("Parsing failed");
  }

  const gold24 = Number(match24[1].replace(/,/g, ""));
  const gold22 = Number(match22[1].replace(/,/g, ""));

  return { gold24, gold22 };
}

// 🔄 Fallback (CORRECTED — NO OVERPRICING)
async function fallbackGold() {
  const res = await axios.get('https://api.gold-api.com/price/XAU');

  const ounceUSD = res.data.price;

  const usdToInr = 83;

  // USD → INR
  let priceINR = ounceUSD * usdToInr;

  // ounce → gram
  let pricePerGram = priceINR / 31.1;

  // per 10g
  let gold24 = pricePerGram * 10;

  // India adjustment (controlled)
  gold24 = gold24 * 1.12;

  gold24 = Math.round(gold24);
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🌍 MAIN API
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  // 🔁 Retry scraping (3 times)
  for (let i = 0; i < 3; i++) {
    try {
      const data = await scrapeGold(city);

      return res.json({
        city,
        ...data,
        source: "scraped_live",
        timestamp: new Date()
      });

    } catch (err) {
      console.log(`❌ Scrape retry ${i + 1} failed`);
    }
  }

  // 🔄 Fallback (dynamic)
  try {
    const fallback = await fallbackGold();

    return res.json({
      city,
      ...fallback,
      source: "live_api",
      timestamp: new Date()
    });

  } catch (error) {
    return res.status(500).json({
      error: "All sources failed",
      details: error.message
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('Gold API Running 🚀');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});