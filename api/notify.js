import admin from "firebase-admin";
import axios from "axios";

export default async function handler(req, res) {
  try {
    console.log("🔥 STEP 1: API START");

    // 🔐 ENV CHECK
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      return res.status(200).json({ error: "ENV missing" });
    }

    console.log("🔥 STEP 2: ENV OK");

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
      serviceAccount.private_key =
        serviceAccount.private_key.replace(/\\n/g, "\n");
    } catch (e) {
      return res.status(200).json({ error: "ENV parse error" });
    }

    console.log("🔥 STEP 3: JSON PARSED");

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    console.log("🔥 STEP 4: Firebase initialized");

    // 🔗 FETCH DATA
    let response;
    try {
      response = await axios.get(
        "https://gold-backend-2scw.vercel.app/api/gold"
      );
    } catch (e) {
      return res.status(200).json({ error: "API fetch failed" });
    }

    console.log("🔥 STEP 5: API fetched");

    const data = response.data;

    if (!data || !data.data) {
      return res.status(200).json({ error: "Invalid data structure" });
    }

    const city = Object.keys(data.data)[0];

    const today = data.data[city].today;
    const last7 = data.data[city].last7Days;

    if (!last7 || last7.length < 2) {
      return res.status(200).json({ error: "Not enough history" });
    }

    console.log("🔥 STEP 6: Data ready");

    const sorted = [...last7].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const yesterday = sorted[sorted.length - 2];

    const diff24 = Math.round(today.gold24 - yesterday.gold24);

    const message = `24K change ₹${diff24}`;

    console.log("🔥 STEP 7: Sending notification");

    await admin.messaging().send({
      topic: "gold",
      notification: {
        title: "Test",
        body: message,
      },
    });

    console.log("🔥 STEP 8: SUCCESS");

    return res.status(200).json({ success: true });

  } catch (e) {
    console.log("🔥 FINAL CR