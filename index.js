const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/@GODx_COBRA/cobra-bot/main/upi_qr.png";

const bot = new TelegramBot(token, { polling: true });

// 🌐 server
const app = express();
app.get("/", (req, res) => res.send("Running"));
app.listen(process.env.PORT || 3000);

// 📦 load keys
let keys = JSON.parse(fs.readFileSync("keys.json"));

// 💎 plans
const plans = {
  "💎 1 DAY - 100₹": { id: "plan1", days: 1 },
  "💎 7 DAY - 400₹": { id: "plan2", days: 7 },
  "💎 15 DAY - 700₹": { id: "plan3", days: 15 },
  "💎 30 DAY - 900₹": { id: "plan4", days: 30 },
  "💎 60 DAY - 1200₹": { id: "plan5", days: 60 }
};

let userPlan = {};
let adding = {};

// 🚀 START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 COBRA VIP PANEL 🔥

💎 AVAILABLE PLANS

━━━━━━━━━━━━━━━
⚡ Instant Delivery
🔐 Secure Access
━━━━━━━━━━━━━━━

👇 Select Plan`,
  {
    reply_markup: {
      keyboard: Object.keys(plans).map(p => [p]),
      resize_keyboard: true
    }
  });
});

// 💰 MESSAGE HANDLER
bot.on("message", (msg) => {

  // PLAN SELECT
  if (plans[msg.text]) {
    userPlan[msg.from.id] = plans[msg.text];

    bot.sendPhoto(msg.chat.id, QR_LINK, {
      caption:
`💰 PAYMENT DETAILS

🏦 UPI: godxcobra@axl

━━━━━━━━━━━━━━━
📌 Send Payment Screenshot / UTR
━━━━━━━━━━━━━━━`
    });
  }

  // ➕ ADD KEY MODE
  else if (adding[msg.from.id]) {

    let lines = msg.text.split("\n");

    lines.forEach(line => {
      let [plan, key] = line.split(" ");

      if (keys[plan]) keys[plan].push(key);
    });

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    bot.sendMessage(msg.chat.id,
`✅ STOCK UPDATED

plan1: ${keys.plan1.length}
plan2: ${keys.plan2.length}
plan3: ${keys.plan3.length}
plan4: ${keys.plan4.length}
plan5: ${keys.plan5.length}`);

    adding[msg.from.id] = false;
  }

  // PAYMENT PROOF
  else if (msg.text !== "/start") {

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

    bot.sendMessage(msg.chat.id, "⏳ Waiting for admin verification...");
  }
});

// ✅ VERIFY
bot.on("callback_query", (query) => {

  const data = query.data;

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

    // expiry
    let expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.days);

    bot.sendMessage(userId,
`✅ PAYMENT VERIFIED

━━━━━━━━━━━━━━━
🔑 KEY: ${key}
📅 EXPIRES: ${expiry.toDateString()}
━━━━━━━━━━━━━━━

🎉 Enjoy, Have a Nice Day 🚀`);

    // ⚠️ LOW STOCK ALERT
    if (keys[plan.id].length <= 1) {
      bot.sendMessage(ADMIN_ID, `⚠️ LOW STOCK: ${plan.id}`);
    }
  }

  // STOCK
  if (data === "stock") {
    let msg = "📦 STOCK\n\n";
    for (let p in keys) {
      msg += `${p} ➜ ${keys[p].length}\n`;
    }
    bot.sendMessage(query.message.chat.id, msg);
  }

  // ADD
  if (data === "add") {
    if (query.from.id != ADMIN_ID) return;

    adding[query.from.id] = true;

    bot.sendMessage(query.message.chat.id,
`➕ ADD STOCK

Format:
plan1 KEY
plan2 KEY

Example:
plan1 COBRASERVER>1D-XXXX`);
  }
});

// 👑 ADMIN PANEL
bot.onText(/\/admin/, (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,
`👑 ADMIN PANEL`,
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📦 STOCK", callback_data: "stock" }],
        [{ text: "➕ ADD STOCK", callback_data: "add" }]
      ]
    }
  });
});
