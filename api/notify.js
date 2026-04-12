import admin from "firebase-admin";
import axios from "axios";

export default async function handler(req, res) {
  try {
    console.log("🔥 NOTIFY START");

    // 🔐 SAFE ENV LOAD
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
    let response;
    try {
      response = await axios.get(
        "https://gold-backend-2scw.vercel.app/api/gold"
      );
    } catch (e) {
      return res.status(200).json({ error: "API fetch failed" });
    }

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

    // ✅ SORT BY DATE
    const sorted = [...last7].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const yesterday = sorted[sorted.length - 2];

    // 🔢 CALCULATE CHANGE ONLY
    const diff24 = Math.round(today.gold24 - yesterday.gold24);
    const diff22 = Math.round(today.gold22 - yesterday.gold22);
    const diffSilver = Math.round(today.silver - yesterday.silver);

    // 🔄 FORMAT CHANGE
    const format = (value) => {
      if (value > 0) return `+${value}`;
      if (value < 0) return `${value}`;
      return "0";
    };

    // 📩 FINAL MESSAGE (ONLY CHANGE)
    const message =
      `24K: ${format(diff24)}\n` +
      `22K: ${format(diff22)}\n` +
      `Silver: ${format(diffSilver)}`;

    console.log("🔥 Sending:", message);

    // 🔔 SEND NOTIFICATION
    await admin.messaging().send({
      topic: "gold",
      notification: {
        title: "🔔 Gold Price Change",
        body: message,
      },
    });

    return res.status(200).json({
      success: true,
      message,
    });

  } catch (e) {
    console.log("🔥 FINAL ERROR:", e.message);

    return res.status(200).json({
      error: e.message,
    });
  }
}