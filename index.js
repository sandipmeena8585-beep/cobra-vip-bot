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
const bot = new TelegramBot(token,{ polling:true });

// ===== DB =====
mongoose.connect(MONGO_URL)
.then(()=>console.log("Mongo Connected ✅"))
.catch(err=>console.log("Mongo Error ❌",err));

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});

const Sale = mongoose.model("Sale",{
  user:String,
  key:String,
  plan:String,
  expiry:Date,
  utr:String,
  amount:Number,
  createdAt:{type:Date,default:Date.now}
});

const User = mongoose.model("User",{
  id:Number,
  refBy:Number,
  balance:{type:Number,default:0},
  referrals:{type:Number,default:0},
  referredUsers:[Number]
});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1,ref:10,price:100},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7,ref:50,price:400},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15,ref:80,price:700},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30,ref:100,price:900},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60,ref:200,price:1200}
};

// ===== STATE =====
let userPlan={}, waitingUTR={}, userUTR={}, selectedPlan={}, useWallet={};

// ===== STOCK =====
async function getStock(){
  return `📦 LIVE STOCK

1D: ${await Key.countDocuments({plan:"plan1"})}
7D: ${await Key.countDocuments({plan:"plan2"})}
15D: ${await Key.countDocuments({plan:"plan3"})}
30D: ${await Key.countDocuments({plan:"plan4"})}
60D: ${await Key.countDocuments({plan:"plan5"})}`;
}

// ===== HOME =====
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
  if(!exist){
    if(ref && ref!==id){
      await User.create({id,refBy:ref,referredUsers:[]});
    } else {
      await User.create({id,referredUsers:[]});
    }
  }

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

    let type = useWallet[id] ? "WALLET" : "UPI";

    return bot.sendMessage(ADMIN_ID,
`💳 PAYMENT REQUEST

USER: ${id}
PLAN: ${userPlan[id].name}
TYPE: ${type}
UTR: ${msg.text}`,{
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });
  }

  // STOCK ADD
  if(selectedPlan[id]){
    let keys = msg.text.split("\n");
    for(let k of keys){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }
    selectedPlan[id]=null;
    return bot.sendMessage(id,"✅ STOCK ADDED\n"+await getStock());
  }

  if(msg.text && !msg.text.startsWith("/")){
    home(id);
  }
});

// ===== CALLBACK =====
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

  // SELECT PLAN
  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    let u=await User.findOne({id});

    return bot.sendPhoto(id,QR_LINK,{
      caption:
`💳 PAYMENT

👤 ${PAYMENT_NAME}

📲 UPI:
\`${UPI_ID}\`

💰 PRICE: ₹${plans[p].price}
💸 WALLET: ₹${u?.balance||0}`,
      parse_mode:"Markdown",
      reply_markup:{
        inline_keyboard:[
          [{text: useWallet[id] ? "❌ REMOVE WALLET":"💰 USE WALLET",callback_data:"wallet"}],
          [{text:"📸 SCREENSHOT",callback_data:"ss"}],
          [{text:"💳 UTR",callback_data:"utr"}]
        ]
      }
    });
  }

  if(d==="wallet"){
    useWallet[id]=!useWallet[id];
    return bot.sendMessage(id,useWallet[id]?"💸 WALLET ENABLED":"❌ WALLET DISABLED");
  }

  if(d==="utr"){
    waitingUTR[id]=true;
    return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
  }

  if(d==="ss"){
    return bot.sendMessage(id,"SEND SCREENSHOT");
  }

  // APPROVE
  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];

    let key=await Key.findOneAndDelete({plan:userPlan[uid].id});
    if(!key) return bot.sendMessage(ADMIN_ID,"❌ NO STOCK");

    let exp=new Date();
    exp.setDate(exp.getDate()+userPlan[uid].days);

    let plan=userPlan[uid];
    let user=await User.findOne({id:uid});

    // ===== REFER =====
    if(user.refBy){
      let refUser=await User.findOne({id:user.refBy});

      if(refUser && !refUser.referredUsers.includes(uid)){
        refUser.referredUsers.push(uid);
        refUser.balance += plan.ref;
        refUser.referrals += 1;
        await refUser.save();
      }
    }

    await Sale.create({
      user:uid,
      key:key.key,
      plan:plan.name,
      expiry:exp,
      utr:userUTR[uid],
      amount:plan.price
    });

    bot.sendMessage(uid,
`🔑 YOUR KEY

\`${key.key}\`

🎮 LIMIT: 10-12
LEGIT PLAY SAFE

📅 EXPIRY:
${exp.toLocaleString()}`,{parse_mode:"Markdown"});

    bot.sendMessage(ADMIN_ID,
`💰 SALE DONE

USER: ${uid}
PLAN: ${plan.name}
KEY: ${key.key}`);

    delete userPlan[uid];
    delete userUTR[uid];
  }

  // ACCOUNT
  if(d==="account"){
    let u=await User.findOne({id});
    let active=await Sale.findOne({user:id,expiry:{$gt:new Date()}});
    return bot.sendMessage(id,
`👤 ACCOUNT

${active?`🔑 ${active.key}\n📅 ${active.expiry}`:"NO PLAN"}

💰 WALLET: ₹${u?.balance||0}
👥 REF: ${u?.referrals||0}`);
  }

  // REFER
  if(d==="refer"){
    return bot.sendMessage(id,
`🎁 REFER SYSTEM

https://t.me/${BOT_USERNAME}?start=${id}

1D = ₹10
7D = ₹50
15D = ₹80
30D = ₹100
60D = ₹200`);
  }

  // ADMIN REFER HISTORY
  if(d==="refstats"){
    if(id!==ADMIN_ID) return;

    let users=await User.find();
    let txt="📊 REFER DATA\n\n";

    users.forEach(u=>{
      if(u.referrals>0){
        txt+=`ID:${u.id}\nREF:${u.referrals}\nBAL:₹${u.balance}\n\n`;
      }
    });

    return bot.sendMessage(id,txt);
  }

  // INFO
  if(d==="info"){
    return bot.sendMessage(id,"🔥 TRUSTED SELLER\n⚡ FAST DELIVERY\n🛡️ SAFE SYSTEM");
  }

  // HELP
  if(d==="help"){
    return bot.sendMessage(id,"⚙️ HELP\nKEY ISSUE / PAYMENT ISSUE\nDM 👉 @GODx_COBRA");
  }

  // ADMIN STOCK
  if(d==="addstock"){
    if(id!==ADMIN_ID) return;
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
    if(id!==ADMIN_ID) return;
    selectedPlan[id]=d;
    return bot.sendMessage(id,"SEND KEYS LINE BY LINE");
  }

  if(d==="stats"){
    if(id!==ADMIN_ID) return;

    let users=await User.countDocuments();
    let sales=await Sale.countDocuments();

    return bot.sendMessage(id,
`📊 ADMIN PANEL

USERS: ${users}
SALES: ${sales}

${await getStock()}`);
  }
});

// ===== ADMIN COMMAND =====
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"⚙️ ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"➕ ADD STOCK",callback_data:"addstock"}],
        [{text:"📊 STATS",callback_data:"stats"}],
        [{text:"🎁 REFER DATA",callback_data:"refstats"}]
      ]
    }
  });
});
