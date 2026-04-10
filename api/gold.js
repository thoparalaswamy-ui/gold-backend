export default async function handler(req, res) {
  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // 🔥 TIMEOUT PROTECTION (5 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store", // IMPORTANT for Vercel edge caching
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("GitHub fetch failed");
    }

    const data = await response.json();

    // 🚀 EDGE CACHE (CRITICAL FOR 1M USERS)
    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    // ✅ Ensure proper response type
    res.setHeader("Content-Type", "application/json");

    // ✅ SUCCESS RESPONSE
    res.status(200).json(data);

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    // 🔥 SAFE FALLBACK (keeps app stable)
    res.status(500).json({
      success: false,
      message: "Failed to fetch fresh data",
    });
  }
}