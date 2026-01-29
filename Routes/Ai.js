const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/summarize", async (req, res) => {
  const { text } = req.body;

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

  res.json({
    summary: data?.[0]?.generated_text || "Unable to summarize manifesto",
  });
});

module.exports = router;
