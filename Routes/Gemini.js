const express = require("express");
const { GoogleGenAI, Modality } = require("@google/genai");
const router = express.Router();

// ...existing code...

router.post("/generate-image", async (req, res) => {
  const { prompt } = req.body.prompt;
  try {
    
    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents:[
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
    });
    for (const part  of response.candidates[0].content.parts) {
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        // fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("Image saved as gemini-native-image.png");
        res.set("Content-Type", part.inlineData.mimeType || "image/png");
        res.send(buffer);
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
