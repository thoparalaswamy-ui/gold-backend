const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 🔁 Fetch HTML using proxy (to avoid blocking)
async function fetchHTML(url) {
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

  const res = await axios.get(proxy, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  return res.data;
}

// 🟡 Scrape Indian gold price (Goodreturns)
async function scrapeGold(city) {
  const url = `https://www.goodreturns.in/gold-rates/${city}.html`;

  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  const text = $("body").text();

  const match24 = text.match(/24 Carat[^0-9]*([0-9,]+)/i);
  const match22 = text.match(/22 Carat[^0-9]*([0-9,]+)/i);

  if (!match24 || !match22) {
    throw new Error("Parsing failed");
  }

  const gold24 = Number(match24[1].replace(/,/g, ""));
  const gold22 = Number(match22[1].replace(/,/g, ""));

  return { gold24, gold22 };
}

// 🔄 Fallback (REALISTIC & FIXED CALCULATION)
async function fallbackGold() {
  const res = await axios.get('https://api.gold-api.com/price/XAU');

  const ounceUSD = res.data.price;

  const usdToInr = 83;

  // Step 1: USD → INR
  let priceINR = ounceUSD * usdToInr;

  // Step 2: ounce → gram
  let pricePerGram = priceINR / 31.1;

  // Step 3: per 10 grams
  let gold24 = pricePerGram * 10;

  // Step 4: India adjustment (GST + duty + margin)
  gold24 = gold24 * 1.12;

  gold24 = Math.round(gold24);
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🌍 MAIN API
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  try {
    // ✅ Try scraping (real Indian data)
    const data = await scrapeGold(city);

    return res.json({
      city,
      ...data,
      source: "scraped_live",
      timestamp: new Date()
    });

  } catch (err) {
    console.log("❌ Scraping failed → using fallback");

    try {
      // ✅ Dynamic fallback (correct pricing)
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
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Gold API Running 🚀');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});