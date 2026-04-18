const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";
const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// 🌐 SERVER
const app = express();
app.get("/", (req,res)=>res.send("Running"));
app.listen(process.env.PORT || 3000);

// 📦 LOAD KEYS
let keys = JSON.parse(fs.readFileSync("keys.json"));

// 💎 PLANS
const plans = {
  plan1: { name: "💎 1 DAY - 100₹", days: 1 },
  plan2: { name: "💎 7 DAY - 400₹", days: 7 },
  plan3: { name: "💎 15 DAY - 700₹", days: 15 },
  plan4: { name: "💎 30 DAY - 900₹", days: 30 },
  plan5: { name: "💎 60 DAY - 1200₹", days: 60 }
};

let userPlan = {};
let selectedPlan = {};
let waitingScreenshot = {};

// 🔥 MENU
function showMenu(chatId) {
  bot.sendMessage(chatId,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM STORE

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY
🔐 SECURE ACCESS
━━━━━━━━━━━━━━━━━━

👇 SELECT YOUR PLAN`,
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: plans.plan1.name, callback_data: "buy_plan1" }],
        [{ text: plans.plan2.name, callback_data: "buy_plan2" }],
        [{ text: plans.plan3.name, callback_data: "buy_plan3" }],
        [{ text: plans.plan4.name, callback_data: "buy_plan4" }],
        [{ text: plans.plan5.name, callback_data: "buy_plan5" }]
      ]
    }
  });
}

// START
bot.onText(/\/start/, (msg)=>{
  showMenu(msg.chat.id);
});

// MESSAGE
bot.on("message",(msg)=>{
  const userId = msg.from.id;

  // 📸 SCREENSHOT
  if(waitingScreenshot[userId] && msg.photo){
    let plan = userPlan[userId];

    bot.sendPhoto(ADMIN_ID, msg.photo[msg.photo.length-1].file_id, {
      caption:
`📸 PAYMENT PROOF

USER: ${userId}
PLAN: ${plan.name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${userId}`},
          {text:"❌ REJECT",callback_data:`reject_${userId}`}
        ]]
      }
    });

    bot.sendMessage(userId,"⏳ WAIT ADMIN VERIFY");
    waitingScreenshot[userId]=false;
    return;
  }

  // 🧾 UTR
  if(msg.reply_to_message && msg.reply_to_message.text.includes("ENTER YOUR UTR")){
    let plan = userPlan[userId];

    bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

USER: ${userId}
PLAN: ${plan.name}

UTR: ${msg.text}`,
{
  reply_markup:{
    inline_keyboard:[[
      {text:"✅ VERIFY",callback_data:`approve_${userId}`},
      {text:"❌ REJECT",callback_data:`reject_${userId}`}
    ]]
  }
});

    bot.sendMessage(userId,"⏳ WAIT ADMIN VERIFY");
    return;
  }

  // ➕ ADMIN STOCK ADD
  if(selectedPlan[userId]){
    msg.text.split("\n").forEach(k=>{
      if(k.trim()){
        keys[selectedPlan[userId]].push(k.trim());
      }
    });

    fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));
    bot.sendMessage(userId,
`✅ STOCK UPDATED

${selectedPlan[userId]} ➜ ${keys[selectedPlan[userId]].length}`);
    selectedPlan[userId]=null;
    return;
  }

  // 🤖 AUTO MENU
  if(msg.text && !msg.text.startsWith("/")){
    showMenu(msg.chat.id);
  }
});

// BUTTONS
bot.on("callback_query",(query)=>{

  const data = query.data;
  const userId = query.from.id;

  // PLAN SELECT
  if(data.startsWith("buy_")){
    let planId = data.split("_")[1];

    userPlan[userId] = { ...plans[planId], id: planId };

    bot.sendPhoto(userId,QR_LINK,{
      caption:
`💰 PAYMENT DETAILS

👤 ${PAYMENT_NAME}

UPI:
\`${UPI_ID}\`

👇 CHOOSE OPTION`,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"screenshot"}],
          [{text:"💳 ENTER UTR",callback_data:"enter_utr"}]
        ]
      }
    });
  }

  // SCREENSHOT
  if(data==="screenshot"){
    waitingScreenshot[userId]=true;
    bot.sendMessage(userId,"📸 SEND SCREENSHOT");
  }

  // UTR
  if(data==="enter_utr"){
    bot.sendMessage(userId,
`🧾 ENTER YOUR UTR`,
{reply_markup:{force_reply:true}});
  }

  // ✅ VERIFY
  if(data.startsWith("approve_")){
    let uid = data.split("_")[1];
    let plan = userPlan[uid];

    const planId = plan.id;

    if (!keys[planId] || keys[planId].length === 0) {
      bot.sendMessage(ADMIN_ID, `❌ STOCK EMPTY: ${plan.name}`);
      return;
    }

    let key = keys[planId].shift();

    fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));

    let expiry = new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    bot.sendMessage(uid,
`✅ VERIFIED

━━━━━━━━━━━━━━
🔑 KEY:
\`${key}\`

📅 ${expiry.toDateString()}
━━━━━━━━━━━━━━

🚀 COBRA SERVER MOD

🔗 ${CHANNEL_LINK}

🎉 Enjoy, Have a Nice Day 🚀`,
{parse_mode:"Markdown"});
  }

  // ❌ REJECT
  if(data.startsWith("reject_")){
    let uid = data.split("_")[1];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED\n⚠️ Try Again");
  }

  // 📦 VIEW STOCK (NEW 🔥)
  if(data==="viewstock"){
    let msg = "📦 STOCK STATUS\n\n";

    for(let p in keys){
      msg += `${p.toUpperCase()} ➜ ${keys[p].length}\n`;
    }

    bot.sendMessage(userId,msg);
  }

  // ➕ ADD STOCK
  if(data==="addstock"){
    bot.sendMessage(userId,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:[
          [{text:"1 DAY",callback_data:"plan1"}],
          [{text:"7 DAY",callback_data:"plan2"}],
          [{text:"15 DAY",callback_data:"plan3"}],
          [{text:"30 DAY",callback_data:"plan4"}],
          [{text:"60 DAY",callback_data:"plan5"}]
        ]
      }
    });
  }

  if(data.startsWith("plan")){
    selectedPlan[userId]=data;
    bot.sendMessage(userId,"SEND KEYS (ONE PER LINE)");
  }
});

// ADMIN PANEL
bot.onText(/\/admin/, (msg)=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"📦 VIEW STOCK",callback_data:"viewstock"}],
        [{text:"➕ ADD STOCK",callback_data:"addstock"}]
      ]
    }
  });
});
