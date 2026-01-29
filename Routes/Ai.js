const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/summarize", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 30) {
    return res.json({
      summary: "Manifesto text is too short to summarize"
    });
  }

  const prompt = `
Convert the following school election manifesto into clear bullet points.
Use simple language.
Do not add new information.

Text:
${text}
`;

  const response = await fetch(
    "https://api-inference.huggingface.co/models/google/flan-t5-base",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  const data = await response.json();
  console.log("🧠 HF raw response:", data);

  let summary =
    data?.[0]?.generated_text ||
    data?.generated_text ||
    data?.[0]?.summary_text ||
    "AI could not generate summary at this time";

  res.json({ summary });
});

module.exports = router;
