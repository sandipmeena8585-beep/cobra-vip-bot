const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
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
mongoose.connect(MONGO_URL);

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,utr:String,createdAt:{type:Date,default:Date.now}});
const User = mongoose.model("User",{id:Number});

// ===== PLANS =====
const plans = {
  plan1:{name:"𝐀 1 DAY - 100₹",days:1},
  plan2:{name:"𝐀 7 DAY - 400₹",days:7},
  plan3:{name:"𝐀 15 DAY - 700₹",days:15},
  plan4:{name:"𝐀 30 DAY - 900₹",days:30},
  plan5:{name:"𝐀 60 DAY - 1200₹",days:60}
};

// ===== STATE =====
let userPlan={}, waitingUTR={}, waitingSS={}, userUTR={}, selectedPlan={};

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
  let id=msg.from.id;
  await User.updateOne({id},{id},{upsert:true});
  home(id);
});

// ===== MESSAGE =====
bot.on("message", async msg=>{
  let id = msg.from.id;

  if(waitingUTR[id] && msg.text){
    userUTR[id]=msg.text;
    waitingUTR[id]=false;

    return bot.sendMessage(ADMIN_ID,
`💳 𝐏𝐀𝐘𝐌𝐄𝐍𝐓

𝐔𝐒𝐄𝐑: ${id}
𝐏𝐋𝐀𝐍: ${userPlan[id].name}
𝐔𝐓𝐑: ${msg.text}`,{
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });
  }

  if(waitingSS[id] && msg.photo){
    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`𝐔𝐒𝐄𝐑: ${id}\n𝐏𝐋𝐀𝐍: ${userPlan[id].name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    waitingSS[id]=false;
    return bot.sendMessage(id,"⏳ 𝐖𝐀𝐈𝐓 𝐀𝐃𝐌𝐈𝐍");
  }

  if(selectedPlan[id]){
    msg.text.split("\n").forEach(async k=>{
      if(k.trim()) await Key.create({plan:selectedPlan[id],key:k.trim()});
    });
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ 𝐒𝐓𝐎𝐂𝐊 𝐀𝐃𝐃𝐄𝐃");
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

👤 ${PAYMENT_NAME}

📲 \`${UPI_ID}\``,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 ENTER UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){ waitingSS[id]=true; return bot.sendMessage(id,"SEND SS"); }
  if(d==="utr"){ waitingUTR[id]=true; return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}}); }

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
`🔑 𝐘𝐎𝐔𝐑 𝐊𝐄𝐘

\`${key.key}\`

📅 ${exp.toLocaleString()}`,{
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN GROUP",url:CHANNEL_LINK}]
        ]
      }
    });

    delete userPlan[uid];
  }

  if(d==="account"){
    let sales=await Sale.find({user:id}).sort({createdAt:-1});
    let txt="👤 𝐀𝐂𝐂𝐎𝐔𝐍𝐓\n\n";

    sales.forEach((s,i)=>{
      if(i===0){
        txt+=`🔥 𝐋𝐀𝐓𝐄𝐒𝐓

\`${s.key}\`
${s.expiry}\n\n`;
      } else {
        txt+=`• \`${s.key}\`\n`;
      }
    });

    return bot.sendMessage(id,txt,{parse_mode:"Markdown"});
  }

  if(d==="info"){
    return bot.sendMessage(id,
`📊 𝐂𝐎𝐁𝐑𝐀 𝐒𝐄𝐑𝐕𝐄𝐑

ESP - 350M
AIMBOT - 150M
IPDA VIEW - YES / NO`);
  }

  // ADMIN PANEL
  if(d==="adminstats"){
    if(id!==ADMIN_ID) return;

    let sold=await Sale.countDocuments();
    let expired=await Sale.countDocuments({expiry:{$lt:new Date()}});
    let stock=await Key.countDocuments();

    let txt=`📊 𝐀𝐃𝐌𝐈𝐍

📦 STOCK: ${stock}
💰 SOLD: ${sold}
⏳ EXPIRED: ${expired}\n\n`;

    for(let p in plans){
      let c=await Key.countDocuments({plan:p});
      txt+=`${plans[p].name}: ${c}\n`;
    }

    return bot.sendMessage(id,txt);
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"𝐀𝐃𝐌𝐈𝐍",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 STATS",callback_data:"adminstats"}]
      ]
    }
  });
});
