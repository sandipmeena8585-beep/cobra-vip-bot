const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;
const BOT_USERNAME = "GODx_cobraBOT";

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
const bot = new TelegramBot(token);
const URL = process.env.RENDER_EXTERNAL_URL;

(async ()=>{
  await bot.deleteWebHook();
  await bot.setWebHook(`${URL}/bot${token}`);
})();

app.post(`/bot${token}`, (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== DB =====
mongoose.connect(MONGO_URL);

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,utr:String,amount:Number});
const User = mongoose.model("User",{id:Number,refBy:Number,balance:{type:Number,default:0},referrals:{type:Number,default:0}});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1,ref:10,price:100},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7,ref:50,price:400},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15,ref:80,price:700},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30,ref:100,price:900},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60,ref:200,price:1200}
};

// ===== STATE =====
let userPlan={}, waitingSS={}, waitingUTR={}, userUTR={}, selectedPlan={}, useWallet={};

// ===== HOME =====
function home(id){
  bot.sendMessage(id,"🏠 COBRA PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"🛒 BUY",callback_data:"buy"}],
        [{text:"👤 ACCOUNT",callback_data:"account"}],
        [{text:"🎁 REFER",callback_data:"refer"}],
        [{text:"📊 INFO",callback_data:"info"}],
        [{text:"⚙️ HELP",callback_data:"help"}]
      ]
    }
  });
}

// ===== START =====
bot.onText(/\/start (.+)/, async (msg,match)=>{
  let id=msg.from.id;
  let ref=parseInt(match[1]);
  let exist=await User.findOne({id});
  if(!exist) await User.create({id,refBy:ref});
  home(id);
});

bot.onText(/\/start/, async msg=>{
  let id=msg.from.id;
  await User.updateOne({id},{id},{upsert:true});
  home(id);
});

// ===== MESSAGE =====
bot.on("message", async msg=>{
  let id = msg.from.id;

  if(waitingUTR[id]){
    userUTR[id]=msg.text;
    waitingUTR[id]=false;

    return bot.sendMessage(ADMIN_ID,
`USER: ${id}
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

  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
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
  let d = q.data;
  let id = q.from.id;
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

    let u=await User.findOne({id});

    return bot.sendPhoto(id,QR_LINK,{
      caption:`💳 PAYMENT

👤 ${PAYMENT_NAME}
📲 UPI: ${UPI_ID}

💰 PRICE: ₹${plans[p].price}
💸 WALLET: ₹${u?.balance||0}

Use wallet?`,
      reply_markup:{
        inline_keyboard:[
          [{text:"💸 USE WALLET",callback_data:"wallet"}],
          [{text:"📸 SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="wallet"){
    useWallet[id]=true;
    return bot.sendMessage(id,"💸 WALLET WILL BE USED");
  }

  if(d==="ss"){ waitingSS[id]=true; return bot.sendMessage(id,"SEND SCREENSHOT"); }
  if(d==="utr"){ waitingUTR[id]=true; return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}}); }

  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];

    let key=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!key) return bot.sendMessage(ADMIN_ID,"❌ NO STOCK");

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    let price=plans[userPlan[uid].id].price;
    let u=await User.findOne({id:uid});

    if(useWallet[uid] && u.balance>0){
      price -= u.balance;
      await User.updateOne({id:uid},{balance:0});
    }

    await Sale.create({user:uid,key:key.key,plan:userPlan[uid].name,expiry:exp,utr:userUTR[uid],amount:price});

    if(u?.refBy){
      await User.updateOne({id:u.refBy},{
        $inc:{balance:userPlan[uid].ref,referrals:1}
      });
    }

    bot.sendMessage(uid,
`🔑 YOUR KEY

${key.key}

🎮 LIMIT: 10-12
LEGIT PLAY SAFE

📅 EXPIRY:
${exp.toLocaleString()}`,{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN GROUP",url:CHANNEL_LINK}]
        ]
      }
    });

    bot.sendMessage(ADMIN_ID,
`💰 SALE

USER: ${uid}
KEY: ${key.key}
AMOUNT: ₹${price}`);

    delete userPlan[uid];
    delete userUTR[uid];
    return;
  }

  if(d==="account"){
    let u=await User.findOne({id});
    return bot.sendMessage(id,
`👤 ACCOUNT

💰 WALLET: ₹${u?.balance||0}
👥 REF: ${u?.referrals||0}`);
  }

  if(d==="refer"){
    return bot.sendMessage(id,
`🎁 REFER LINK

https://t.me/${BOT_USERNAME}?start=${id}`);
  }

  if(d==="info"){
    return bot.sendMessage(id,
`📊 INFO

🔥 TRUSTED SELLER
⚡ INSTANT DELIVERY
🛡️ SAFE & SECURE
💯 REAL SERVICE`);
  }

  if(d==="help"){
    return bot.sendMessage(id,
`⚙️ HELP

❌ KEY ISSUE?
❌ PAYMENT ISSUE?

📩 DM 👉 @GODx_COBRA`);
  }

  if(d==="stats"){
    if(id!==ADMIN_ID) return;

    let sales=await Sale.find();
    let total=0;
    sales.forEach(s=> total+=s.amount||0);

    return bot.sendMessage(id,
`📊 ADMIN

💰 TOTAL: ₹${total}
📦 SALES: ${sales.length}`);
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 STATS",callback_data:"stats"}]
      ]
    }
  });
});
