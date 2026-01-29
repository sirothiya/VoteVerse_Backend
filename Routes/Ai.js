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
Summarize the following school election manifesto into simple bullet points.
Use only the given text. No new promises.

Text:
${text}
`;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const data = await hfResponse.json();
    console.log("🧠 HF RESPONSE:", data);

    if (data.error) {
      return res.json({
        summary: "AI is warming up. Please try again shortly.",
      });
    }

    res.json({
      summary: data?.[0]?.summary_text || "Unable to summarize manifesto",
    });
  } catch (err) {
    console.error("❌ AI ERROR:", err.message);
    res.status(500).json({
      summary: "AI could not generate summary at this time",
    });
  }
});


module.exports = router;
