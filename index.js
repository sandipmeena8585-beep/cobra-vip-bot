const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

// 🔑 CONFIG
const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";
const UPI_ID = "godxcobra@axl";

const bot = new TelegramBot(token, { polling: true });

// 🌐 SERVER
const app = express();
app.get("/", (req, res) => res.send("Running"));
app.listen(process.env.PORT || 3000);

// 📦 LOAD KEYS
let keys = JSON.parse(fs.readFileSync("keys.json"));

// 💎 PLANS
const plans = {
  "💎 1 DAY - 100₹": { id: "plan1", days: 1 },
  "💎 7 DAY - 400₹": { id: "plan2", days: 7 },
  "💎 15 DAY - 700₹": { id: "plan3", days: 15 },
  "💎 30 DAY - 900₹": { id: "plan4", days: 30 },
  "💎 60 DAY - 1200₹": { id: "plan5", days: 60 }
};

let userPlan = {};
let selectedPlan = {};

// 🚀 START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM ACCESS STORE

━━━━━━━━━━━━━━━
⚡ Instant Delivery
🔐 Secure Access
💰 Trusted Payment
━━━━━━━━━━━━━━━

👇 Select Your Plan`,
  {
    reply_markup: {
      keyboard: Object.keys(plans).map(p => [p]),
      resize_keyboard: true
    }
  });
});

// 💬 MESSAGE HANDLER
bot.on("message", (msg) => {

  // ➕ ADMIN ADD STOCK (PLAN SELECT KE BAAD)
  if (selectedPlan[msg.from.id]) {

    let plan = selectedPlan[msg.from.id];
    let lines = msg.text.split("\n");

    lines.forEach(key => {
      if (keys[plan]) keys[plan].push(key.trim());
    });

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    bot.sendMessage(msg.chat.id,
`✅ STOCK UPDATED

${plan}: ${keys[plan].length} KEYS`);

    selectedPlan[msg.from.id] = null;
    return;
  }

  // 💎 PLAN SELECT (USER)
  if (plans[msg.text]) {
    userPlan[msg.from.id] = plans[msg.text];

    bot.sendPhoto(msg.chat.id, QR_LINK, {
      caption:
`💰 PAYMENT DETAILS

🏦 UPI ID: ${UPI_ID}

━━━━━━━━━━━━━━━
📌 Scan QR & Pay
📩 Send Screenshot / UTR
━━━━━━━━━━━━━━━`
    });
    return;
  }

  // 📥 PAYMENT REQUEST
  if (msg.text !== "/start") {

    const plan = userPlan[msg.from.id];

    bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

👤 User: ${msg.from.id}
💎 Plan: ${plan ? plan.id : "unknown"}
📝 Msg: ${msg.text}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ VERIFY", callback_data: `approve_${msg.from.id}` }]
        ]
      }
    });

    bot.sendMessage(msg.chat.id, "⏳ Waiting for verification...");
  }
});

// 🔘 BUTTON HANDLER
bot.on("callback_query", (query) => {

  const data = query.data;

  // ✅ VERIFY PAYMENT
  if (data.startsWith("approve_")) {

    const userId = data.split("_")[1];
    const plan = userPlan[userId];

    if (!plan) return;

    let stock = keys[plan.id];

    if (!stock || stock.length === 0) {
      bot.sendMessage(ADMIN_ID, `❌ STOCK EMPTY: ${plan.id}`);
      return;
    }

    const key = stock.shift();
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.days);

    // 🔥 FINAL KEY MESSAGE (COPY FRIENDLY)
    bot.sendMessage(userId,
`✅ PAYMENT VERIFIED

━━━━━━━━━━━━━━━
🔑 KEY:
\`${key}\`
📅 EXPIRES: ${expiry.toDateString()}
━━━━━━━━━━━━━━━

🎉 Enjoy, Have a Nice Day 🚀`,
{ parse_mode: "Markdown" });

    // ⚠️ LOW STOCK ALERT
    if (keys[plan.id].length <= 1) {
      bot.sendMessage(ADMIN_ID, `⚠️ LOW STOCK: ${plan.id}`);
    }
  }

  // 📦 STOCK CHECK
  if (data === "stock") {
    let msg = "📦 STOCK STATUS\n\n";
    for (let p in keys) {
      msg += `${p} ➜ ${keys[p].length}\n`;
    }
    bot.sendMessage(query.message.chat.id, msg);
  }

  // ➕ ADD STOCK BUTTON
  if (data === "addstock") {

    bot.sendMessage(query.message.chat.id,
`💎 SELECT PLAN`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💎 1 DAY", callback_data: "plan1" }],
          [{ text: "💎 7 DAY", callback_data: "plan2" }],
          [{ text: "💎 15 DAY", callback_data: "plan3" }],
          [{ text: "💎 30 DAY", callback_data: "plan4" }],
          [{ text: "💎 60 DAY", callback_data: "plan5" }]
        ]
      }
    });
  }

  // 🎯 PLAN SELECT (ADMIN)
  if (data.startsWith("plan")) {

    selectedPlan[query.from.id] = data;

    bot.sendMessage(query.message.chat.id,
`➕ SEND KEYS

Example:
COBRASERVER>1D-AAAA
COBRASERVER>1D-BBBB`);
  }
});

// 👑 ADMIN PANEL
bot.onText(/\/admin/, (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,
`👑 ADMIN CONTROL PANEL`,
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📦 CHECK STOCK", callback_data: "stock" }],
        [{ text: "➕ ADD STOCK", callback_data: "addstock" }]
      ]
    }
  });
});
