const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

const token = process.env.BOT_TOKEN || "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+EjfiC_Zsw3liYmI9";

const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// SERVER
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000);

// 🔥 MONGO CONNECT
mongoose.connect("mongodb+srv://sandipmeena8585_db_user:Tck2CfHfuw2Odb2k@cluster0.uqwcyyn.mongodb.net/cobra")
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

// SCHEMA
const Key = mongoose.model("Key",{
  plan:String,
  key:String
});

const Sold = mongoose.model("Sold",{
  user:String,
  key:String,
  plan:String,
  expiry:String
});

// PLANS
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

let userPlan={}, selectedPlan={}, waitingScreenshot={};

// 📦 STOCK
async function getStockText(){
  let p1 = await Key.countDocuments({plan:"plan1"});
  let p2 = await Key.countDocuments({plan:"plan2"});
  let p3 = await Key.countDocuments({plan:"plan3"});
  let p4 = await Key.countDocuments({plan:"plan4"});
  let p5 = await Key.countDocuments({plan:"plan5"});

  return `📦 LIVE STOCK

1 DAY : ${p1}
7 DAY : ${p2}
15 DAY : ${p3}
30 DAY : ${p4}
60 DAY : ${p5}`;
}

// 📊 REPORT
async function getFullReport(){
  let stock = await getStockText();
  let total = await Sold.countDocuments();
  let last = await Sold.find().sort({_id:-1}).limit(10);

  let text = `📊 FULL REPORT

${stock}

━━━━━━━━━━━━━━
💰 TOTAL SOLD : ${total}
━━━━━━━━━━━━━━

🧾 LAST 10 SALES:
`;

  last.forEach(s=>{
    text += `
👤 ${s.user}
🔑 ${s.key}
📦 ${s.plan}
📅 ${new Date(s.expiry).toDateString()}
━━━━━━━━━━━━`;
  });

  return text;
}

// 🏠 HOME
function showHome(chatId){
  bot.sendMessage(chatId,
`🏠 COBRA APP

━━━━━━━━━━━━━━
💎 PREMIUM ACCESS PANEL
━━━━━━━━━━━━━━

👇 SELECT OPTION`,
{
  reply_markup:{
    inline_keyboard:[
      [
        {text:"🛒 BUY",callback_data:"app_buy"},
        {text:"📊 INFO",callback_data:"app_info"}
      ],
      [
        {text:"⚙️ HELP",callback_data:"app_help"}
      ]
    ]
  }
});
}

bot.onText(/\/start/,msg=>showHome(msg.chat.id));

// MESSAGE
bot.on("message", async msg=>{
  let id = msg.from.id;

  if(waitingScreenshot[id] && msg.photo){
    let plan=userPlan[id];
    if(!plan) return showHome(id);

    bot.sendPhoto(ADMIN_ID,msg.photo[msg.photo.length-1].file_id,{
      caption:`📸 PAYMENT\nUSER:${id}\nPLAN:${plan.name}`,
      reply_markup:{
        inline_keyboard:[[
          {text:"✅ VERIFY",callback_data:`approve_${id}`},
          {text:"❌ REJECT",callback_data:`reject_${id}`}
        ]]
      }
    });

    bot.sendMessage(id,"⏳ WAIT ADMIN");
    waitingScreenshot[id]=false;
    return;
  }

  if(selectedPlan[id]){
    let lines = msg.text.split("\n");
    for(let k of lines){
      if(k.trim()){
        await Key.create({plan:selectedPlan[id],key:k.trim()});
      }
    }

    bot.sendMessage(id,"✅ STOCK ADDED");
    selectedPlan[id]=null;
    return;
  }

  if(msg.text && !msg.text.startsWith("/") && !msg.reply_to_message){
    showHome(id);
  }
});

// BUTTONS
bot.on("callback_query", async q=>{
  let d=q.data,id=q.from.id;
  bot.answerCallbackQuery(q.id);

  if(d==="app_home") return showHome(id);

  if(d==="app_buy"){
    return bot.sendMessage(id,"🛒 SELECT PLAN",{
      reply_markup:{
        inline_keyboard:[
          ...Object.keys(plans).map(p=>[
            {text:plans[p].name,callback_data:`buy_${p}`}
          ]),
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  if(d==="app_info"){
    return bot.sendMessage(id,
`💎 FULL TRUST 😎
🚫 NO SCAM ❌
⚡ FAST DELIVERY`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"📦 JOIN CHANNEL",url:CHANNEL_LINK}],
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  if(d==="app_help"){
    return bot.sendMessage(id,
`CONTACT: @GODx_COBRA`,
{
      reply_markup:{
        inline_keyboard:[
          [{text:"OPEN DM",url:"https://t.me/GODx_COBRA"}],
          [{text:"⬅️ HOME",callback_data:"app_home"}]
        ]
      }
    });
  }

  if(d.startsWith("buy_")){
    let p=d.split("_")[1];
    userPlan[id]={...plans[p],id:p};

    bot.sendPhoto(id,QR_LINK,{
      caption:`💰 PAYMENT

${plans[p].name}

UPI: ${UPI_ID}`,
      reply_markup:{
        inline_keyboard:[
          [{text:"📸 SCREENSHOT",callback_data:"screenshot"}]
        ]
      }
    });
  }

  if(d==="screenshot"){
    waitingScreenshot[id]=true;
    bot.sendMessage(id,"SEND SCREENSHOT");
  }

  // APPROVE
  if(d.startsWith("approve_")){
    let uid=d.split("_")[1];
    let plan=userPlan[uid];

    let item = await Key.findOne({plan:plan.id});
    if(!item) return bot.sendMessage(ADMIN_ID,"❌ STOCK EMPTY");

    let key=item.key;
    await item.deleteOne();

    let expiry=new Date();
    expiry.setDate(expiry.getDate()+plan.days);

    await Sold.create({
      user:uid,key,plan:plan.name,expiry:expiry.toISOString()
    });

    bot.sendMessage(uid,
`🔥 *COBRA PREMIUM ACCESS*

━━━━━━━━━━━━━━

🔑 \`${key}\`
📅 ${expiry.toDateString()}

━━━━━━━━━━━━━━`,
{
  parse_mode:"Markdown",
  reply_markup:{
    inline_keyboard:[
      [{text:"🚀 JOIN NOW", url:"https://t.me/+wRZN39fdVcRkYTM9"}]
    ]
  }
});

    delete userPlan[uid];
  }

  if(d==="addstock"){
    bot.sendMessage(id,"SELECT PLAN",{
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

  if(d==="full_report") return bot.sendMessage(id,await getFullReport());

  if(d.startsWith("plan")){
    selectedPlan[id]=d;
    bot.sendMessage(id,"SEND KEYS (ONE PER LINE)");
  }
});

// ADMIN
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,"ADMIN PANEL",{
    reply_markup:{
      inline_keyboard:[
        [{text:"ADD STOCK",callback_data:"addstock"}],
        [{text:"FULL REPORT",callback_data:"full_report"}]
      ]
    }
  });
});
