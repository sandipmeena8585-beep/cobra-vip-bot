const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const mongoose = require("mongoose");

// ===== CONFIG (CORRECT) =====
const token = "8304628992:AAF2gzdL33mdIkBuoVMUQUbzTOQZEeUvoqI";
const MONGO_URL = "mongodb+srv://sandipmeena8585_db_user:SAMI9166@cluster0.uqwcyny.mongodb.net/cobra?retryWrites=true&w=majority";
const ADMIN_ID = 7707237527;

const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const QR_LINK = "https://images.weserv.nl/?url=raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png&w=220&h=220";
const UPI_ID = "godxcobra@axl";
const PAYMENT_NAME = "SANDIP MEENA";

// ===== SERVER =====
const app = express();
app.get("/", (req,res)=>res.send("RUNNING"));
app.listen(process.env.PORT || 3000, ()=>console.log("Server Running"));

// ===== MODELS =====
const Key = mongoose.model("Key", { plan:String, key:String });
const Sale = mongoose.model("Sale", {
  user:String,
  key:String,
  plan:String,
  expiry:String,
  utr:String
});

// ===== PLANS =====
const plans = {
  plan1:{name:"🗝️ 1 DAY - 100₹",days:1},
  plan2:{name:"🗝️ 7 DAY - 400₹",days:7},
  plan3:{name:"🗝️ 15 DAY - 700₹",days:15},
  plan4:{name:"🗝️ 30 DAY - 900₹",days:30},
  plan5:{name:"🗝️ 60 DAY - 1200₹",days:60}
};

let userPlan={}, waitingScreenshot={}, selectedPlan={}, userUTR={};

// ===== STOCK =====
async function getStock(){
  return `📦 LIVE STOCK

1 DAY  : ${await Key.countDocuments({plan:"plan1"})}
7 DAY  : ${await Key.countDocuments({plan:"plan2"})}
15 DAY : ${await Key.countDocuments({plan:"plan3"})}
30 DAY : ${await Key.countDocuments({plan:"plan4"})}
60 DAY : ${await Key.countDocuments({plan:"plan5"})}`;
}

// ===== DB CONNECT =====
mongoose.connect(MONGO_URL,{
  useNewUrlParser:true,
  useUnifiedTopology:true
})
.then(()=>{
  console.log("MongoDB Connected ✅");

  const bot = new TelegramBot(token,{ polling:true });

  // ===== HOME =====
  function home(id){
    bot.sendMessage(id,"🏠 COBRA PANEL",{
      reply_markup:{
        inline_keyboard:[
          [{text:"🛒 BUY",callback_data:"buy"}],
          [{text:"📊 STOCK",callback_data:"info"}],
          [{text:"⚙️ HELP",callback_data:"help"}]
        ]
      }
    });
  }

  bot.onText(/\/start/,msg=>home(msg.chat.id));

  // ===== MESSAGE =====
  bot.on("message",async msg=>{
    let id = msg.from.id;

    if(msg.reply_to_message?.text?.includes("ENTER UTR")){
      if(!userPlan[id]) return;

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

      return bot.sendMessage(id,"WAIT ADMIN");
    }

    if(waitingScreenshot[id] && msg.photo){
      if(!userPlan[id]) return;

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
      return bot.sendMessage(id,"WAIT ADMIN");
    }

    if(selectedPlan[id]){
      for(let k of msg.text.split("\n")){
        if(k.trim()){
          await Key.create({plan:selectedPlan[id],key:k.trim()});
        }
      }
      selectedPlan[id]=null;
      return bot.sendMessage(id,"STOCK ADDED\n\n"+await getStock());
    }

    if(msg.text && !msg.text.startsWith("/")){
      home(id);
    }
  });

  // ===== BUTTONS =====
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
      return bot.sendMessage(id,"CONTACT: @GODx_COBRA");
    }

    if(d.startsWith("buy_")){
      let p=d.split("_")[1];
      userPlan[id]={...plans[p],id:p};

      return bot.sendPhoto(id,QR_LINK,{
        caption:`NAME: ${PAYMENT_NAME}

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

    if(d==="ss"){
      waitingScreenshot[id]=true;
      return bot.sendMessage(id,"SEND SCREENSHOT");
    }

    if(d==="utr"){
      return bot.sendMessage(id,"ENTER UTR",{reply_markup:{force_reply:true}});
    }

    if(d.startsWith("approve_")){
      await bot.editMessageReplyMarkup({inline_keyboard:[]},{
        chat_id:q.message.chat.id,
        message_id:q.message.message_id
      });

      let uid=d.split("_")[1];
      if(!userPlan[uid]) return;

      let keyData=await Key.findOneAndDelete({plan:userPlan[uid].id});
      if(!keyData) return bot.sendMessage(ADMIN_ID,"STOCK EMPTY");

      await Sale.create({
        user:uid,
        key:keyData.key,
        plan:userPlan[uid].name,
        expiry:new Date().toISOString(),
        utr:userUTR[uid]||"N/A"
      });

      bot.sendMessage(uid,`KEY:\n${keyData.key}`);

      delete userPlan[uid];
      delete userUTR[uid];
    }

    if(d.startsWith("reject_")){
      await bot.editMessageReplyMarkup({inline_keyboard:[]},{
        chat_id:q.message.chat.id,
        message_id:q.message.message_id
      });

      let uid=d.split("_")[1];
      delete userPlan[uid];
      bot.sendMessage(uid,"REJECTED");
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

    if(d.startsWith("plan")){
      selectedPlan[id]=d;
      return bot.sendMessage(id,"SEND KEYS");
    }
  });

  bot.onText(/\/admin/,msg=>{
    if(msg.from.id!==ADMIN_ID) return;

    bot.sendMessage(msg.chat.id,"ADMIN PANEL",{
      reply_markup:{
        inline_keyboard:[
          [{text:"ADD STOCK",callback_data:"addstock"}]
        ]
      }
    });
  });

})
.catch(err=>console.log("Mongo Error ❌",err));
