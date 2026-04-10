import admin from "firebase-admin";
import axios from "axios";

// 🔐 Load Firebase key from Vercel env
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// 🚀 Initialize Firebase (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 📲 API handler
export default async function handler(req, res) {
  try {
    console.log("📊 Fetching gold data...");

    // 🔗 Fetch gold data
    const response = await axios.get(
      "https://gold-backend-2scw.vercel.app/api/gold"
    );

    const data = response.data;
    const city = Object.keys(data.data)[0];

    const today = data.data[city].today;
    const last7 = data.data[city].last7Days;
    const yesterday = last7[last7.length - 2];

    // 🔢 Calculate change (10g)
    const diff24 = Math.round(today.gold24 - yesterday.gold24);
    const diff22 = Math.round(today.gold22 - yesterday.gold22);

    // 🧠 Format message
    const format = (label, diff) => {
      if (diff > 0) return `${label} ↑ ₹${diff}`;
      if (diff < 0) return `${label} ↓ ₹${Math.abs(diff)}`;
      return `${label} no change`;
    };

    const message = `${format("24K", diff24)} | ${format("22K", diff22)}`;

    console.log("📩 Sending Notification:", message);

    // 📩 Send notification to topic
    const firebaseResponse = await admin.messaging().send({
      topic: "gold",
      notification: {
        title: "🔔 Daily Gold Price Update (10g)",
        body: message,
      },
    });

    console.log("✅ Notification sent:", firebaseResponse);

    // ✅ IMPORTANT: return response
    return res.status(200).json({
      success: true,
      message,
    });

  } catch (error) {
    console.error("❌ Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
