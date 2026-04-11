import admin from "firebase-admin";

// 🔥 INIT FIREBASE
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
    const now = new Date();

    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    const response = await fetch(url);
    const data = await response.json();

    const db = admin.firestore();

    const cacheRef = db.collection("cache").doc("gold");
    const metaRef = db.collection("meta").doc("gold");

    const metaDoc = await metaRef.get();

    const oldUpdatedAt = metaDoc.exists ? metaDoc.data().updatedAt : null;

    // 🟢 FIRST UPDATE (NOON)
    if (oldUpdatedAt !== data.updatedAt) {
      await cacheRef.set(data);
      await metaRef.set({ updatedAt: data.updatedAt });

      await admin.messaging().send({
        topic: "gold",
        notification: {
          title: "Gold Price Updated 💰",
          body: "Latest gold prices available now",
        },
      });

      console.log("🚀 Noon notification sent");
    }

    // 🌙 EVENING NOTIFICATION (6 PM IST)
    const hourUTC = now.getUTCHours();
    const minuteUTC = now.getUTCMinutes();

    if (hourUTC === 12 && minuteUTC === 30) {
      await admin.messaging().send({
        topic: "gold",
        notification: {
          title: "Evening Gold Update 🌙",
          body: "Check today's gold prices",
        },
      });

      console.log("🌙 Evening notification sent");
    }

    res.status(200).json({ success: true });

  } catch (e) {
    console.log("❌ CRON ERROR:", e.message);
    res.status(500).end();
  }
}