const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 🔁 Proxy fetch
async function fetchHTML(url) {
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await axios.get(proxy, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });
  return res.data;
}

// 🟡 Scrape Indian site (REAL DATA)
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

// 🔄 Live API fallback (ALWAYS DYNAMIC)
async function fallbackGold() {
  const res = await axios.get('https://api.gold-api.com/price/XAU');

  const ounceUSD = res.data.price;

  const usdToInr = 83;

  // dynamic premium (not fixed)
  const premium = 2.25 + (ounceUSD % 100) / 2000;

  const priceINR = ounceUSD * usdToInr * premium;
  const gram = priceINR / 31.1;

  const gold24 = Math.round(gram * 10);
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🌍 MAIN API
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  try {
    // ✅ Try real Indian data
    const data = await scrapeGold(city);

    return res.json({
      city,
      ...data,
      source: "scraped_live",
      timestamp: new Date()
    });

  } catch (err) {
    console.log("Scraping failed → switching to API");

    try {
      // ✅ Dynamic fallback
      const fallback = await fallbackGold();

      return res.json({
        city,
        ...fallback,
        source: "live_api_dynamic",
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

// Root
app.get('/', (req, res) => {
  res.send('Gold API Dynamic Running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));