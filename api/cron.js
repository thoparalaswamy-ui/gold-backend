import admin from "firebase-admin";

// 🔥 INIT FIREBASE (SAFE)
if (!admin.apps.length) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) throw new Error("ENV missing");

    const serviceAccount = JSON.parse(raw);

    serviceAccount.private_key =
      serviceAccount.private_key.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("🔥 Firebase initialized");
  } catch (e) {
    console.log("❌ Firebase init error:", e.message);
  }
}

// 🔁 FETCH WITH RETRY (IMPORTANT)
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log(`Retry ${i + 1}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("GitHub fetch failed after retries");
}

// 🚀 CRON HANDLER
export default async function handler(req, res) {
  try {
    console.log("⏰ CRON START");

    const now = new Date();

    const url =
      "https://raw.githubusercontent.com/thoparalaswamy-ui/gold-json/main/gold-data.json";

    const data = await fetchWithRetry(url);

    const db = admin.firestore();

    const cacheRef = db.collection("cache").doc("gold");
    const metaRef = db.collection("meta").doc("gold");

    const metaDoc = await metaRef.get();

    const oldUpdatedAt = metaDoc.exists ? metaDoc.data().updatedAt : null;
    const eveningSent = metaDoc.exists ? metaDoc.data().eveningSent : false;

    // 🟢 FIRST NOTIFICATION (NOON UPDATE)
    if (oldUpdatedAt !== data.updatedAt) {
      await cacheRef.set(data);

      await metaRef.set({
        updatedAt: data.updatedAt,
        eveningSent: false, // reset for evening
      });

      await admin.messaging().send({
        topic: "gold",
        notification: {
          title: "Gold Price Updated 💰",
          body: "Latest gold prices available now",
        },
      });

      console.log("🚀 Noon notification sent");
    } else {
      console.log("⛔ No new data");
    }

    // 🌙 EVENING NOTIFICATION (ONLY ONCE)
    const hourUTC = now.getUTCHours();
    const minuteUTC = now.getUTCMinutes();

    if (hourUTC === 12 && minuteUTC >= 30 && minuteUTC < 40 && !eveningSent) {
      await admin.messaging().send({
        topic: "gold",
        notification: {
          title: "Evening Gold Update 🌙",
          body: "Check today's gold prices",
        },
      });

      await metaRef.set(
        {
          eveningSent: true,
        },
        { merge: true }
      );

      console.log("🌙 Evening notification sent");
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.log("❌ CRON ERROR:", e.message);
    res.status(500).end();
  }
}