const express = require("express");
const router = express.Router();

const candidate = require("../Models/Candidate");
const User = require("../Models/User");
const { generateToken, jwtMiddleware } = require("../jwt");


router.post("/login", async (req, res) => {
  try {
    const { aadhar, password } = req.body;
    console.log("1");
    const can = await candidate.findOne({ aadhar });
    console.log("11");
    if(!can){
      return res.status(401).json({error:"candidate not found, please signup"});
    }
    if (!can || !(await can.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid aadhar or password" }); 
    }
    console.log("111");
    const payload = {
      id: can.id,
      aadhar: can.aadhar,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      participant: {
        id: can.id,
        name: can.name,
        age: can.age,
        addhar:can.aadhar,
        partySymbol:can.partySymbol,
       party:can.party,
      },
      token,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
