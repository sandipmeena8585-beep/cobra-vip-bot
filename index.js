const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = process.env.BOT_TOKEN || "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const ADMIN_ID = 7707237527;

// ✅ UPDATED
const CHANNEL_LINK = "https://t.me/+EjfiC_Zsw3liYmI9";

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// FILE SYSTEM SAFE
function loadJSON(file, def){
  try{
    return JSON.parse(fs.readFileSync(file));
  }catch{
    fs.writeFileSync(file, JSON.stringify(def,null,2));
    return def;
  }
}
function saveJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

// DATA
let keys = loadJSON("keys.json",{ plan1:[],plan2:[],plan3:[],plan4:[],plan5:[] });
let data = loadJSON("data.json",{ sold:[] });

// PLANS
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

let userPlan={}, selectedPlan={}, waitingScreenshot={};

// ADMIN STOCK
function getStockText(){
  return `📦 LIVE STOCK

1 DAY : ${keys.plan1.length}
7 DAY : ${keys.plan2.length}
15 DAY : ${keys.plan3.length}
30 DAY : ${keys.plan4.length}
60 DAY : ${keys.plan5.length}`;
}

// REPORT
function getFullReport(){
  let text = `📊 FULL REPORT

${getStockText()}

━━━━━━━━━━━━━━
💰 TOTAL SOLD : ${data.sold.length}
━━━━━━━━━━━━━━

🧾 LAST 10 SALES:
`;

  let last = data.sold.slice(-10).reverse();
  last.forEach(s=>{
    text += `

👤 ${s.user}
🔑 ${s.key}
📦 ${s.plan}
📅 ${new Date(s.expiry).toDateString()}
━━━━━━━━━━━━`;
  });

  return text;
}

// HOME UI
function showHome(chatId){
  bot.sendMessage(chatId,
`🏠 𝗖𝗢𝗕𝗥𝗔 𝗔𝗣𝗣

━━━━━━━━━━━━━━
💎 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 𝐀𝐂𝐂𝐄𝐒𝐒
━━━━━━━━━━━━━━

👇 SELECT OPTION`,
{
  reply_markup:{
    inline_keyboard:[
      [
        {text:"🛒 BUY",callback_data:"app_buy"},
        {text:"📊 INFO",callback_data:"app_info"}
      ],
      [
        {text:"⚙️ HELP",callback_data:"app_help"}
      ]
    ]
  }
});
}

// START
bot.onText(/\/start/,msg=>showHome(msg.chat.id));

