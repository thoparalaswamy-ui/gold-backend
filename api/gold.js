export default async function handler(req, res) {
  try {
    // 🔥 EDGE CACHE (1 HOUR CACHE + FAST RESPONSE)
    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate"
    );

    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // 🔥 TIMEOUT PROTECTION (5 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("GitHub fetch failed");
    }

    const data = await response.json();

    // ✅ SUCCESS RESPONSE
    res.status(200).json(data);

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    // 🔥 FALLBACK RESPONSE (IMPORTANT FOR STABILITY)
    res.status(200).json({
      success: false,
      message: "Using cached/stale data",
    });
  }
}