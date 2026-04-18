const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = process.env.8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4;
const ADMIN_ID = Number(process.env.7707237527;

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";

const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("Running"));
app.listen(process.env.PORT || 3000);

// SAFE FILE LOAD
function safeLoad(file, def){
  try{
    if(!fs.existsSync(file)){
      fs.writeFileSync(file, JSON.stringify(def,null,2));
      return def;
    }
    return JSON.parse(fs.readFileSync(file));
  }catch{
    return def;
  }
}

function safeWrite(file, obj){
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj,null,2));
  fs.renameSync(tmp, file);
}

let keys = safeLoad("keys.json", {
  plan1:[], plan2:[], plan3:[], plan4:[], plan5:[]
});

let data = safeLoad("data.json", { sold: [] });

// RATE LIMIT
let rate = {};
function isSpam(uid){
  let now = Date.now();
  if(rate[uid] && now - rate[uid] < 2000) return true;
  rate[uid] = now;
  return false;
}

// UTR STORAGE
let usedUTR = new Set();

// 🔥 NEW PLANS
const plans = {
  plan1: { name: "🟢 1 HOUR - 30₹", hours: 1 },
  plan2: { name: "🟢 3 HOUR - 50₹", hours: 3 },
  plan3: { name: "🟢 5 HOUR - 80₹", hours: 5 },
  plan4: { name: "🟢 1 DAY - 120₹", days: 1 },
  plan5: { name: "🟢 7 DAY - 400₹", days: 7 }
};

let userPlan = {};
let selectedPlan = {};
let waitingScreenshot = {};

// MENU
function showMenu(chatId) {
  bot.sendMessage(chatId,
`🔥 DEFENDER SERVER OFFICIAL 🔥

💎 DEFENDER PANEL

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY
🔐 SECURE ACCESS
💰 INSTANT SERVICE
━━━━━━━━━━━━━━━━━━

📦 SELECT YOUR PLAN 👇`,
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
  if(isSpam(userId)) return;

  // SCREENSHOT
  if(waitingScreenshot[userId] && msg.photo){
    let plan = userPlan[userId];
    if(!plan) return;

    bot.sendPhoto(ADMIN_ID, msg.photo[msg.photo.length-1].file_id, {
      caption:`📸 PAYMENT PROOF

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

  // UTR
  if(msg.reply_to_message && msg.reply_to_message.text.includes("ENTER YOUR UTR")){
    let utr = msg.text.trim();

    if(!/^\d{12}$/.test(utr)){
      bot.sendMessage(userId,"❌ INVALID UTR (12 DIGIT)");
      return;
    }

    if(usedUTR.has(utr)){
      bot.sendMessage(userId,"❌ UTR ALREADY USED");
      return;
    }

    usedUTR.add(utr);

    let plan = userPlan[userId];
    if(!plan) return;

    bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

USER: ${userId}
PLAN: ${plan.name}

UTR: ${utr}`,
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
});

// BUTTONS
bot.on("callback_query",(query)=>{
  const dataBtn = query.data;
  const userId = query.from.id;

  // PLAN SELECT
  if(dataBtn.startsWith("buy_")){
    let planId = dataBtn.split("_")[1];
    userPlan[userId] = { ...plans[planId], id: planId };

    bot.sendPhoto(userId,QR_LINK,{
      caption:
`💰 PAYMENT DETAILS

👤 NAME: ${PAYMENT_NAME}

💎 PLAN:
${plans[planId].name}

━━━━━━━━━━━━━━━━━━
🏦 UPI:
\`${UPI_ID}\`
━━━━━━━━━━━━━━━━━━

📌 PAY & SUBMIT`,
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

  // VERIFY
  if(dataBtn.startsWith("approve_")){
    if(query.from.id != ADMIN_ID) return;

    let uid = dataBtn.split("_")[1];
    let plan = userPlan[uid];
    if(!plan) return;

    let planId = plan.id;

    if(!keys[planId] || keys[planId].length===0){
      bot.sendMessage(ADMIN_ID,"❌ NO STOCK");
      return;
    }

    let key = keys[planId].shift();
    safeWrite("keys.json",keys);

    let expiry = new Date();

    if(plan.hours){
      expiry.setHours(expiry.getHours()+plan.hours);
    } else {
      expiry.setDate(expiry.getDate()+plan.days);
    }

    data.sold.push({user:uid,key,plan:plan.name,expiry});
    safeWrite("data.json",data);

    bot.sendMessage(uid,
`✅ PAYMENT VERIFIED

━━━━━━━━━━━━━━━━━━
🔑 KEY:
\`${key}\`

📅 VALID:
${expiry}
━━━━━━━━━━━━━━━━━━

🔗 ${CHANNEL_LINK}

🎉 ENJOY`,
{parse_mode:"Markdown"});

    delete userPlan[uid];
  }

  // REJECT
  if(dataBtn.startsWith("reject_")){
    if(query.from.id != ADMIN_ID) return;
    let uid = dataBtn.split("_")[1];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
  }
});

// ERROR SAFE
process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);
