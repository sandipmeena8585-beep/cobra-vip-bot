const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9"; // 🔥 Paid Group Link
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";

// ===== SERVER =====
const app = express();
app.use(express.json());
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// ===== BOT =====
const bot = new TelegramBot(token,{ polling:true });

// ===== DB =====
mongoose.connect(MONGO_URL)
.then(()=>console.log("Mongo Connected ✅"))
.catch(err=>console.log("Mongo Error ❌",err));

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,utr:String});
const User = mongoose.model("User",{id:Number});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

// ===== STATE =====
let userPlan={}, waitingUTR={}, waitingSS={}, userUTR={}, selectedPlan={};

// ===== UI =====
function home(id){
  bot.sendMessage(id,
`🏠 COBRA PANEL
━━━━━━━━━━━━━━
SELECT OPTION
━━━━━━━━━━━━━━`,{
    reply_markup:{
      inline_keyboard:[
        [{text:"🛒 BUY",callback_data:"buy"}],
        [{text:"👤 ACCOUNT",callback_data:"account"}],
        [{text:"📊 INFO",callback_data:"info"}],
        [{text:"⚙️ HELP",callback_data:"help"}]
      ]
    }
  });
}

// ===== START =====
bot.onText(/\/start/, async msg=>{
  let id=msg.from.id;
  await User.updateOne({id},{id},{upsert:true});
  home(id);
});

// ===== MESSAGE =====
bot.on("message", async msg=>{
  let id = msg.from.id;

  // UTR DETECT
  if(waitingUTR[id] && msg.text){
    userUTR[id]=msg.text;
    waitingUTR[id]=false;

    return bot.sendMessage(ADMIN_ID,
`💳 PAYMENT REQUEST

USER: ${id}
PLAN: ${userPlan[id].name}
UTR: ${msg.text}`,{
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });
  }

  // SCREENSHOT DETECT
  if(waitingSS[id] && msg.photo){
    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`USER:${id}\nPLAN:${userPlan[id].name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    waitingSS[id]=false;
    return bot.sendMessage(id,"⏳ WAIT ADMIN");
  }

  // ADD STOCK
  if(selectedPlan[id]){
    let keys = msg.text.split("\n");
    for(let k of keys){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ STOCK ADDED");
  }

  if(msg.text && !msg.text.startsWith("/")){
    home(id);
  }
});

// ===== CALLBACK =====
bot.on("callback_query", async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  if(d==="buy"){
    return bot.sendMessage(id,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:Object.keys(plans).map(p=>[
          {text:plans[p].name,callback_data:`buy_${p}`}
        ])
      }
    });
  }

  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    return bot.sendPhoto(id,QR_LINK,{
      caption:
`💳 PAYMENT PANEL

👤 ${PAYMENT_NAME}

📲 UPI:
\`${UPI_ID}\`

✔ Scan QR
✔ Pay & send proof`,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SEND SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 ENTER UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){
    waitingSS[id]=true;
    return bot.sendMessage(id,"📸 SEND PAYMENT SCREENSHOT");
  }

  if(d==="utr"){
    waitingUTR[id]=true;
    return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
  }

  // APPROVE
  if(d.startsWith("approve_")){
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,
      message_id:q.message.message_id
    });

    let uid=d.split("_")[1];

    let key=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!key) return bot.sendMessage(ADMIN_ID,"❌ NO STOCK");

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    await Sale.create({
      user:uid,
      key:key.key,
      plan:userPlan[uid].name,
      expiry:exp,
      utr:userUTR[uid]
    });

    // 🔥 FINAL CHANGE: BUTTON ADDED
    bot.sendMessage(uid,
`🔑 YOUR KEY

\`${key.key}\`

━━━━━━━━━━━━━━
📅 EXPIRY:
${exp.toLocaleString()}
━━━━━━━━━━━━━━`,{
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN PAID GROUP", url: CHANNEL_LINK}]
        ]
      }
    });

    delete userPlan[uid];
    delete userUTR[uid];
  }

  if(d.startsWith("reject_")){
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,
      message_id:q.message.message_id
    });

    let uid=d.split("_")[1];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
  }

  // ACCOUNT
  if(d==="account"){
    let sales=await Sale.find({user:id});
    let txt="👤 ACCOUNT\n━━━━━━━━━━━━━━\n\n";

    sales.forEach(s=>{
      txt+=`🔑 KEY:\n\`${s.key}\`\n📅 ${s.expiry}\n\n`;
    });

    return bot.sendMessage(id,txt,{parse_mode:"Markdown"});
  }

  if(d==="info"){
    return bot.sendMessage(id,
`📊 COBRA SERVER MOD

ESP - 350M
AIMBOT - 150M
IPDA VIEW - YES / NO

SMOOTH PLAY
SAFE SYSTEM`);
  }

  if(d==="help"){
    return bot.sendMessage(id,
`⚙️ HELP

❌ PAYMENT ISSUE
❌ KEY ISSUE

DM 👉 @GODx_COBRA`);
  }

  // ADMIN
  if(d==="addstock"){
    if(id!==ADMIN_ID) return;

    return bot.sendMessage(id,"SELECT PLAN",{
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
    if(id!==ADMIN_ID) return;
    selectedPlan[id]=d;
    return bot.sendMessage(id,"SEND KEYS LINE BY LINE");
  }

  if(d==="delkey"){
    if(id!==ADMIN_ID) return;
    return bot.sendMessage(id,"SEND KEY TO DELETE");
  }
});

// ===== DELETE KEY =====
bot.on("message", async msg=>{
  if(msg.from.id===ADMIN_ID && msg.text && msg.text.length>5){
    await Key.deleteOne({key:msg.text.trim()});
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"🗑 DELETE KEY",callback_data:"delkey"}]
      ]
    }
  });
});
