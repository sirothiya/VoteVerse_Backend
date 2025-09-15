import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;
  try {
    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          config: { numberOfImages: 1 },
        }),
      }
    );

    const data = await googleRes.json();
    if (!googleRes.ok) {
      return res.status(400).json(data);
    }

    // get base64 from Google
    const imgBytes = data.generatedImages[0].image.imageBytes;

    // convert to Buffer
    const buffer = Buffer.from(imgBytes, "base64");

    // send file directly
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
