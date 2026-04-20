const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";

const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("Running"));
app.listen(process.env.PORT || 3000);

// FILE LOAD
let keys = JSON.parse(fs.readFileSync("keys.json"));
let data = JSON.parse(fs.readFileSync("data.json"));

// PLANS
const plans = {
  plan1: { name: "🗝️ 1 DAY - 100₹", days: 1 },
  plan2: { name: "🗝️ 7 DAY - 400₹", days: 7 },
  plan3: { name: "🗝️ 15 DAY - 700₹", days: 15 },
  plan4: { name: "🗝️ 30 DAY - 900₹", days: 30 },
  plan5: { name: "🗝️ 60 DAY - 1200₹", days: 60 }
};

let userPlan = {};
let selectedPlan = {};
let waitingScreenshot = {};

// MENU
function showMenu(chatId) {
  bot.sendMessage(chatId,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM KEY STORE

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

  if(waitingScreenshot[userId] && msg.photo){
    if(!userPlan[userId]){
      bot.sendMessage(userId,"⚠️ No active plan\nSelect again");
      return;
    }

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

  if(msg.reply_to_message && msg.reply_to_message.text.includes("ENTER YOUR UTR")){
    if(!userPlan[userId]){
      bot.sendMessage(userId,"⚠️ No active plan\nSelect again");
      return;
    }

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

  if(selectedPlan[userId]){
    msg.text.split("\n").forEach(k=>{
      if(k.trim()){
        keys[selectedPlan[userId]].push(k.trim());
      }
    });

    fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));

    bot.sendMessage(userId,
`✅ STOCK UPDATED

${selectedPlan[userId]}: ${keys[selectedPlan[userId]].length}`);

    selectedPlan[userId]=null;
    return;
  }

  if(msg.text && !msg.text.startsWith("/")){
    showMenu(msg.chat.id);
  }
});

// BUTTON
bot.on("callback_query",(query)=>{
  const dataBtn = query.data;
  const userId = query.from.id;

  bot.answerCallbackQuery(query.id);

  if(dataBtn.startsWith("buy_")){
    if(userPlan[userId]){
      bot.answerCallbackQuery(query.id,{text:"⚠️ Complete previous payment"});
      return;
    }

    let planId = dataBtn.split("_")[1];
    userPlan[userId] = { ...plans[planId], id: planId };

    bot.sendPhoto(userId,QR_LINK,{
      caption:
`💰 PAYMENT DETAILS

👤 ${PAYMENT_NAME}

💎 PLAN:
👉 ${plans[planId].name}

━━━━━━━━━━━━━━
UPI:
\`${UPI_ID}\`
━━━━━━━━━━━━━━`,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"screenshot"}],
          [{text:"💳 ENTER UTR",callback_data:"enter_utr"}]
        ]
      }
    });
  }

  if(dataBtn==="screenshot"){
    waitingScreenshot[userId]=true;
    bot.sendMessage(userId,"📸 SEND SCREENSHOT");
  }

  if(dataBtn==="enter_utr"){
    bot.sendMessage(userId,"🧾 ENTER YOUR UTR",{reply_markup:{force_reply:true}});
  }

  if(dataBtn.startsWith("approve_")){
    let uid = dataBtn.split("_")[1];
    let plan = userPlan[uid];
    if(!plan) return;

    const planId = plan.id;

    if (!keys[planId] || keys[planId].length === 0) {
      bot.sendMessage(ADMIN_ID, `❌ STOCK EMPTY`);
      return;
    }

    let key = keys[planId].shift();
    fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));

    let expiry = new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    data.sold.push({
      user: uid,
      key: key,
      plan: plan.name,
      expiry: expiry.toISOString()
    });

    fs.writeFileSync("data.json", JSON.stringify(data,null,2));

    delete userPlan[uid];

    bot.sendMessage(uid,
`✅ VERIFIED

🔑 KEY:
\`${key}\`

📅 ${expiry.toDateString()}

🔗 ${CHANNEL_LINK}`,
{parse_mode:"Markdown"});
  }

  if(dataBtn.startsWith("reject_")){
    let uid = dataBtn.split("_")[1];
    delete userPlan[uid];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED\nTry Again");
  }
});

// ADMIN
bot.onText(/\/admin/, (msg)=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 LIVE STOCK",callback_data:"livestock"}]
      ]
    }
  });
});
