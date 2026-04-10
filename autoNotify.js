const admin = require("firebase-admin");
const axios = require("axios");
const cron = require("node-cron");

// 🔐 Firebase init
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 📲 MAIN FUNCTION
async function sendDailyNotification() {
  try {
    console.log("📊 Fetching gold data...");

    const res = await axios.get(
      "https://gold-backend-2scw.vercel.app/api/gold"
    );

    const data = res.data;
    const firstCity = Object.keys(data.data)[0];

    const today = data.data[firstCity].today;
    const last7 = data.data[firstCity].last7Days;

    // Yesterday data
    const yesterday = last7[last7.length - 2];

    // 🔢 10g prices
    const today24 = today.gold24;
    const today22 = today.gold22;

    const yesterday24 = yesterday.gold24;
    const yesterday22 = yesterday.gold22;

    const diff24 = Math.round(today24 - yesterday24);
    const diff22 = Math.round(today22 - yesterday22);

    // 🧠 Format messages
    const format = (label, diff) => {
      if (diff > 0) return `${label} ↑ ₹${diff}`;
      if (diff < 0) return `${label} ↓ ₹${Math.abs(diff)}`;
      return `${label} no change`;
    };

    const msg24 = format("24K", diff24);
    const msg22 = format("22K", diff22);

    // 📩 Final message
    const finalMessage = `${msg24} | ${msg22}`;

    // 🚀 Send notification to topic
    await admin.messaging().send({
      topic: "gold",
      notification: {
        title: "🔔 Daily Gold Price Update (10g)",
        body: finalMessage,
      },
    });

    console.log("✅ Notification Sent:", finalMessage);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

// ⏰ CRON SCHEDULE
// 12:45 PM IST = 7:15 AM UTC
cron.schedule("15 7 * * *", () => {
  console.log("⏰ Running scheduled job (12:45 PM IST)...");
  sendDailyNotification();
});

// 🧪 Run once immediately for testing
sendDailyNotification();
