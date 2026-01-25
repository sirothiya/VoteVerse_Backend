const express = require("express");
const fetch = require("node-fetch");
const buildElectionContext = require("../utils/buildElectionContext");

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  const context = await buildElectionContext();

  const SYSTEM_PROMPT = `
You are a SCHOOL ELECTION INFORMATION ASSISTANT.

Rules:
- You are neutral and unbiased
- You do NOT suggest or recommend candidates
- Answer ONLY from election data
- If user asks opinion, say you cannot answer
- Use simple student-friendly language
`;

  const prompt = `
${SYSTEM_PROMPT}

Election Data:
${JSON.stringify(context, null, 2)}

Student Question:
${message}
`;

  try {
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
      reply: data?.[0]?.generated_text || "I cannot find that information.",
    });
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ reply: "AI service down." });
  }
});

module.exports = router;
