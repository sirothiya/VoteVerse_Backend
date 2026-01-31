const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();


router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.length < 50) {
      return res.json({ summary: "Text too short to summarize." });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://voteverse-backend-new.onrender.com" || "http://localhost:5173",
          "X-Title": "VoteVerse AI Summary",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct",
          messages: [
            {
              role: "system",
              content:
                "Summarize the following election manifesto into clear, neutral bullet points using simple language.",
            },
            {
              role: "user",
              content: text.slice(0, 4000), // 🔥 VERY IMPORTANT
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();

    if (!data?.choices?.length) {
      return res.json({ summary: "AI temporarily unavailable." });
    }

    return res.json({
      summary: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenRouter Summary Error:", error.message);
    return res.json({
      summary: "AI temporarily unavailable.",
    });
  }
});



module.exports = router;
