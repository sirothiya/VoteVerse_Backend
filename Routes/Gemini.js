const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // note: this is @google/generative-ai
const router = express.Router();

// Make sure API key is set in .env
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post("/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt; // not destructuring with { prompt } = req.body.prompt

    // Call Gemini’s image preview model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    const result = await model.generateContent([
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]);

    // The response holds image(s) in inlineData
    const parts = result.response.candidates[0].content.parts;

    // Find first image
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      return res.status(400).json({ error: "No image returned from Gemini" });
    }

    const imageData = imagePart.inlineData.data; // base64
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    const buffer = Buffer.from(imageData, "base64");
    res.set("Content-Type", mimeType);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
