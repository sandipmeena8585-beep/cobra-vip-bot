const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://sandipmeena8585_db_user:Tck2CfHfuw2Odb2k@cluster0.uqwcyyn.mongodb.net/?appName=Cluster0";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";

// ===== BOT =====
const bot = new TelegramBot(token, {
  polling: { interval: 300, autoStart: true }
});

// ===== SERVER =====
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000, ()=>console.log("Server running"));

// ===== DB =====
mongoose.connect(MONGO_URL)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

// ===== MODELS =====
const Key = mongoose.model("Key", {
  plan:String,
  key:String
});

const Sale = mongoose.model("Sale", {
  user:String,
  key:String,
  plan:String,
  expiry:String
});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

let userPlan={}, selectedPlan={}, waitingScreenshot={};

// ===== HOME =====
function showHome(id){
  bot.sendMessage(id,
`🏠 COBRA PANEL

💎 PREMIUM ACCESS

👇 SELECT OPTION`,
{
  reply_markup:{
    inline_keyboard:[
      [{text:"🛒 BUY",callback_data:"buy"}],
      [{text:"📊 INFO",callback_data:"info"}],
      [{text:"⚙️ HELP",callback_data:"help"}]
    ]
  }
});
}

// ===== START =====
bot.onText(/\/start/,msg=>showHome(msg.chat.id));

// ===== MESSAGE =====
bot.on("message",async msg=>{
  let id = msg.from.id;

  // SCREENSHOT
  if(waitingScreenshot[id] && msg.photo){
    let plan=userPlan[id];
    if(!plan) return showHome(id);

    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`📸 PAYMENT\nUSER:${id}\nPLAN:${plan.name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    bot.sendMessage(id,"⏳ WAIT ADMIN VERIFY");
    waitingScreenshot[id]=false;
    return;
  }

  // ADD STOCK
  if(selectedPlan[id]){
    let lines = msg.text.split("\n");

    for(let k of lines){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }

    bot.sendMessage(id,"✅ STOCK ADDED SUCCESS");
    selectedPlan[id]=null;
    return;
  }

  // RANDOM MSG → HOME
  if(msg.text && !msg.text.startsWith("/")){
    showHome(id);
  }
});

// ===== BUTTONS =====
bot.on("callback_query",async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  // BUY PANEL
  if(d==="buy"){
    return bot.sendMessage(id,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:Object.keys(plans).map(p=>[
          {text:plans[p].name,callback_data:`buy_${p}`}
        ])
      }
    });
  }

  // INFO
  if(d==="info"){
    return bot.sendMessage(id,
`💎 FULL TRUST 😎  
❌ NO SCAM  
⚡ FAST DELIVERY  

JOIN BELOW 👇`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN NOW",url:CHANNEL_LINK}]
        ]
      }
    });
  }

  // HELP
  if(d==="help"){
    return bot.sendMessage(id,
`⚙️ HELP

1. SELECT PLAN  
2. PAY  
3. SEND SCREENSHOT  
4. GET KEY  

CONTACT: @GODx_COBRA`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"💬 OPEN DM",url:"https://t.me/GODx_COBRA"}]
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
          [{text:"📸 SEND SCREENSHOT",callback_data:"ss"}]
        ]
      }
    });
  }

  if(d==="ss"){
    waitingScreenshot[id]=true;
    bot.sendMessage(id,"📸 SEND SCREENSHOT");
  }

  // APPROVE
  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];
    let plan=userPlan[uid];
    if(!plan) return;

    let keyData = await Key.findOneAndDelete({plan:plan.id});
    if(!keyData) return bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");

    let expiry=new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    await Sale.create({
      user:uid,
      key:keyData.key,
      plan:plan.name,
      expiry:expiry.toISOString()
    });

    bot.sendMessage(uid,
`✅ VERIFIED

🔑 KEY:
\`${keyData.key}\`

📅 ${expiry.toDateString()}`,
{
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN NOW",url:CHANNEL_LINK}]
        ]
      }
    });

    delete userPlan[uid];
  }

  // REJECT
  if(d.startsWith("reject_")){
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

  if(d.startsWith("plan")){
    selectedPlan[id]=d;
    bot.sendMessage(id,"SEND KEYS (ONE PER LINE)");
  }
});

// ===== ADMIN PANEL =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}]
      ]
    }
  });
});

// ===== CRASH FIX =====
process.on("uncaughtException", err=>console.log(err));
process.on("unhandledRejection", err=>console.log(err));
