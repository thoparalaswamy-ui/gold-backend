import admin from "firebase-admin";

// 🔥 INIT FIREBASE (safe init)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")
      ),
    });
  } catch (e) {
    console.log("⚠️ Firebase not configured");
  }
}

export default async function handler(req, res) {
  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // 🔥 TIMEOUT PROTECTION (5 sec)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store", // always fetch fresh from GitHub
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("GitHub fetch failed");
    }

    const data = await response.json();

    // ✅ Ensure updatedAt exists
    if (!data.updatedAt) {
      data.updatedAt = new Date().toISOString();
    }

    // 🔔 FIREBASE NOTIFICATION (ONLY IF CONFIGURED)
    try {
      if (admin.apps.length) {
        const db = admin.firestore();
        const docRef = db.collection("meta").doc("gold");

        const doc = await docRef.get();
        const oldUpdatedAt = doc.exists ? doc.data().updatedAt : null;

        // 🔥 ONLY SEND IF DATA CHANGED
        if (oldUpdatedAt !== data.updatedAt) {
          await docRef.set({ updatedAt: data.updatedAt });

          await admin.messaging().send({
            topic: "gold",
            notification: {
              title: "Gold Price Updated 💰",
              body: "Tap to check latest prices",
            },
          });

          console.log("✅ Notification sent");
        }
      }
    } catch (e) {
      console.log("⚠️ Firebase skipped:", e.message);
    }

    // 🚀 EDGE CACHE (OPTIMAL FOR YOUR USE CASE)
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    // ✅ JSON response
    res.setHeader("Content-Type", "application/json");

    res.status(200).json(data);

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch fresh data",
    });
  }
}