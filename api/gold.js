import admin from "firebase-admin";

// 🔥 FORCE PARSE ENV
let serviceAccount = null;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("✅ ENV parsed");
} catch (e) {
  console.log("❌ ENV parse failed:", e.message);
}

// 🔥 FORCE INIT (NO SKIP)
if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase initialized SUCCESS");
  } catch (e) {
    console.log("❌ Firebase init error:", e.message);
  }
} else {
  console.log("⚠️ Firebase skipped (already init or no env)");
}

export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("GitHub fetch failed");
    }

    const data = await response.json();

    if (!data.updatedAt) {
      data.updatedAt = new Date().toISOString();
    }

    // 🔔 TEST FIREBASE
    try {
      if (admin.apps.length) {
        console.log("🚀 Firebase ACTIVE");

        await admin.messaging().send({
          topic: "gold",
          notification: {
            title: "Test Notification",
            body: "Firebase is working 🚀",
          },
        });

        console.log("✅ Notification sent");
      } else {
        console.log("❌ Firebase NOT ACTIVE");
      }
    } catch (e) {
      console.log("❌ Firebase runtime error:", e.message);
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);

  } catch (error) {
    console.log("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed",
    });
  }
}