const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = process.env.BOT_TOKEN || "8304628992:AAE0fBI3L_h8tGq3OtyNXgyJwmBfCWNczG8";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";

const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

// 🔥 WEBHOOK BOT (ONLY CHANGE)
const bot = new TelegramBot(token);

const app = express();
app.use(express.json());

// 🔗 WEBHOOK SET
const url = process.env.RENDER_EXTERNAL_URL;
bot.setWebHook(`${url}/bot${token}`);

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// SERVER
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// SAFE LOAD
function loadJSON(file, def){
  try{
    return JSON.parse(fs.readFileSync(file));
  }catch{
    fs.writeFileSync(file, JSON.stringify(def,null,2));
    return def;
  }
}

let keys = loadJSON("keys.json",{
  plan1:[], plan2:[], plan3:[], plan4:[], plan5:[]
});

let data = loadJSON("data.json",{ sold:[] });

// PLANS (same)
const plans = {
  plan1: { name: "🗝️ 1 HOUR - 30₹", days: 0.04 },
  plan2: { name: "🗝️ 3 HOUR - 50₹", days: 0.12 },
  plan3: { name: "🗝️ 5 HOUR - 80₹", days: 0.2 },
  plan4: { name: "🗝️ 1 DAY - 120₹", days: 1 },
  plan5: { name: "🗝️ 7 DAY - 400₹", days: 7 }
};

let userPlan = {};
let selectedPlan = {};
let waitingScreenshot = {};

// MENU
function showMenu(chatId){
  bot.sendMessage(chatId,
`🔥 COBRA SERVER MOD 🔥

💎 PREMIUM KEY STORE

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY
🔐 SECURE ACCESS
━━━━━━━━━━━━━━━━━━

👇 SELECT YOUR PLAN`,
{
  reply_markup:{
    inline_keyboard:[
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
bot.onText(/\/start/, (msg)=> showMenu(msg.chat.id));

// MESSAGE
bot.on("message",(msg)=>{
  const userId = msg.from.id;

  if(waitingScreenshot[userId] && msg.photo){

    if(!userPlan[userId]){
      bot.sendMessage(userId,"⚠️ Select plan again");
      return;
    }

    let plan = userPlan[userId];

    bot.sendPhoto(ADMIN_ID, msg.photo[msg.photo.length-1].file_id,{
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
      bot.sendMessage(userId,"⚠️ Select plan again");
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

  console.log("CLICK:", dataBtn);

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

    if(!keys[planId] || keys[planId].length===0){
      bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");
      return;
    }

    let key = keys[planId].shift();
    fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));

    let expiry = new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    data.sold.push({
      user:uid,
      key:key,
      plan:plan.name,
      expiry:expiry.toISOString()
    });

    fs.writeFileSync("data.json",JSON.stringify(data,null,2));

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
    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
  }
});
