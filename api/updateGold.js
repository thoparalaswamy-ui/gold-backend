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
    console.log("🔥 UPDATE API HIT");

    const data = req.body;

    if (!data || !data.data) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const db = admin.firestore();

    await db.collection("cache").doc("gold").set({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Updated instantly 🚀",
    });

  } catch (e) {
    console.log("❌ ERROR:", e.message);
    return res.status(500).json({ error: e.message });
  }
}