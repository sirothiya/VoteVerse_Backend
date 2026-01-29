const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.json({
        summary: "Manifesto text is too short to summarize.",
      });
    }

    const prompt = `
You are a SCHOOL ELECTION MANIFESTO EXPLAINER.

Rules:
- Use ONLY the text given
- Convert into bullet points
- Simple language
- Neutral tone
- No new promises

Manifesto Text:
"""
${text}
"""
`;

    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/google/flan-t5-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const rawText = await hfResponse.text(); // 👈 IMPORTANT
    console.log("🧠 HF RAW TEXT:", rawText);

    // Try parsing JSON safely
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.json({
        summary: "AI service is temporarily unavailable. Please try again.",
      });
    }

    if (data.error) {
      return res.json({
        summary: "AI is warming up. Please try again in a few seconds.",
      });
    }

    res.json({
      summary: data?.[0]?.generated_text || "Unable to summarize manifesto",
    });
  } catch (err) {
    console.error("❌ AI ERROR:", err.message);
    res.status(500).json({
      summary: "AI could not generate summary at this time",
    });
  }
});

module.exports = router;
