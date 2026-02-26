const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.length < 50) {
      return res.json({ 
        success: false,
        summary: null,
        error: "Text too short to summarize"
      });
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
                "You are an AI that summarizes election manifestos. Respond ONLY with plain bullet points. Do NOT add introductions, explanations, titles, markdown, or formatting. Use simple '-' bullets only. You are a strict summarization engine. Compress the input text into a VERY SHORT summary.Rules:- Use ONLY bullet points. Maximum 5 bullet points. Each bullet must be under 12 wordsCapture only the core promises or themesDo NOT rewrite sectionsDo NOT add explanations, titles, or conclusionsIf text is repetitive, merge ideasOutput bullets only, nothing else",
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

    if (!data?.choices?.length || !data.choices[0]?.message?.content) {
      return res.json({ 
        success: false,
        summary: null,
        error: "AI failed to generate summary"
      });
    }

    const summary = data.choices[0].message.content.trim();
    
    // Validate that we got actual content and not an error message
    if (!summary || summary.length < 10) {
      return res.json({ 
        success: false,
        summary: null,
        error: "Invalid summary received from AI"
      });
    }

    return res.json({
      success: true,
      summary: summary,
    });
  } catch (error) {
    console.error("OpenRouter Summary Error:", error.message);
    return res.json({
      success: false,
      summary: null,
      error: error.message || "AI service temporarily unavailable"
    });
  }
});


router.post("/sentiment", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.json({ 
        success: false,
        sentiment: null,
        error: "Text too short to analyze"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://voteverse-backend-new.onrender.com",
          "X-Title": "VoteVerse Sentiment",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct",
          messages: [
            {
              role: "system",
              content:
                "Classify the sentiment of the text. Respond with only one word: Positive, Neutral, or Negative.",
            },
            {
              role: "user",
              content: text.slice(0, 3000),
            },
          ],
          temperature: 0,
        }),
      }
    );

    const data = await response.json();
    const sentimentRaw = data?.choices?.[0]?.message?.content;

    if (!sentimentRaw) {
      return res.json({ 
        success: false,
        sentiment: null,
        error: "AI failed to analyze sentiment"
      });
    }

    const sentiment = sentimentRaw.trim();
    
    // Validate that sentiment is one of the expected values
    const validSentiments = ["Positive", "Neutral", "Negative"];
    if (!validSentiments.includes(sentiment)) {
      console.warn(`Unexpected sentiment value: ${sentiment}, defaulting to Neutral`);
      return res.json({ 
        success: true,
        sentiment: "Neutral"
      });
    }

    return res.json({ 
      success: true,
      sentiment 
    });
  } catch (err) {
    console.error("Sentiment AI failed:", err.message);
    return res.json({ 
      success: false,
      sentiment: null,
      error: err.message || "Sentiment analysis failed"
    });
  }
});

module.exports = router;

