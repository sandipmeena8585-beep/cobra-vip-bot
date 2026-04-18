const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

// 🔑 CONFIG
const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";
const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

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
let tempUTR = {};

// 🚀 START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM STORE

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY
🔐 SECURE SYSTEM
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

  const userId = msg.from.id;

  // 🔥 UTR FORCE REPLY INPUT
  if (msg.reply_to_message && msg.reply_to_message.text.includes("ENTER YOUR UTR")) {

    const plan = userPlan[userId];
    if (!plan) return;

    tempUTR[userId] = msg.text;

    bot.sendMessage(msg.chat.id,
`✅ UTR ADDED

🧾 YOUR UTR:
\`${msg.text}\`

━━━━━━━━━━━━━━━━━━
👇 CLICK SUBMIT`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ SUBMIT PAYMENT", callback_data: "submit_utr" }]
        ]
      }
    });

    return;
  }

  // ➕ ADMIN STOCK
  if (selectedPlan[userId]) {

    let plan = selectedPlan[userId];

    msg.text.split("\n").forEach(k => {
      if (keys[plan]) keys[plan].push(k.trim());
    });

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    bot.sendMessage(msg.chat.id,
`✅ STOCK UPDATED

📦 ${plan.toUpperCase()} ➜ ${keys[plan].length}`);

    selectedPlan[userId] = null;
    return;
  }

  // 💎 PLAN SELECT
  if (plans[msg.text]) {

    userPlan[userId] = plans[msg.text];

    bot.sendPhoto(msg.chat.id, QR_LINK, {
      caption:
`💰 PAYMENT DETAILS

👤 NAME: ${PAYMENT_NAME}

🏦 UPI ID:
\`${UPI_ID}\`

━━━━━━━━━━━━━━━━━━
📌 SCAN QR & PAY
━━━━━━━━━━━━━━━━━━

👇 AFTER PAYMENT CLICK BELOW`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💸 ENTER UTR", callback_data: "enter_utr" }]
        ]
      }
    });

    return;
  }
});

// 🔘 BUTTON HANDLER
bot.on("callback_query", (query) => {

  const data = query.data;
  const userId = query.from.id;

  // 💸 ENTER UTR
  if (data === "enter_utr") {

    bot.sendMessage(query.message.chat.id,
`🧾 ENTER YOUR UTR NUMBER:

Example: 1234567890`,
    {
      reply_markup: {
        force_reply: true
      }
    });

    bot.answerCallbackQuery(query.id);
  }

  // ✅ SUBMIT
  if (data === "submit_utr") {

    const plan = userPlan[userId];
    const utr = tempUTR[userId];

    if (!plan || !utr) return;

    if (!requestCount[userId]) requestCount[userId] = 0;

    if (requestCount[userId] >= 3) {
      bot.sendMessage(userId, "❌ LIMIT REACHED (3 TIMES)");
      return;
    }

    requestCount[userId]++;

    let planName = Object.keys(plans).find(p => plans[p].id === plan.id);

    bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

👤 USER: ${userId}
💎 PLAN: ${planName}

🧾 UTR:
${utr}

🔁 ATTEMPT: ${requestCount[userId]}/3`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ VERIFY", callback_data: `approve_${userId}` },
          { text: "❌ REJECT", callback_data: `reject_${userId}` }
        ]]
      }
    });

    bot.sendMessage(userId,
`⏳ PLEASE WAIT...

ADMIN VERIFY YOUR PAYMENT`);
  }

  // ✅ VERIFY
  if (data.startsWith("approve_")) {

    const userId = data.split("_")[1];
    const plan = userPlan[userId];

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

⚠️ SEND CORRECT PAYMENT PROOF`);

    bot.sendMessage(ADMIN_ID, `❌ REJECTED USER: ${userId}`);
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

  // PLAN SELECT ADMIN
  if (data.startsWith("plan")) {

    selectedPlan[userId] = data;

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
        [{ text: "➕ ADD STOCK", callback_data: "addstock" }]
      ]
    }
  });
});
