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
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date});
const User = mongoose.model("User",{id:Number});

// ===== PLANS =====
const plans = {
  plan1:{name:"𝐀 1 DAY",days:1},
  plan2:{name:"𝐀 7 DAY",days:7},
  plan3:{name:"𝐀 15 DAY",days:15},
  plan4:{name:"𝐀 30 DAY",days:30},
  plan5:{name:"𝐀 60 DAY",days:60}
};

// ===== STATE =====
let userPlan={}, selectedPlan={}, deleteSelect={}, waitingUTR={}, waitingSS={};

// ===== HOME =====
function home(id){
  bot.sendMessage(id,
`🏠 𝐂𝐎𝐁𝐑𝐀 𝐏𝐀𝐍𝐄𝐋
━━━━━━━━━━━━━━`,{
    reply_markup:{
      inline_keyboard:[
        [{text:"🛒 𝐁𝐔𝐘",callback_data:"buy"}],
        [{text:"👤 𝐀𝐂𝐂𝐎𝐔𝐍𝐓",callback_data:"account"}],
        [{text:"📊 𝐈𝐍𝐅𝐎",callback_data:"info"}],
        [{text:"⚙️ 𝐇𝐄𝐋𝐏",callback_data:"help"}]
      ]
    }
  });
}

// ===== START =====
bot.onText(/\/start/, async msg=>{
  await User.updateOne({id:msg.from.id},{id:msg.from.id},{upsert:true});
  home(msg.from.id);
});

// ===== MESSAGE =====
bot.on("message", async msg=>{
  let id=msg.from.id;

  // ADD STOCK
  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
      if(k.trim()) await Key.create({plan:selectedPlan[id],key:k.trim()});
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ 𝐒𝐓𝐎𝐂𝐊 𝐀𝐃𝐃𝐄𝐃");
  }

  // SCREENSHOT
  if(waitingSS[id] && msg.photo){
    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`𝐔𝐒𝐄𝐑:${id}`
    });
    waitingSS[id]=false;
    return bot.sendMessage(id,"⏳ 𝐖𝐀𝐈𝐓 𝐀𝐃𝐌𝐈𝐍");
  }

  // UTR
  if(waitingUTR[id]){
    waitingUTR[id]=false;
    return bot.sendMessage(ADMIN_ID,`𝐔𝐓𝐑\n${msg.text}`);
  }

  home(id);
});

// ===== CALLBACK =====
bot.on("callback_query", async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  if(d==="buy"){
    return bot.sendMessage(id,"𝐒𝐄𝐋𝐄𝐂𝐓 𝐏𝐋𝐀𝐍",{
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
      caption:`💳 𝐏𝐀𝐘𝐌𝐄𝐍𝐓

\`${UPI_ID}\``,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 𝐒𝐂𝐑𝐄𝐄𝐍𝐒𝐇𝐎𝐓",callback_data:"ss"}],
          [{text:"💳 𝐄𝐍𝐓𝐄𝐑 𝐔𝐓𝐑",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){ waitingSS[id]=true; return bot.sendMessage(id,"𝐒𝐄𝐍𝐃 𝐒𝐂𝐑𝐄𝐄𝐍𝐒𝐇𝐎𝐓"); }
  if(d==="utr"){ waitingUTR[id]=true; return bot.sendMessage(id,"𝐄𝐍𝐓𝐄𝐑 𝐔𝐓𝐑"); }

  // APPROVE
  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];

    let key=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!key) return;

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
          [{text:"📦 𝐉𝐎𝐈𝐍 𝐆𝐑𝐎𝐔𝐏",url:CHANNEL_LINK}]
        ]
      }
    });
  }

  if(d==="account"){
    let latest=await Sale.findOne({user:id});
    if(!latest) return bot.sendMessage(id,"❌");

    return bot.sendMessage(id,
`𝐀𝐂𝐂𝐎𝐔𝐍𝐓

𝐊𝐄𝐘 - \`${latest.key}\`

${latest.expiry}`,{parse_mode:"Markdown"});
  }

  if(d==="info"){
    return bot.sendMessage(id,
`𝐂𝐎𝐁𝐑𝐀 𝐒𝐄𝐑𝐕𝐄𝐑

ESP - 350M
AIMBOT - 150M
IPDA VIEW - YES / NO`);
  }

  if(d==="help"){
    return bot.sendMessage(id,
`𝐊𝐄𝐘 𝐈𝐒𝐒𝐔𝐄
𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐈𝐒𝐒𝐔𝐄

@GODx_COBRA`);
  }

  // ===== ADMIN =====
  if(d==="addstock"){
    if(id!==ADMIN_ID) return;
    return bot.sendMessage(id,"𝐒𝐄𝐋𝐄𝐂𝐓",{
      reply_markup:{
        inline_keyboard:Object.keys(plans).map(p=>[
          {text:plans[p].name,callback_data:`plan_${p}`}
        ])
      }
    });
  }

  if(d.startsWith("plan_")){
    selectedPlan[id]=d.replace("plan_","");
    return bot.sendMessage(id,"𝐒𝐄𝐍𝐃 𝐊𝐄𝐘𝐒");
  }

  // DELETE FLOW
  if(d==="delkey"){
    if(id!==ADMIN_ID) return;

    let buttons = Object.keys(plans).map(p=>[
      {text:plans[p].name,callback_data:`del_${p}`}
    ]);

    return bot.sendMessage(id,"𝐂𝐇𝐎𝐎𝐒𝐄 𝐏𝐋𝐀𝐍",{
      reply_markup:{inline_keyboard:buttons}
    });
  }

  if(d.startsWith("del_")){
    let plan=d.replace("del_","");
    let keys=await Key.find({plan});

    let btn = keys.slice(0,10).map(k=>[
      {text:k.key,callback_data:`rem_${k._id}`}
    ]);

    return bot.sendMessage(id,"𝐒𝐄𝐋𝐄𝐂𝐓 𝐊𝐄𝐘",{
      reply_markup:{inline_keyboard:btn}
    });
  }

  if(d.startsWith("rem_")){
    let idd=d.replace("rem_","");
    await Key.deleteOne({_id:idd});
    return bot.sendMessage(id,"🗑 𝐃𝐄𝐋𝐄𝐓𝐄𝐃");
  }
});

// ADMIN PANEL
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"𝐀𝐃𝐌𝐈𝐍",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ 𝐀𝐃𝐃",callback_data:"addstock"}],
        [{text:"🗑 𝐃𝐄𝐋𝐄𝐓𝐄",callback_data:"delkey"}]
      ]
    }
  });
});
