const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// CONFIG
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const ADMIN_ID = 7707237527;
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const UPI_ID = "godxcobra@axl";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// BOT
const bot = new TelegramBot(token,{polling:true});

// DB
mongoose.connect(MONGO_URL);

// MODELS
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,utr:String});
const User = mongoose.model("User",{id:Number});
const UsedUTR = mongoose.model("UsedUTR",{utr:String});

// PLANS
const plans = {
  plan1:{name:"1 DAY",days:1},
  plan2:{name:"7 DAY",days:7},
  plan3:{name:"15 DAY",days:15},
  plan4:{name:"30 DAY",days:30},
  plan5:{name:"60 DAY",days:60}
};

// STATE
let userPlan={}, selectedPlan={}, waitingUTR={}, waitingSS={}, lockedUser={};

// HOME
function home(id){
  bot.sendMessage(id,"𝐂𝐎𝐁𝐑𝐀 𝐏𝐀𝐍𝐄𝐋",{
    reply_markup:{
      inline_keyboard:[
        [{text:"BUY",callback_data:"buy"}],
        [{text:"ACCOUNT",callback_data:"account"}],
        [{text:"INFO",callback_data:"info"}],
        [{text:"HELP",callback_data:"help"}]
      ]
    }
  });
}

// START
bot.onText(/\/start/,async msg=>{
  await User.updateOne({id:msg.from.id},{id:msg.from.id},{upsert:true});
  home(msg.from.id);
});

// MESSAGE
bot.on("message",async msg=>{
  let id=msg.from.id;

  // LOCK SYSTEM
  if(lockedUser[id]){
    return bot.sendMessage(id,"⛔ WAIT ADMIN VERIFY");
  }

  // ADD STOCK
  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
      if(k.trim()) await Key.create({plan:selectedPlan[id],key:k.trim()});
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"STOCK ADDED");
  }

  // UTR
  if(waitingUTR[id]){
    waitingUTR[id]=false;

    let exist = await UsedUTR.findOne({utr:msg.text});
    if(exist) return bot.sendMessage(id,"❌ UTR ALREADY USED");

    await UsedUTR.create({utr:msg.text});
    lockedUser[id]=true;

    return bot.sendMessage(ADMIN_ID,
`PAYMENT

USER: ${id}
PLAN: ${userPlan[id].name}
UTR: ${msg.text}`,{
      reply_markup:{
        inline_keyboard:[[
          {text:"VERIFY",callback_data:`approve_${id}`},
          {text:"REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });
  }

  // SCREENSHOT
  if(waitingSS[id] && msg.photo){
    waitingSS[id]=false;
    lockedUser[id]=true;

    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`USER:${id}\nPLAN:${userPlan[id].name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"VERIFY",callback_data:`approve_${id}`},
          {text:"REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    return bot.sendMessage(id,"⛔ WAIT ADMIN VERIFY");
  }

  if(msg.text && !msg.text.startsWith("/")){
    home(id);
  }
});

// CALLBACK
bot.on("callback_query",async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  if(d==="buy"){
    if(lockedUser[id]) return bot.sendMessage(id,"⛔ WAIT OLD REQUEST");

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
      caption:`PAYMENT\n\`${UPI_ID}\``,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"ENTER UTR",callback_data:"utr"}],
          [{text:"SEND SCREENSHOT",callback_data:"ss"}]
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
    if(!key) return;

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    await Sale.create({user:uid,key:key.key,plan:userPlan[uid].name,expiry:exp});

    bot.sendMessage(uid,
`ENJOY COBRA SERVER  

KEY - \`${key.key}\`  

KILL LIMIT 10 12 LEGIT PLAY SAFE`,
{
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"JOIN GROUP",url:CHANNEL_LINK}]
        ]
      }
    });

    lockedUser[uid]=false;
    delete userPlan[uid];
  }

  // REJECT
  if(d.startsWith("reject_")){
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,
      message_id:q.message.message_id
    });

    let uid=d.split("_")[1];
    bot.sendMessage(uid,"❌ REJECTED");
    lockedUser[uid]=false;
  }

  // बाकी old system same...
});
