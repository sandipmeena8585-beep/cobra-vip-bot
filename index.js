const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";

// ===== SERVER =====
const app = express();
app.use(express.json());

app.get("/", (req,res)=>res.send("RUNNING"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server Running on " + PORT));

// ===== BOT =====
const bot = new TelegramBot(token);
const URL = process.env.RENDER_EXTERNAL_URL;

// 🔥 IMPORTANT FIX (409 ERROR REMOVE)
(async () => {
  try {
    await bot.deleteWebHook(); // old remove
    await bot.setWebHook(`${URL}/bot${token}`);
    console.log("Webhook set ✅");
  } catch (e) {
    console.log("Webhook error ❌", e.message);
  }
})();

app.post(`/bot${token}`, (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});

const Sale = mongoose.model("Sale",{
  user:String,
  key:String,
  plan:String,
  expiry:Date,
  utr:String,
  createdAt:{type:Date,default:Date.now}
});

const User = mongoose.model("User",{id:Number});
const Log = mongoose.model("Log",{text:String,date:{type:Date,default:Date.now}});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

let userPlan={}, waitingScreenshot={}, selectedPlan={}, userUTR={};

// ===== DB =====
mongoose.connect(MONGO_URL)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log("Mongo Error ❌",err));

// ===== STOCK =====
async function getStock(){
  return `📦 LIVE STOCK

1 DAY  : ${await Key.countDocuments({plan:"plan1"})}
7 DAY  : ${await Key.countDocuments({plan:"plan2"})}
15 DAY : ${await Key.countDocuments({plan:"plan3"})}
30 DAY : ${await Key.countDocuments({plan:"plan4"})}
60 DAY : ${await Key.countDocuments({plan:"plan5"})}`;
}

// ===== REPORT =====
async function getReport(){
  const today = new Date(); today.setHours(0,0,0,0);
  const month = new Date(); month.setDate(1);

  return `📊 REPORT

TODAY: ${await Sale.countDocuments({createdAt:{$gte:today}})}
MONTH: ${await Sale.countDocuments({createdAt:{$gte:month}})}
TOTAL: ${await Sale.countDocuments()}`;
}

// ===== START =====
bot.onText(/\/start/,async msg=>{
  let id=msg.from.id;
  await User.updateOne({id},{id},{upsert:true});

  bot.sendMessage(id,"🏠 COBRA PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"🛒 BUY",callback_data:"buy"}],
        [{text:"📊 INFO",callback_data:"info"}],
        [{text:"⚙️ HELP",callback_data:"help"}]
      ]
    }
  });
});

// ===== MESSAGE =====
bot.on("message",async msg=>{
  let id = msg.from.id;

  if(msg.reply_to_message?.text?.includes("ENTER UTR")){
    userUTR[id]=msg.text;

    bot.sendMessage(ADMIN_ID,
`USER:${id}
PLAN:${userPlan[id].name}
UTR:${msg.text}`,{
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    return bot.sendMessage(id,"⏳ WAIT ADMIN");
  }

  if(waitingScreenshot[id] && msg.photo){
    bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
      caption:`USER:${id}\nPLAN:${userPlan[id].name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    waitingScreenshot[id]=false;
    return bot.sendMessage(id,"⏳ WAIT ADMIN");
  }

  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }
    selectedPlan[id]=null;
    await Log.create({text:"STOCK ADDED"});
    return bot.sendMessage(id,"✅ STOCK ADDED\n\n"+await getStock());
  }
});

// ===== BUTTON =====
bot.on("callback_query",async q=>{
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

  if(d==="info"){
    return bot.sendMessage(id,await getStock());
  }

  if(d==="help"){
    return bot.sendMessage(id,"📞 CONTACT ADMIN");
  }

  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    return bot.sendPhoto(id,QR_LINK,{
      caption:`💰 PAYMENT

👤 ${PAYMENT_NAME}
📦 ${plans[p].name}

💳 UPI: ${UPI_ID}`,
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 ENTER UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){
    waitingScreenshot[id]=true;
    return bot.sendMessage(id,"SEND SCREENSHOT");
  }

  if(d==="utr"){
    return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
  }

  if(d.startsWith("approve_")){
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,message_id:q.message.message_id
    });

    let uid=d.split("_")[1];

    let active=await Sale.findOne({user:uid,expiry:{$gt:new Date()}});
    if(active) return bot.sendMessage(uid,"❌ ACTIVE PLAN EXISTS");

    let keyData=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!keyData) return bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    await Sale.create({
      user:uid,
      key:keyData.key,
      plan:userPlan[uid].name,
      expiry:exp,
      utr:userUTR[uid]||"N/A"
    });

    await Log.create({text:`APPROVED ${uid}`});

    bot.sendMessage(uid,
`✅ VERIFIED

🔑 ${keyData.key}
📅 ${exp.toLocaleString()}`,{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN CHANNEL",url:CHANNEL_LINK}]
        ]
      }
    });

    let left=await Key.countDocuments({plan:userPlan[uid].id});
    if(left<=2){
      bot.sendMessage(ADMIN_ID,`⚠️ LOW STOCK ${userPlan[uid].name}`);
    }

    delete userPlan[uid];
    delete userUTR[uid];
  }

  if(d.startsWith("reject_")){
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{
      chat_id:q.message.chat.id,message_id:q.message.message_id
    });

    let uid=d.split("_")[1];
    await Log.create({text:`REJECT ${uid}`});

    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
    delete userPlan[uid];
  }

  if(d==="addstock"){
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

  if(d==="report"){
    return bot.sendMessage(id,await getReport());
  }

  if(d.startsWith("plan")){
    selectedPlan[id]=d;
    return bot.sendMessage(id,"SEND KEYS");
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 REPORT",callback_data:"report"}]
      ]
    }
  });
});

// ===== BROADCAST =====
bot.onText(/\/broadcast (.+)/, async (msg,match)=>{
  if(msg.from.id!==ADMIN_ID) return;

  let users=await User.find();
  for(let u of users){
    bot.sendMessage(u.id,match[1]).catch(()=>{});
  }

  bot.sendMessage(msg.chat.id,"✅ SENT");
});
