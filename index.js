const TelegramBot = require('node-telegram-bot-api');
const express = require("express");
const fs = require("fs");

const token = "8304628992:AAFANNXH6syLC1FIuHxKeYd8MIyaWXNTXg4";
const ADMIN_ID = 7707237527;

const QR_LINK = "https://raw.githubusercontent.com/sandipmeena8585-beep/cobra-bot/main/upi_qr.png";
const UPI_ID = "godxcobra@axl";
const CHANNEL_LINK = "https://t.me/+wRZN39fdVcRkYTM9";
const PAYMENT_NAME = "SANDIP MEENA";

const bot = new TelegramBot(token, { polling: true });

// 🌐 SERVER
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req,res)=>res.send("BOT RUNNING"));
app.listen(process.env.PORT || 3000);

// 📦 DATA
let keys = JSON.parse(fs.readFileSync("keys.json"));
let orders = JSON.parse(fs.readFileSync("orders.json"));

// 💎 PLANS
const plans = {
  plan1: { name: "💎 1 DAY - 100₹", days: 1 },
  plan2: { name: "💎 7 DAY - 400₹", days: 7 },
  plan3: { name: "💎 15 DAY - 700₹", days: 15 },
  plan4: { name: "💎 30 DAY - 900₹", days: 30 },
  plan5: { name: "💎 60 DAY - 1200₹", days: 60 }
};

let userPlan = {};
let selectedPlan = {};
let waitingScreenshot = {};

// ================= WEB PANEL =================
app.get("/panel",(req,res)=>{
res.send(`
<html>
<head>
<title>COBRA PANEL</title>
<style>
body{background:#0f2027;color:white;text-align:center;font-family:sans-serif;}
.box{background:white;color:black;padding:20px;margin:30px auto;width:90%;max-width:400px;border-radius:15px;}
button{width:100%;padding:12px;margin-top:10px;border:none;border-radius:10px;background:#6a11cb;color:white;}
input,select{width:100%;padding:10px;margin-top:10px;}
</style>
</head>

<body>
<div class="box">

<h2>🔥 COBRA PANEL 🔥</h2>

<select id="plan">
<option value="plan1">1 DAY - 100₹</option>
<option value="plan2">7 DAY - 400₹</option>
<option value="plan3">15 DAY - 700₹</option>
<option value="plan4">30 DAY - 900₹</option>
<option value="plan5">60 DAY - 1200₹</option>
</select>

<p>👤 ${PAYMENT_NAME}</p>
<p>UPI: ${UPI_ID}</p>
<img src="${QR_LINK}" width="200"/>

<input id="userid" placeholder="Telegram ID">
<input id="utr" placeholder="Enter UTR">

<button onclick="submit()">SUBMIT</button>
<button onclick="check()">CHECK STATUS</button>

<div id="res"></div>

</div>

<script>
function submit(){
 fetch("/order",{
  method:"POST",
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({
    user:document.getElementById("userid").value,
    plan:document.getElementById("plan").value,
    utr:document.getElementById("utr").value
  })
 }).then(r=>r.text()).then(t=>{
  document.getElementById("res").innerHTML=t;
 });
}

function check(){
 let id=document.getElementById("userid").value;

 fetch("/status/"+id)
 .then(r=>r.text())
 .then(t=>{
  document.getElementById("res").innerHTML=t;
 });
}
</script>

</body>
</html>
`);
});

// ORDER
app.post("/order",(req,res)=>{
let id = Date.now();

orders.orders.push({
 id,
 user:req.body.user,
 plan:req.body.plan,
 utr:req.body.utr,
 status:"pending"
});

fs.writeFileSync("orders.json",JSON.stringify(orders,null,2));

bot.sendMessage(ADMIN_ID,
`📥 WEB PAYMENT

USER: ${req.body.user}
PLAN: ${req.body.plan}
UTR: ${req.body.utr}`,
{
 reply_markup:{
  inline_keyboard:[[
   {text:"✅ VERIFY",callback_data:`webok_${id}`},
   {text:"❌ REJECT",callback_data:`webno_${id}`}
  ]]
 }
});

res.send("⏳ WAIT ADMIN VERIFY");
});

// STATUS
app.get("/status/:id",(req,res)=>{
let userOrders = orders.orders.filter(o=>o.user==req.params.id);

if(userOrders.length===0) return res.send("❌ NO ORDER");

let last = userOrders[userOrders.length-1];

if(last.status==="pending") return res.send("⏳ WAIT ADMIN VERIFY");
if(last.status==="rejected") return res.send("❌ PAYMENT REJECTED");
if(last.status==="approved") return res.send("🔑 "+last.key);
});

// ================= BOT =================

// MENU
function showMenu(chatId){
bot.sendMessage(chatId,
`🔥 COBRA VIP PANEL 🔥

👇 SELECT PLAN`,
{
reply_markup:{
inline_keyboard:[
[{text:plans.plan1.name,callback_data:"buy_plan1"}],
[{text:plans.plan2.name,callback_data:"buy_plan2"}],
[{text:plans.plan3.name,callback_data:"buy_plan3"}],
[{text:plans.plan4.name,callback_data:"buy_plan4"}],
[{text:plans.plan5.name,callback_data:"buy_plan5"}]
]
}
});
}

bot.onText(/\/start/,msg=>showMenu(msg.chat.id));

// BUTTON
bot.on("callback_query",(q)=>{
let data = q.data;
let uid = q.from.id;

// BUY
if(data.startsWith("buy_")){
let id = data.split("_")[1];
userPlan[uid]={...plans[id],id};

bot.sendPhoto(uid,QR_LINK,{
caption:`UPI: ${UPI_ID}`,
reply_markup:{
inline_keyboard:[
[{text:"📸 SCREENSHOT",callback_data:"ss"}],
[{text:"💳 ENTER UTR",callback_data:"utr"}]
]
}
});
}

// SCREENSHOT
if(data==="ss"){
waitingScreenshot[uid]=true;
bot.sendMessage(uid,"SEND SCREENSHOT");
}

// UTR
if(data==="utr"){
bot.sendMessage(uid,"ENTER UTR",{reply_markup:{force_reply:true}});
}

// VERIFY BOT
if(data.startsWith("approve_")){
let u=data.split("_")[1];
let p=userPlan[u];
let key=keys[p.id].shift();

fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));

bot.sendMessage(u,`🔑 ${key}\n${CHANNEL_LINK}`);
}

// WEB VERIFY
if(data.startsWith("webok_")){
let id=data.split("_")[1];
let o=orders.orders.find(x=>x.id==id);

let key=keys[o.plan].shift();

o.status="approved";
o.key=key;

fs.writeFileSync("orders.json",JSON.stringify(orders,null,2));
fs.writeFileSync("keys.json",JSON.stringify(keys,null,2));
}

if(data.startsWith("webno_")){
let id=data.split("_")[1];
let o=orders.orders.find(x=>x.id==id);

o.status="rejected";

fs.writeFileSync("orders.json",JSON.stringify(orders,null,2));
}
});

// MESSAGE
bot.on("message",(msg)=>{
let uid=msg.from.id;

if(waitingScreenshot[uid] && msg.photo){
let plan=userPlan[uid];

bot.sendPhoto(ADMIN_ID,msg.photo.pop().file_id,{
caption:`USER:${uid}\nPLAN:${plan.name}`,
reply_markup:{
inline_keyboard:[
[{text:"✅ VERIFY",callback_data:`approve_${uid}`}]
]
}
});

waitingScreenshot[uid]=false;
}

// AUTO MENU
if(msg.text && !msg.text.startsWith("/")){
showMenu(msg.chat.id);
}
});
