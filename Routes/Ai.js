const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();


const wait = (ms) => new Promise((res) => setTimeout(res, ms));

router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    const callHF = async () => {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
        }
      );
      return response.json();
    };

    let data = await callHF();

    // ⏳ Model loading → wait & retry once
    if (data?.error?.includes("loading")) {
      console.log("⏳ HF model loading, retrying...");
      await wait(8000); // wait 8 seconds
      data = await callHF();
    }

    if (data?.error) {
      return res.json({
        summary: "AI is temporarily unavailable. Try again shortly.",
      });
    }

    res.json({
      summary: data?.[0]?.summary_text || "Unable to summarize manifesto",
    });
  } catch (err) {
    console.error("❌ AI ERROR:", err.message);
    res.status(500).json({
      summary: "AI service failed",
    });
  }
});



module.exports = router;
