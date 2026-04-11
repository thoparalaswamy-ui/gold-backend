import admin from "firebase-admin";

// 🔥 INIT FIREBASE (SAFE + CLEAN)
let serviceAccount = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ ENV parsed");
  } else {
    console.log("❌ ENV missing");
  }
} catch (e) {
  console.log("❌ ENV PARSE ERROR:", e.message);
}

if (!admin.apps.length && serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("🔥 Firebase initialized");
} else {
  console.log("⚠️ Firebase not initialized");
}

export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

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

        if (oldUpdatedAt !== data.updatedAt) {
          console.log("🚀 Sending notification");

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
          console.log("⛔ No change");
        }
      } else {
        console.log("⚠️ Firebase not initialized");
      }
    } catch (e) {
      console.log("❌ Firebase error:", e.message);
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch fresh data",
    });
  }
}