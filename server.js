const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ LIVE JSON SOURCE (gold-json repo)
const DATA_URL = "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

// Home route
app.get("/", (req, res) => {
  res.send("Gold API Running 🚀");
});

// Get all data
app.get("/gold", async (req, res) => {
  try {
    const response = await fetch(DATA_URL);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});