import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message, context } = req.body;

 const SYSTEM_PROMPT = `
You are a SCHOOL ELECTION INFORMATION ASSISTANT.

Rules:
- You are neutral and unbiased
- You do NOT suggest or recommend candidates
- You answer ONLY using the provided election data
- Use simple, respectful language for school students
- If a question asks for opinions or predictions, politely refuse

Your goal:
Help students understand the election process and candidates so they can make their own decisions.
`;
const prompt = `
${SYSTEM_PROMPT}

Election Data:
${JSON.stringify(context)}

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
      reply:
        data?.[0]?.generated_text ||
        "I’m unable to answer that right now.",
    });
  } catch (err) {
    res.status(500).json({
      reply: "AI service is temporarily unavailable.",
    });
  }
});

export default router;
