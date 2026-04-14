import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  serviceAccount.private_key =
    serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  try {
    console.log("🔥 GOLD API HIT");

    const db = admin.firestore();

    const doc = await db.collection("cache").doc("gold").get();

    if (!doc.exists) {
      return res.status(200).json({
        success: false,
        message: "No data available",
      });
    }

    const data = doc.data();

    res.setHeader(
      "Cache-Control",
      "public, max-age=10, stale-while-revalidate=30"
    );

    return res.status(200).json(data);

  } catch (e) {
    console.log("❌ ERROR:", e.message);

    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
}