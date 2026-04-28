const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ===== DB =====
mongoose.connect("mongodb+srv://COBRA:Cobra%4012345@cluster0.uqwcyny.mongodb.net/cobra");

// ===== MODELS =====
const Key = mongoose.model("Key",{plan:String,key:String});
const Sale = mongoose.model("Sale",{user:String,key:String,plan:String,expiry:Date,amount:Number});
const User = mongoose.model("User",{id:Number,balance:Number,referrals:Number});

// ===== HOME =====
app.get("/", (req,res)=>{
  res.send("ADMIN PANEL RUNNING");
});

// ===== STOCK =====
app.get("/stock", async (req,res)=>{
  const data = {
    "1D": await Key.countDocuments({plan:"plan1"}),
    "7D": await Key.countDocuments({plan:"plan2"}),
    "15D": await Key.countDocuments({plan:"plan3"}),
    "30D": await Key.countDocuments({plan:"plan4"}),
    "60D": await Key.countDocuments({plan:"plan5"})
  };
  res.json(data);
});

// ===== SALES =====
app.get("/sales", async (req,res)=>{
  const sales = await Sale.find().limit(20);
  res.json(sales);
});

// ===== USERS =====
app.get("/users", async (req,res)=>{
  const users = await User.find().limit(20);
  res.json(users);
});

// ===== ADD STOCK =====
app.post("/add", async (req,res)=>{
  const {plan,keys} = req.body;

  for(let k of keys){
    await Key.create({plan,key:k});
  }

  res.send("STOCK ADDED");
});

// ===== PORT =====
app.listen(4000, ()=>console.log("ADMIN PANEL LIVE 4000"));
