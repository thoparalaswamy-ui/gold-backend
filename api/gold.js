import admin from "firebase-admin";

// 🔥 INIT FIREBASE (ONCE)
let firebaseReady = false;

try {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (raw) {
      const serviceAccount = JSON.parse(raw);

      // ✅ FIX PRIVATE KEY
      serviceAccount.private_key =
        serviceAccount.private_key.replace(/\\n/g, "\n");

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      firebaseReady = true;
      console.log("🔥 Firebase initialized");
    } else {
      console.log("⚠️ ENV missing");
    }
  } else {
    firebaseReady = true;
  }
} catch (e) {
  console.log("❌ Firebase init error:", e.message);
}

// 🚀 MAIN API (SERVES CACHE ONLY)
export default async function handler(req, res) {
  console.log("🔥 API HIT");

  try {
    const db = admin.firestore();

    const doc = await db.collection("cache").doc("gold").get();

    if (!doc.exists) {
      return res.status(500).json({
        success: false,
        message: "Data not ready yet",
      });
    }

    const data = doc.data();

    // 🕒 Safety fallback
    if (!data.updatedAt) {
      data.updatedAt = new Date().toISOString();
    }

    // 🚀 CDN CACHE (CRITICAL FOR 1M USERS)
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );

    res.status(200).json(data);

  } catch (error) {
    console.log("❌ ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch cached data",
    });
  }
}