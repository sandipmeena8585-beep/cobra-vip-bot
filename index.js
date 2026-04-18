const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

// 🔑 CONFIG
const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";
const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";

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
let requestCount = {};

// 🚀 START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM ACCESS STORE

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY  
🔐 SECURE SYSTEM  
💰 TRUSTED SERVICE  
━━━━━━━━━━━━━━━━━━

👇 SELECT YOUR PLAN`,
  {
    reply_markup: {
      keyboard: Object.keys(plans).map(p => [p]),
      resize_keyboard: true
    }
  });
});

// 💬 MESSAGE
bot.on("message", (msg) => {

  // ➕ ADMIN STOCK ADD
  if (selectedPlan[msg.from.id]) {
    let plan = selectedPlan[msg.from.id];
    let lines = msg.text.split("\n");

    lines.forEach(key => {
      if (keys[plan]) keys[plan].push(key.trim());
    });

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    bot.sendMessage(msg.chat.id,
`✅ STOCK UPDATED

📦 ${plan.toUpperCase()} ➜ ${keys[plan].length} KEYS`);

    selectedPlan[msg.from.id] = null;
    return;
  }

  // 💎 PLAN SELECT
  if (plans[msg.text]) {
    userPlan[msg.from.id] = plans[msg.text];

    bot.sendPhoto(msg.chat.id, QR_LINK, {
      caption:
`💰 PAYMENT DETAILS

🏦 UPI ID: ${UPI_ID}

━━━━━━━━━━━━━━━━━━
📌 SCAN QR & PAY  
📩 SEND SCREENSHOT / UTR  
━━━━━━━━━━━━━━━━━━`
    });
    return;
  }

  // 📥 PAYMENT REQUEST
  if (msg.text !== "/start") {

    const userId = msg.from.id;
    const plan = userPlan[userId];
    if (!plan) return;

    if (!requestCount[userId]) requestCount[userId] = 0;

    if (requestCount[userId] >= 3) {
      bot.sendMessage(msg.chat.id, "❌ LIMIT REACHED (3 TIMES ONLY)");
      return;
    }

    requestCount[userId]++;

    let planName = Object.keys(plans).find(p => plans[p].id === plan.id);

    // 📸 SCREENSHOT
    if (msg.photo) {

      let photoId = msg.photo[msg.photo.length - 1].file_id;

      bot.sendPhoto(ADMIN_ID, photoId, {
        caption:
`📥 PAYMENT REQUEST

👤 USER: ${userId}
💎 PLAN: ${planName}
📸 SCREENSHOT RECEIVED
🔁 ATTEMPT: ${requestCount[userId]}/3`,
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ VERIFY", callback_data: `approve_${userId}` },
            { text: "❌ REJECT", callback_data: `reject_${userId}` }
          ]]
        }
      });

    } else {

      bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

👤 USER: ${userId}
💎 PLAN: ${planName}
📝 MSG: ${msg.text}
🔁 ATTEMPT: ${requestCount[userId]}/3`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ VERIFY", callback_data: `approve_${userId}` },
            { text: "❌ REJECT", callback_data: `reject_${userId}` }
          ]]
        }
      });
    }

    bot.sendMessage(msg.chat.id, "⏳ WAITING FOR VERIFICATION...");
  }
});

// 🔘 BUTTON
bot.on("callback_query", (query) => {

  const data = query.data;

  // ✅ VERIFY
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

    requestCount[userId] = 0;

    bot.sendMessage(userId,
`✅ PAYMENT VERIFIED

━━━━━━━━━━━━━━━━━━

🔥 COBRA SERVER MOD 🔥

━━━━━━━━━━━━━━━━━━

🔑 KEY:
\`${key}\`

📅 EXPIRES:
${expiry.toDateString()}

━━━━━━━━━━━━━━━━━━

🔗 PAID CHANNEL:
${CHANNEL_LINK}

━━━━━━━━━━━━━━━━━━

🎉 ENJOY, HAVE A NICE DAY 🚀`,
{ parse_mode: "Markdown" });

    if (keys[plan.id].length <= 1) {
      bot.sendMessage(ADMIN_ID, `⚠️ LOW STOCK: ${plan.id}`);
    }
  }

  // ❌ REJECT
  if (data.startsWith("reject_")) {

    const userId = data.split("_")[1];

    bot.sendMessage(userId,
`❌ PAYMENT REJECTED

⚠️ SEND CORRECT PAYMENT PROOF
OTHERWISE YOU MAY BE BLOCKED`);

    bot.sendMessage(ADMIN_ID, `❌ REJECTED USER: ${userId}`);
  }

  // 📦 STOCK
  if (data === "stock") {
    let msg = "📦 STOCK STATUS\n\n";
    for (let p in keys) {
      msg += `${p.toUpperCase()} ➜ ${keys[p].length}\n`;
    }
    bot.sendMessage(query.message.chat.id, msg);
  }

  // ➕ ADD STOCK
  if (data === "addstock") {
    bot.sendMessage(query.message.chat.id,
`💎 SELECT PLAN`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "1 DAY", callback_data: "plan1" }],
          [{ text: "7 DAY", callback_data: "plan2" }],
          [{ text: "15 DAY", callback_data: "plan3" }],
          [{ text: "30 DAY", callback_data: "plan4" }],
          [{ text: "60 DAY", callback_data: "plan5" }]
        ]
      }
    });
  }

  // PLAN SELECT
  if (data.startsWith("plan")) {
    selectedPlan[query.from.id] = data;

    bot.sendMessage(query.message.chat.id,
`➕ SEND KEYS

Example:
COBRASERVER>1D-XXXX`);
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
        [{ text: "➕ ADD STOCK", callback_data: "addstock" }]
      ]
    }
  });
});
