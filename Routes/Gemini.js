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
      contents: prompt,
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
  //   const googleRes = await fetch(
  //     `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${process.env.GEMINI_API_KEY}`,
  //     {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         prompt,
  //         config: { numberOfImages: 1 },
  //       }),
  //     }
  //   );

  //   const data = await googleRes.json();
  //   if (!googleRes.ok) {
  //     return res.status(400).json(data);
  //   }

  //   // get base64 from Google
  //   const imgBytes = data.generatedImages[0].image.imageBytes;

  //   // convert to Buffer
  //   const buffer = Buffer.from(imgBytes, "base64");

  //   // send file directly
  //   res.setHeader("Content-Type", "image/png");
  //   res.send(buffer);
  // } catch (err) {
  //   res.status(500).json({ error: err.message });
  // }
});

export default router;