// MESSAGE HANDLER
bot.on("message",msg=>{
  let id = msg.from.id;

  // SCREENSHOT
  if(waitingScreenshot[id] && msg.photo){
    let plan=userPlan[id];
    if(!plan) return showHome(id);

    bot.sendPhoto(ADMIN_ID,msg.photo[msg.photo.length-1].file_id,{
      caption:`📸 PAYMENT\nUSER:${id}\nPLAN:${plan.name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    bot.sendMessage(id,"⏳ WAIT ADMIN");
    waitingScreenshot[id]=false;
    return;
  }

  // UTR
  if(msg.reply_to_message && msg.reply_to_message.text.includes("ENTER YOUR UTR")){
    let plan=userPlan[id];
    if(!plan) return showHome(id);

    bot.sendMessage(ADMIN_ID,
`📥 PAYMENT REQUEST

USER:${id}
PLAN:${plan.name}
UTR:${msg.text}`,
{
  reply_markup:{
    inline_keyboard:[[
      {text:"✅ VERIFY",callback_data:`approve_${id}`},
      {text:"❌ REJECT",callback_data:`reject_${id}`}
    ]]
  }
});

    bot.sendMessage(id,"⏳ WAIT ADMIN");
    return;
  }

  // ADD STOCK
  if(selectedPlan[id]){
    msg.text.split("\n").forEach(k=>{
      if(k.trim()) keys[selectedPlan[id]].push(k.trim());
    });

    saveJSON("keys.json",keys);

    bot.sendMessage(id,`✅ STOCK UPDATED\n${getStockText()}`);
    bot.sendMessage(ADMIN_ID,`📢 STOCK UPDATED\n\n${getStockText()}`);

    selectedPlan[id]=null;
    return;
  }

  // RANDOM MSG → HOME (SAFE)
  if(msg.text && !msg.text.startsWith("/") && !msg.reply_to_message){
    showHome(msg.chat.id);
  }
});

// BUTTONS
bot.on("callback_query",q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  if(d==="app_home") return showHome(id);

  // BUY
  if(d==="app_buy"){
    return bot.sendMessage(id,"🛒 SELECT PLAN",{
      reply_markup:{
        inline_keyboard:[
          ...Object.keys(plans).map(p=>[
            {text:plans[p].name,callback_data:`buy_${p}`}
          ]),
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  // INFO
  if(d==="app_info"){
    return bot.sendMessage(id,
`📊 INFO

💎 FULL TRUST 😎
🚫 NO SCAM ❌
⚡ FAST DELIVERY
🔐 SAFE SYSTEM`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN CHANNEL",url:CHANNEL_LINK}],
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  // HELP
  if(d==="app_help"){
    return bot.sendMessage(id,
`⚙️ HELP

1. Select plan
2. Pay UPI
3. Send proof
4. Get key`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"💬 OPEN DM",url:"https://t.me/GODx_COBRA"}],
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  // BUY FLOW
  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    bot.sendPhoto(id,QR_LINK,{
      caption:`💰 PAYMENT

👤 ${PAYMENT_NAME}
📦 ${plans[p].name}

UPI:
\`${UPI_ID}\``,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"screenshot"}],
          [{text:"💳 ENTER UTR",callback_data:"enter_utr"}]
        ]
      }
    });
  }

  if(d==="screenshot"){
    waitingScreenshot[id]=true;
    bot.sendMessage(id,"📸 SEND SCREENSHOT");
  }

  if(d==="enter_utr"){
    bot.sendMessage(id,"ENTER YOUR UTR",{reply_markup:{force_reply:true}});
  }

  // APPROVE
  if(d.startsWith("approve_")){
    bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,message_id:q.message.message_id
    });

    let uid=d.split("_")[1];
    let plan=userPlan[uid];
    if(!plan) return;

    let key=keys[plan.id].shift();
    if(!key) return bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");

    saveJSON("keys.json",keys);

    let expiry=new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    data.sold.push({user:uid,key,plan:plan.name,expiry:expiry.toISOString()});
    saveJSON("data.json",data);

    bot.sendMessage(ADMIN_ID,
`✅ KEY SOLD

USER:${uid}
PLAN:${plan.name}
KEY:${key}

${getStockText()}`);

    bot.sendMessage(uid,
`✅ VERIFIED

🔑 \`${key}\`
📅 ${expiry.toDateString()}
🔗 ${CHANNEL_LINK}`,
{parse_mode:"Markdown"});

    delete userPlan[uid];
  }

  // REJECT
  if(d.startsWith("reject_")){
    bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,message_id:q.message.message_id
    });

    let uid=d.split("_")[1];
    delete userPlan[uid];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
  }

  // ADMIN
  if(d==="addstock"){
    bot.sendMessage(id,"SELECT PLAN",{
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

  if(d==="full_report") return bot.sendMessage(id,getFullReport());
  if(d==="check_stock") return bot.sendMessage(id,getStockText());

  if(d.startsWith("plan")){
    selectedPlan[id]=d;
    bot.sendMessage(id,"SEND KEYS (ONE PER LINE)");
  }
});

// ADMIN PANEL
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 FULL REPORT",callback_data:"full_report"}],
        [{text:"📦 CHECK STOCK",callback_data:"check_stock"}]
      ]
    }
  });
});
