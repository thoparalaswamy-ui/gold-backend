import admin from "firebase-admin";

// 🔥 SAFE FIREBASE INIT (NO CRASH)
let firebaseInitialized = false;

try {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (raw) {
      const serviceAccount = JSON.parse(raw);

      if (serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        firebaseInitialized = true;
        console.log("🔥 Firebase initialized");
      } else {
        console.log("⚠️ Invalid Firebase JSON");
      }
    } else {
      console.log("⚠️ ENV not found");
    }
  } else {
    firebaseInitialized = true;
  }
} catch (e) {
  console.log("❌ Firebase init error:", e.message);
}

// 🚀 API HANDLER
export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    // ⏱ Timeout
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

    // 🔔 FIREBASE LOGIC
    try {
      if (firebaseInitialized) {
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
        console.log("⚠️ Firebase skipped");
      }
    } catch (e) {
      console.log("❌ Firebase runtime error:", e.message);
    }

    // 🚫 Disable cache
    res.setHeader("Cache-Control", "no-store");

    res.status(200).json(data);

  } catch (error) {
    console.error("❌ API ERROR:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}