const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const ADMIN_ID = 7707237527;
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const UPI_ID = "godxcobra@axl";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";

// ===== SERVER =====
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// ===== BOT =====
const bot = new TelegramBot(token,{polling:true});

// ===== DB =====
mongoose.connect(MONGO_URL);

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,createdAt:{type:Date,default:Date.now}});
const User = mongoose.model("User",{id:Number});

// ===== PLANS =====
const plans = {
  plan1:{name:"1 DAY",days:1},
  plan2:{name:"7 DAY",days:7},
  plan3:{name:"15 DAY",days:15},
  plan4:{name:"30 DAY",days:30},
  plan5:{name:"60 DAY",days:60}
};

// ===== STATE =====
let userPlan={}, selectedPlan={}, waitingUTR={}, waitingSS={}, deleteMode={};

// ===== HOME =====
function home(id){
  bot.sendMessage(id,
`🏠 𝐂𝐎𝐁𝐑𝐀 𝐏𝐀𝐍𝐄𝐋`,{
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
bot.onText(/\/start/,async msg=>{
  await User.updateOne({id:msg.from.id},{id:msg.from.id},{upsert:true});
  home(msg.from.id);
});

// ===== MESSAGE =====
bot.on("message",async msg=>{
  let id=msg.from.id;

  // ADD STOCK
  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
      if(k.trim()) await Key.create({plan:selectedPlan[id],key:k.trim()});
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ STOCK ADDED");
  }

  // DELETE KEY
  if(deleteMode[id]){
    await Key.deleteOne({key:msg.text.trim()});
    deleteMode[id]=false;
    return bot.sendMessage(id,"🗑 KEY DELETED");
  }

  // UTR
  if(waitingUTR[id]){
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

  // SCREENSHOT
  if(waitingSS[id] && msg.photo){
    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`USER: ${id}\nPLAN: ${userPlan[id].name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"VERIFY",callback_data:`approve_${id}`},
          {text:"REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    waitingSS[id]=false;
    return bot.sendMessage(id,"⏳ WAIT ADMIN");
  }

  if(msg.text && !msg.text.startsWith("/")){
    home(id);
  }
});

// ===== CALLBACK =====
bot.on("callback_query",async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  // BUY
  if(d==="buy"){
    return bot.sendMessage(id,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:Object.keys(plans).map(p=>[
          {text:plans[p].name,callback_data:`buy_${p}`}
        ])
      }
    });
  }

  // SELECT PLAN
  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    return bot.sendPhoto(id,QR_LINK,{
      caption:`💳 PAYMENT

UPI:
\`${UPI_ID}\`

SEND SCREENSHOT OR ENTER UTR`,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SEND SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 ENTER UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="utr"){
    waitingUTR[id]=true;
    return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
  }

  if(d==="ss"){
    waitingSS[id]=true;
    return bot.sendMessage(id,"SEND SCREENSHOT");
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

    await Sale.create({user:uid,key:key.key,plan:userPlan[uid].name,expiry:exp});

    bot.sendMessage(uid,
`𝐄𝐍𝐉𝐎𝐘 𝐂𝐎𝐁𝐑𝐀 𝐒𝐄𝐑𝐕𝐄𝐑  

𝐊𝐄𝐘 - \`${key.key}\`  

𝐊𝐈𝐋𝐋 𝐋𝐈𝐌𝐈𝐓 10 12 𝐋𝐄𝐆𝐈𝐓 𝐏𝐋𝐀𝐘 𝐒𝐀𝐅𝐄`,
{
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN PAID GROUP",url:CHANNEL_LINK}]
        ]
      }
    });

    delete userPlan[uid];
  }

  // REJECT
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
    let latest=await Sale.findOne({user:id}).sort({createdAt:-1});
    if(!latest) return bot.sendMessage(id,"❌ NO PLAN");

    return bot.sendMessage(id,
`👤 ACCOUNT

KEY - \`${latest.key}\`

EXPIRE: ${latest.expiry.toLocaleString()}`,
{parse_mode:"Markdown"});
  }

  // INFO
  if(d==="info"){
    return bot.sendMessage(id,
`📊 COBRA SERVER

ESP - 350M
AIMBOT - 150M
IPDA VIEW - YES / NO`);
  }

  // HELP
  if(d==="help"){
    return bot.sendMessage(id,
`KEY ISSUE
PAYMENT ISSUE

CONTACT OWNER - @GODx_COBRA`);
  }

  // ADMIN
  if(d==="addstock"){
    if(id!==ADMIN_ID) return;

    return bot.sendMessage(id,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:Object.keys(plans).map(p=>[
          {text:plans[p].name,callback_data:`plan_${p}`}
        ])
      }
    });
  }

  if(d.startsWith("plan_")){
    selectedPlan[id]=d.replace("plan_","");
    return bot.sendMessage(id,"SEND KEYS LINE BY LINE");
  }

  if(d==="delkey"){
    if(id!==ADMIN_ID) return;
    deleteMode[id]=true;
    return bot.sendMessage(id,"SEND KEY TO DELETE");
  }

  // STATS
  if(d==="stats"){
    if(id!==ADMIN_ID) return;

    let stock=await Key.countDocuments();
    let sold=await Sale.countDocuments();
    let expired=await Sale.countDocuments({expiry:{$lt:new Date()}});

    let txt=`📊 ADMIN STATS

STOCK: ${stock}
SOLD: ${sold}
EXPIRED: ${expired}\n\n`;

    for(let p in plans){
      let c=await Key.countDocuments({plan:p});
      txt+=`${plans[p].name}: ${c}\n`;
    }

    return bot.sendMessage(id,txt);
  }
});

// ===== ADMIN PANEL =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"🗑 DELETE KEY",callback_data:"delkey"}],
        [{text:"📊 STATS",callback_data:"stats"}]
      ]
    }
  });
});
