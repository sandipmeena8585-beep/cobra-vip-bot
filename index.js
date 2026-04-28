const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN || "8304628992:AAFHjdhzF33fiH2QHjQScU9lK2zgqAx7nIc";
const MONGO_URL = "mongodb+srv://sandipmeena8585_db_user:Tck2CfHfuw2Odb2k@cluster0.uqwcyyn.mongodb.net/cobra?retryWrites=true&w=majority";
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
const URL = process.env.RENDER_EXTERNAL_URL || "https://your-app.onrender.com";

(async ()=>{
  await bot.deleteWebHook();
  await bot.setWebHook(`${URL}/bot${token}`);
})();

app.post(`/bot${token}`, (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== DB =====
mongoose.connect(MONGO_URL,{
  serverSelectionTimeoutMS:5000
})
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log("Mongo Error ❌",err));

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
  referrals:{type:Number,default:0}
});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1,ref:10},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7,ref:50},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15,ref:80},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30,ref:100},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60,ref:200}
};

// ===== STATE =====
let userPlan={}, waitingSS={}, waitingUTR={}, userUTR={}, selectedPlan={};

// ===== STOCK =====
async function getStock(){
  return `📦 STOCK

1D: ${await Key.countDocuments({plan:"plan1"})}
7D: ${await Key.countDocuments({plan:"plan2"})}
15D: ${await Key.countDocuments({plan:"plan3"})}
30D: ${await Key.countDocuments({plan:"plan4"})}
60D: ${await Key.countDocuments({plan:"plan5"})}`;
}

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

  // ADD STOCK
  if(selectedPlan[id]){
    for(let k of msg.text.split("\n")){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ STOCK ADDED\n"+await getStock());
  }

  // random → menu
  if(msg.text && !msg.text.startsWith("/")){
    home(id);
  }
});

// ===== BUTTON =====
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
      caption:`💳 PAYMENT

NAME: ${PAYMENT_NAME}
UPI: ${UPI_ID}

${plans[p].name}`,
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="ss"){ waitingSS[id]=true; return bot.sendMessage(id,"SEND SCREENSHOT"); }
  if(d==="utr"){ waitingUTR[id]=true; return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}}); }

  // APPROVE
  if(d.startsWith("approve_")){
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

    // referral
    let u=await User.findOne({id:uid});
    if(u?.refBy){
      await User.updateOne({id:u.refBy},{
        $inc:{balance:userPlan[uid].ref,referrals:1}
      });
    }

    bot.sendMessage(uid,
`🔑 YOUR KEY

${key.key}

🎮 LIMIT: 10-12 SAFE PLAY
📅 EXPIRY:
${exp.toLocaleString()}`,{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN GROUP",url:CHANNEL_LINK}]
        ]
      }
    });

    bot.sendMessage(ADMIN_ID,
`✅ SALE DONE

USER:${uid}
KEY:${key.key}`);

    delete userPlan[uid];
    delete userUTR[uid];
  }

  if(d.startsWith("reject_")){
    let uid=d.split("_")[1];
    bot.sendMessage(uid,"❌ PAYMENT REJECTED");
    delete userPlan[uid];
  }

  // ACCOUNT
  if(d==="account"){
    let u=await User.findOne({id});
    let active=await Sale.findOne({user:id,expiry:{$gt:new Date()}});
    return bot.sendMessage(id,
`👤 ACCOUNT

${active?`🔑 ${active.key}\n📅 ${active.expiry}`:"NO ACTIVE PLAN"}

💰 WALLET: ₹${u?.balance||0}
👥 REFERRALS: ${u?.referrals||0}`);
  }

  // REFER
  if(d==="refer"){
    return bot.sendMessage(id,
`🎁 YOUR LINK

https://t.me/${BOT_USERNAME}?start=${id}`);
  }

  // ADMIN
  if(d==="addstock"){
    return bot.sendMessage(id,"SELECT PLAN",{
      reply_markup:{
        inline_keyboard:[
          [{text:"1D",callback_data:"plan1"}],
          [{text:"7D",callback_data:"plan2"}],
          [{text:"15D",callback_data:"plan3"}],
          [{text:"30D",callback_data:"plan4"}],
          [{text:"60D",callback_data:"plan5"}]
        ]
      }
    });
  }

  if(d.startsWith("plan")){
    selectedPlan[id]=d;
    return bot.sendMessage(id,"SEND KEYS LINE BY LINE");
  }

  if(d==="stats"){
    let users=await User.countDocuments();
    let sales=await Sale.countDocuments();
    let stock=await getStock();

    return bot.sendMessage(id,
`📊 ADMIN PANEL

👥 USERS: ${users}
💰 SALES: ${sales}

${stock}`);
  }
});

// ===== ADMIN =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 STATS",callback_data:"stats"}]
      ]
    }
  });
});
