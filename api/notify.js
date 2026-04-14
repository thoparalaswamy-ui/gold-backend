import admin from "firebase-admin";
import axios from "axios";

export default async function handler(req, res) {
  try {
    console.log("🔥 NOTIFY START");

    // 🔐 ENV LOAD
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      return res.status(200).json({ error: "ENV missing" });
    }

    let serviceAccount;

    try {
      serviceAccount = JSON.parse(raw);
      serviceAccount.private_key =
        serviceAccount.private_key.replace(/\\n/g, "\n");
    } catch (e) {
      return res.status(200).json({ error: "ENV parse error" });
    }

    // 🔥 INIT FIREBASE
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    console.log("🔥 Firebase OK");

    // 🌐 FETCH DATA
    const response = await axios.get(
      "https://gold-backend-2scw.vercel.app/api/gold"
    );

    const data = response.data;

    if (!data || !data.data) {
      return res.status(200).json({ error: "Invalid data" });
    }

    const city = Object.keys(data.data)[0];
    const today = data.data[city].today;
    const last7 = data.data[city].last7Days;

    if (!last7 || last7.length < 2) {
      return res.status(200).json({ error: "Not enough data" });
    }

    // ✅ SORT
    const sorted = [...last7].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const yesterday = sorted[sorted.length - 2];

    // 🔢 SAFE NUMBERS
    const toNum = (v) => Number(v) || 0;

    const today24 = toNum(today.gold24);
    const today22 = toNum(today.gold22);
    const todaySilver = toNum(today.silver);

    const y24 = toNum(yesterday.gold24);
    const y22 = toNum(yesterday.gold22);
    const ySilver = toNum(yesterday.silver);

    // 🔢 DIFF
    const diff24 = today24 - y24;
    const diff22 = today22 - y22;
    const diffSilver = todaySilver - ySilver;

    // 📊 % CHANGE
    const percent = (diff, oldVal) =>
      oldVal === 0 ? 0 : ((diff / oldVal) * 100).toFixed(2);

    // 🎨 FORMAT FUNCTION
    const format = (label, todayVal, diff, oldVal) => {
      const pct = percent(diff, oldVal);

      if (diff > 0) {
        return `🟢 ${label}: ↑ ₹${Math.abs(diff)} (${pct}%)\nNow: ₹${todayVal}`;
      } else if (diff < 0) {
        return `🔴 ${label}: ↓ ₹${Math.abs(diff)} (${pct}%)\nNow: ₹${todayVal}`;
      } else {
        return `⚪ ${label}: No Change\nNow: ₹${todayVal}`;
      }
    };

    // 📩 FINAL MESSAGE
    const message =
      `${format("24K Gold", today24, diff24, y24)}\n\n` +
      `${format("22K Gold", today22, diff22, y22)}\n\n` +
      `${format("Silver", todaySilver, diffSilver, ySilver)}`;

    console.log("🔥 Sending:", message);

    // 🔔 SEND NOTIFICATION
    await admin.messaging().send({
      topic: "gold",
      notification: {
        title: "🔔 Gold Price Update (Live)",
        body: message,
      },
    });

    return res.status(200).json({
      success: true,
      message,
    });

  } catch (e) {
    console.log("🔥 ERROR:", e.message);

    return res.status(200).json({
      error: e.message,
    });
  }
}