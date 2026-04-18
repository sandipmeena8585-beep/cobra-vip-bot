const TelegramBot = require('node-telegram-bot-api');
const express = require("express");

// 🔑 BOT TOKEN
const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";

// 👤 ADMIN ID
const ADMIN_ID = 7707237527;

// 🤖 BOT INIT
const bot = new TelegramBot(token, { polling: true });

// 🌐 EXPRESS SERVER (Render fix)
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// 💎 PLANS
const plans = {
  "💎 1 DAY - 120₹": "plan1",
  "💎 7 DAY - 400₹": "plan2",
  "💎 15 DAY - 600₹": "plan3",
  "💎 30 DAY - 800₹": "plan4"
};

// 🚀 START COMMAND
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 COBRA VIP PANEL 🔥

💎 Select Your Plan Below:

⚡ Fast Delivery
🔒 Secure System`,
  {
    reply_markup: {
      keyboard: Object.keys(plans).map(p => [p]),
      resize_keyboard: true
    }
  });
});

// 💰 PLAN SELECT + PAYMENT
bot.on("message", (msg) => {

  if (plans[msg.text]) {
    bot.sendMessage(msg.chat.id,
`💰 PAYMENT DETAILS:

UPI: godxcobra@axl

📌 Payment karne ke baad:
👉 Apna UTR / Screenshot bhejo

⚠️ Fake payment = block`);
  }

  // 📩 UTR → ADMIN
  if (!plans[msg.text] && msg.text !== "/start") {
    bot.sendMessage(ADMIN_ID,
`📥 NEW PAYMENT REQUEST

👤 User ID: ${msg.from.id}
📝 Message: ${msg.text}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ APPROVE", callback_data: `approve_${msg.from.id}` },
            { text: "❌ REJECT", callback_data: `reject_${msg.from.id}` }
          ]
        ]
      }
    });

    bot.sendMessage(msg.chat.id, "⏳ Waiting for admin verification...");
  }
});

// ✅ ADMIN APPROVE / REJECT
bot.on("callback_query", (query) => {
  const data = query.data;

  if (data.startsWith("approve_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(userId,
`✅ PAYMENT VERIFIED

🔑 YOUR KEY: VIP-${Math.floor(Math.random()*100000)}

⚡ Enjoy Service 🚀`);

    bot.answerCallbackQuery(query.id, { text: "Approved ✅" });
  }

  if (data.startsWith("reject_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(userId, "❌ Payment rejected. Contact admin.");

    bot.answerCallbackQuery(query.id, { text: "Rejected ❌" });
  }
});const QR_LINK = "https://raw.githubusercontent.com/USERNAME/cobra-bot/main/upi_qr.png";
