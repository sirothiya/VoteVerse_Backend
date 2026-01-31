const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();


const wait = (ms) => new Promise((res) => setTimeout(res, ms));

router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.length < 30) {
      return res.json({ summary: "Text too short to summarize." });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text.slice(0, 2000), // 🔥 VERY IMPORTANT (HF limit)
        }),
      }
    );

    const raw = await response.text(); // 👈 DO NOT .json() blindly
    console.log("HF RAW:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.json({
        summary: "AI is warming up. Please try again.",
      });
    }

    if (data?.error) {
      return res.json({
        summary: "AI model loading. Try again after some time.",
      });
    }

    res.json({
      summary: data[0]?.summary_text || "Could not summarize.",
    });
  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.json({
      summary: "AI temporarily unavailable.",
    });
  }
});




module.exports = router;
