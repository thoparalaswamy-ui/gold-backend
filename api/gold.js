import admin from "firebase-admin";

// 🔥 INIT FIREBASE (FINAL FIX)
let firebaseReady = false;

try {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      console.log("❌ ENV missing");
    } else {
      const serviceAccount = JSON.parse(raw);

      // ✅ CRITICAL FIX (newline issue)
      serviceAccount.private_key =
        serviceAccount.private_key.replace(/\\n/g, "\n");

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      firebaseReady = true;
      console.log("🔥 Firebase initialized SUCCESS");
    }
  } else {
    firebaseReady = true;
    console.log("⚡ Firebase already initialized");
  }
} catch (e) {
  console.log("❌ Firebase init error:", e.message);
}

// 🚀 MAIN API
export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // ⏱ Timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("GitHub fetch failed");
    }

    const data = await response.json();

    // 🕒 Ensure updatedAt exists
    if (!data.updatedAt) {
      data.updatedAt = new Date().toISOString();
    }

    console.log("📊 UpdatedAt:", data.updatedAt);

    // 🔔 FIREBASE TEST
    try {
      if (firebaseReady && admin.apps.length) {
        console.log("🚀 Firebase ACTIVE");

        await admin.messaging().send({
          topic: "gold",
          notification: {
            title: "Gold Price Updated 💰",
            body: "Tap to check latest prices",
          },
        });

        console.log("✅ Notification sent");
      } else {
        console.log("❌ Firebase NOT ACTIVE");
      }
    } catch (e) {
      console.log("❌ Firebase runtime error:", e.message);
    }

    // 🚫 NO CACHE (important)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json(data);
  } catch (error) {
    console.log("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
    });
  }
}