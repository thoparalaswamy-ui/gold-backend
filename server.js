const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// CACHE
let cache = null;
let lastFetch = 0;
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// FETCH GOLD PRICE (WORKING SOURCE)
async function fetchGold() {
  try {
    // Gold price (USD per ounce)
    const goldRes = await axios.get(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"
    );

    // USD → INR
    const currencyRes = await axios.get(
      "https://open.er-api.com/v6/latest/USD"
    );

    const ounce =
      goldRes.data.chart.result[0].meta.regularMarketPrice;

    const usdInr = currencyRes.data.rates.INR;

    const gram = ((ounce / 31.1035) * usdInr) * 0.75;

    return {
      gold24: Math.round(gram),
      gold22: Math.round(gram * 0.916),
    };
  } catch (e) {
    console.log("Fetch error:", e.message);
    throw new Error("API failed");
  }
}

// API
app.get("/gold", async (req, res) => {
  try {
    // Use cache
    if (cache && Date.now() - lastFetch < CACHE_TIME) {
      return res.json({
        ...cache,
        source: "cache",
      });
    }

    const data = await fetchGold();

    cache = data;
    lastFetch = Date.now();

    res.json({
      ...data,
      source: "live",
    });
  } catch (e) {
    if (cache) {
      return res.json({
        ...cache,
        source: "fallback-cache",
      });
    }

    res.status(500).json({
      error: "Unable to fetch gold price",
    });
  }
});

// START SERVER
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});