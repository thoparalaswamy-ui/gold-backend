import admin from "firebase-admin";

// 🔥 INIT FIREBASE (SAFE)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
    );

    if (serviceAccount.project_id) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("🔥 Firebase initialized");
    } else {
      console.log("⚠️ Firebase config missing");
    }
  } catch (e) {
    console.log("❌ Firebase init error:", e.message);
  }
}

export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // ⏱ TIMEOUT CONTROL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // 🌐 FETCH DATA (NO CACHE)
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

    // 🔔 FIREBASE NOTIFICATION
    try {
      if (admin.apps.length) {
        const db = admin.firestore();
        const docRef = db.collection("meta").doc("gold");

        const doc = await docRef.get();
        const oldUpdatedAt = doc.exists ? doc.data().updatedAt : null;

        console.log("🧠 Old:", oldUpdatedAt);
        console.log("🧠 New:", data.updatedAt);

        // ✅ ONLY SEND IF DATA CHANGED
        if (oldUpdatedAt !== data.updatedAt) {
          console.log("🚀 New data detected → sending notification");

          await docRef.set({ updatedAt: data.updatedAt });

          await admin.messaging().send({
            topic: "gold",
            notification: {
              title: "Gold Price Updated 💰",
              body: "Tap to check latest prices",
            },
          });

          console.log("✅ Notification sent");
        } else {
          console.log("⛔ No change → skip notification");
        }
      } else {
        console.log("⚠️ Firebase not initialized");
      }
    } catch (e) {
      console.log("❌ Firebase error:", e.message);
    }

    // 🚀 DISABLE ALL CACHING (CRITICAL FIX)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // ✅ RESPONSE
    res.status(200).json(data);

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch fresh data",
    });
  }
}