const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const transcribeAudio = require("../utils/transcribeAudio");
const Candidate = require("../Models/Candidate");


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
          "HTTP-Referer":
            "https://voteverse-backend-new.onrender.com" ||
            "http://localhost:5173",
          "X-Title": "VoteVerse AI Summary",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct",
          messages: [
            {
              role: "system",
              content:
                "You are an AI that summarizes election manifestos. Respond ONLY with plain bullet points. Do NOT add introductions, explanations, titles, markdown, or formatting. Use simple '-' bullets only.",
            },
            {
              role: "user",
              content: text.slice(0, 4000), // 🔥 VERY IMPORTANT
            },
          ],
          temperature: 0.3,
        }),
      },
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



router.post("/extract/video-summary/:rollNumber", async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ rollNumber: req.params.rollNumber });
    if (!candidate?.campaignAudio) {
      return res.json({ error: "No audio found" });
    }

    const audioPath = `.${candidate.campaignAudio}`;

    // 🎤 TRANSCRIPTION (FREE)
    const transcript = await transcribeAudio(audioPath);

    // 🧠 SUMMARY (OpenRouter)
    const summary = await summarizeWithOpenRouter(transcript);

    // 🎭 SENTIMENT (OpenRouter)
    const sentiment = await sentimentWithOpenRouter(transcript);

    candidate.campaignVideoTranscript = transcript;
    candidate.campaignVideoSummary = summary;
    candidate.campaignVideoSentiment = sentiment;

    await candidate.save();

    res.json({ summary, sentiment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video AI failed" });
  }
});


module.exports = router;
