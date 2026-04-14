export default async function handler(req, res) {
  try {
    console.log("🔥 API HIT");

    const isForce = req.query.force === "true";

    const baseUrl =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // 🔥 ALWAYS BYPASS CACHE FOR FORCE
    const url = `${baseUrl}?t=${Date.now()}`;

    const response = await fetch(url, {
      cache: "no-store", // 🔥 CRITICAL
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await response.json();

    // 🔥 DISABLE VERCEL CACHE
    res.setHeader(
      "Cache-Control",
      isForce
        ? "no-store, no-cache, must-revalidate"
        : "public, max-age=60, stale-while-revalidate=120"
    );

    return res.status(200).json(data);

  } catch (error) {
    console.log("❌ ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}