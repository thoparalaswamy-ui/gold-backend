const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// 📍 City fallback
const defaultCity = "hyderabad";

// 🌐 Proxy function (anti-block)
async function fetchWithProxy(url) {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await axios.get(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    return response.data;
  } catch (err) {
    throw new Error("Proxy fetch failed");
  }
}

// 🟡 Scrape function
async function scrapeGold(city) {
  try {
    const url = `https://www.goodreturns.in/gold-rates/${city}.html`;

    const html = await fetchWithProxy(url);
    const $ = cheerio.load(html);

    let gold24 = 0;
    let gold22 = 0;

    $("table tr").each((i, el) => {
      const text = $(el).text();

      if (text.includes("24K")) {
        const match = text.match(/([0-9,]+)/);
        if (match) gold24 = Number(match[1].replace(/,/g, ""));
      }

      if (text.includes("22K")) {
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

// 🌍 API
app.get('/gold', async (req, res) => {
  try {
    const city = (req.query.city || defaultCity).toLowerCase();

    const data = await scrapeGold(city);

    res.json({
      city,
      ...data,
      source: "scraped_live",
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: "Unable to fetch live gold price",
      details: error.message
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('Gold Scraper API Running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));