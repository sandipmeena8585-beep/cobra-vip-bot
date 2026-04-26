const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = process.env.BOT_TOKEN || "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";

const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// SAFE FILE LOAD
function loadJSON(file, def){
  try{
    return JSON.parse(fs.readFileSync(file));
  }catch{
    fs.writeFileSync(file, JSON.stringify(def,null,2));
    return def;
  }
}

// SAFE SAVE
function saveJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

// LOAD DATA
let keys = loadJSON("keys.json",{
  plan1:[], plan2:[], plan3:[], plan4:[], plan5:[]
});

let data = loadJSON("data.json",{ sold:[] });

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
function showMenu(chatId){
  bot.sendMessage(chatId,
`🔥 COBRA VIP PANEL 🔥

💎 PREMIUM KEY STORE

━━━━━━━━━━━━━━━━━━
⚡ FAST DELIVERY
🔐 SECURE ACCESS
━━━━━━━━━━━━━━━━━━

👇 SELECT YOUR PLAN`,
{
  reply_markup:{
    inline_keyboard:Object.keys(plans).map(p=>[
      { text: plans[p].name, callback_data: `buy_${p}` }
    ])
  }
});
}

// START
bot.onText(/\/start/, (msg)=> showMenu(msg.chat.id));

// MESSAGE
bot.on("message",(msg)=>{
  const userId = msg.from.id;

  // SCREENSHOT
  if(waitingScreenshot[userId] && msg.photo){

    let plan = userPlan[userId];
    if(!plan){
      bot.sendMessage(userId,"⚠️ Select plan again");
      return;
    }

    bot.sendPhoto(ADMIN_ID, msg.photo[msg.photo.length-1].file_id,{
      caption:`📸 PAYMENT PROOF\nUSER: ${userId}\nPLAN: ${plan.name}`,
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
    let plan = userPlan[userId];
    if(!plan){
      bot.sendMessage(userId,"⚠️ Select plan again");
      return;
    }

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

  // ADD STOCK
  if(selectedPlan[userId]){
    msg.text.split("\n").forEach(k=>{
      if(k.trim()){
        keys[selectedPlan[userId]].push(k.trim());
      }
    });

    saveJSON("keys.json",keys);

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

// BUTTONS
bot.on("callback_query",(query)=>{
  const dataBtn = query.data;
  const userId = query.from.id;

  bot.answerCallbackQuery(query.id);

  // BUY
  if(dataBtn.startsWith("buy_")){
    let planId = dataBtn.split("_")[1];
    userPlan[userId] = { ...plans[planId], id: planId };

    bot.sendPhoto(userId,QR_LINK,{
      caption:`💰 PAYMENT DETAILS

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

  // SCREENSHOT BTN
  if(dataBtn==="screenshot"){
    waitingScreenshot[userId]=true;
    bot.sendMessage(userId,"📸 SEND SCREENSHOT");
  }

  // UTR BTN
  if(dataBtn==="enter_utr"){
    bot.sendMessage(userId,"🧾 ENTER YOUR UTR",{reply_markup:{force_reply:true}});
  }

  // APPROVE
  if(dataBtn.startsWith("approve_")){

    // 🔥 hide buttons
    bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });

    let uid = dataBtn.split("_")[1];
    let plan = userPlan[uid];
    if(!plan) return;

    let planId = plan.id;

    if(!keys[planId] || keys[planId].length===0){
      bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");
      return;
    }

    let key = keys[planId].shift();
    saveJSON("keys.json",keys);

    let expiry = new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    data.sold.push({
      user:uid,
      key:key,
      plan:plan.name,
      expiry:expiry.toISOString()
    });

    saveJSON("data.json",data);

    delete userPlan[uid];

    bot.sendMessage(uid,
`✅ VERIFIED

🔑 KEY:
\`${key}\`

📅 ${expiry.toDateString()}

🔗 ${CHANNEL_LINK}`,
{parse_mode:"Markdown"});
  }

  // REJECT
  if(dataBtn.startsWith("reject_")){

    // 🔥 hide buttons
    bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });

    let uid = dataBtn.split("_")[1];
    delete userPlan[uid];

    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
  }

  // ADMIN
  if(dataBtn==="addstock"){
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

  if(dataBtn.startsWith("plan")){
    selectedPlan[userId]=dataBtn;
    bot.sendMessage(userId,"SEND KEYS (ONE PER LINE)");
  }

});

// ADMIN PANEL
bot.onText(/\/admin/, (msg)=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}]
      ]
    }
  });
});
