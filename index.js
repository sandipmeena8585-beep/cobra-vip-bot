const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;
const BOT_USERNAME = "GODx_cobraBOT";

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";

// ===== SERVER =====
const app = express();
app.use(express.json());
app.get("/", (req,res)=>res.sendStatus(404));
app.listen(process.env.PORT || 3000);

// ===== BOT =====
const bot = new TelegramBot(token);
const URL = process.env.RENDER_EXTERNAL_URL;

(async () => {
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

const Sale = mongoose.model("Sale",{
  user:String,
  key:String,
  plan:String,
  expiry:Date,
  utr:String,
  createdAt:{type:Date,default:Date.now}
});

const User = mongoose.model("User",{
  id:Number,
  refBy:Number,
  balance:{type:Number,default:0},
  referrals:{type:Number,default:0},
  refRewarded:{type:Boolean,default:false},
  rejects:{type:Number,default:0},
  flagged:{type:Boolean,default:false}
});

// ===== PLANS =====
const plans = {
  plan1:{name:"1 DAY - 100₹",days:1},
  plan2:{name:"7 DAY - 400₹",days:7},
  plan3:{name:"15 DAY - 700₹",days:15},
  plan4:{name:"30 DAY - 900₹",days:30},
  plan5:{name:"60 DAY - 1200₹",days:60}
};

// ===== REFERRAL =====
const referralRewards = {
  plan1:10,
  plan2:50,
  plan3:80,
  plan4:100,
  plan5:200
};

let userPlan={}, waitingScreenshot={}, userUTR={};

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
  let id = msg.from.id;
  let ref = parseInt(match[1]);

  if(ref && ref !== id){
    let exist = await User.findOne({id});
    if(!exist){
      await User.create({id,refBy:ref});
    }
  }
  home(id);
});

bot.onText(/\/start/, async msg=>{
  let id = msg.from.id;
  await User.updateOne({id},{id},{upsert:true});
  home(id);
});

// ===== MESSAGE =====
bot.on("message", msg=>{
  let id = msg.from.id;

  if(msg.text && msg.text.startsWith("/")) return;
  if(userPlan[id] || waitingScreenshot[id]) return;

  home(id);
});

// ===== BUTTON =====
bot.on("callback_query", async q=>{
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

  // ACCOUNT
  if(d==="account"){
    let active = await Sale.findOne({user:id,expiry:{$gt:new Date()}});
    let u = await User.findOne({id});

    return bot.sendMessage(id,
`👤 ACCOUNT

${active ? `🔑 ${active.key}\n📦 ${active.plan}` : "❌ NO PLAN"}

💰 BALANCE: ₹${u?.balance || 0}`);
  }

  // REFER
  if(d==="refer"){
    return bot.sendMessage(id,
`🎁 LINK:
https://t.me/${BOT_USERNAME}?start=${id}

💰 EARN:
1D=10₹ | 7D=50₹ | 15D=80₹`);
  }

  // INFO
  if(d==="info"){
    return bot.sendMessage(id,
`🔥 TRUST SELLER
⚡ FAST DELIVERY
🛡️ SAFE SYSTEM`);
  }

  // HELP
  if(d==="help"){
    return bot.sendMessage(id,
`⚙️ HELP

Payment issue / key issue

DM 👉 @GODx_COBRA`);
  }

  // BUY FLOW
  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    return bot.sendPhoto(id,QR_LINK,{
      caption:`PAY: ${UPI_ID}`,
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SS",callback_data:"ss"}],
          [{text:"💳 UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){
    waitingScreenshot[id]=true;
    return bot.sendMessage(id,"SEND SS");
  }

  if(d==="utr"){
    return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
  }

  // APPROVE
  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];

    let keyData=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!keyData) return;

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    await Sale.create({user:uid,key:keyData.key,plan:userPlan[uid].name,expiry:exp});

    // REFERRAL
    let userData = await User.findOne({id:uid});

    if(userData?.refBy && !userData.refRewarded){
      let reward = referralRewards[userPlan[uid].id] || 0;

      if(reward>0){
        await User.updateOne({id:userData.refBy},{$inc:{balance:reward,referrals:1}});
        await User.updateOne({id:uid},{$set:{refRewarded:true}});
      }
    }

    bot.sendMessage(uid,`KEY: ${keyData.key}`);
  }

  // ADMIN
  if(d==="stats"){
    if(id!==ADMIN_ID) return;

    let users=await User.countDocuments();
    let sales=await Sale.countDocuments();

    bot.sendMessage(id,`USERS:${users}\nSALES:${sales}`);
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"ADMIN",{
    reply_markup:{
      inline_keyboard:[
        [{text:"📊 STATS",callback_data:"stats"}]
      ]
    }
  });
});
