const express = require("express");
const fetch = require("node-fetch");
const buildElectionContext = require("../utils/buildElectionContext");

const router = express.Router();
router.post("/manifesto/explain", async (req, res) => {
  const { manifestoText } = req.body;

  const prompt = `
You are a SCHOOL ELECTION MANIFESTO EXPLAINER.

Rules:
- Use ONLY the text given
- Do NOT add promises
- Do NOT recommend
- Simple bullet points
- Neutral tone

Manifesto Text:
"""
${manifestoText}
"""

Explain clearly for students.
`;

  const hfRes = await fetch(
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

  const data = await hfRes.json();

  res.json({
    reply: data?.[0]?.generated_text || "Unable to explain manifesto.",
  });
});



module.exports = router;
