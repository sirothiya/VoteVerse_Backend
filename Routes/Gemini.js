const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    // get model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview"
    });

    // NO role, NO parts, just pass the prompt string
    const result = await model.generateContent(prompt);

    // extract inlineData (the image)
    const parts = result.response.candidates[0].content.parts;
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
