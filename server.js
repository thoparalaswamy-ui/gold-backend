const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const defaultCity = "hyderabad";

// 🔁 Proxy fetch (stable)
async function fetchHTML(url) {
  try {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await axios.get(proxy);
    return res.data;
  } catch (e) {
    throw new Error("Proxy failed");
  }
}

// 🟡 Scraper (REAL Indian data)
async function scrapeGold(city) {
  try {
    const url = `https://www.goodreturns.in/gold-rates/${city}.html`;

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    let gold24 = 0;
    let gold22 = 0;

    $("table tr").each((i, el) => {
      const text = $(el).text();

      if (text.includes("24 Carat") && text.includes("10 gram")) {
        const match = text.match(/([0-9,]+)/);
        if (match) gold24 = Number(match[1].replace(/,/g, ""));
      }

      if (text.includes("22 Carat") && text.includes("10 gram")) {
        const match = text.match(/([0-9,]+)/);
        if (match) gold22 = Number(match[1].replace(/,/g, ""));
      }
    });

    if (!gold24 || !gold22) throw new Error("Parsing failed");

    return { gold24, gold22 };

  } catch (err) {
    throw new Error("Scraping failed");
  }
}

// 🔄 Fallback API (always works)
async function fallbackGold() {
  const res = await axios.get('https://api.gold-api.com/price/XAU');
  const ounceUSD = res.data.price;

  const usdToInr = 83;
  const premium = 2.35;

  const priceINR = ounceUSD * usdToInr * premium;
  const gram = priceINR / 31.1;

  const gold24 = Math.round(gram * 10);
  const gold22 = Math.round(gold24 * 0.916);

  return { gold24, gold22 };
}

// 🌍 Main API
app.get('/gold', async (req, res) => {
  const city = (req.query.city || defaultCity).toLowerCase();

  try {
    // 🔥 Try scraping first
    const data = await scrapeGold(city);

    return res.json({
      city,
      ...data,
      source: "scraped_live",
      timestamp: new Date()
    });

  } catch (err) {
    console.log("Scrape failed → using fallback");

    // 🔁 fallback
    const fallback = await fallbackGold();

    return res.json({
      city,
      ...fallback,
      source: "fallback_api",
      timestamp: new Date()
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('Gold API Running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));