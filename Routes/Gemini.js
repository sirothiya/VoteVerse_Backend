const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function generateImageWithRetry(model, prompt, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // start with 1 second

  while (attempt < maxRetries) {
    try {
      // Attempt generation
      const result = await model.generateContent(prompt);
      return result; // success
    } catch (err) {
      // Check if it's a 429 error
      if (
        err.message.includes("429") ||
        (err.status && err.status === 429)
      ) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(
            `Exceeded retry attempts due to rate limiting: ${err.message}`
          );
        }
        console.warn(`429 Too Many Requests. Retry #${attempt} in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        // Not a rate limit error → throw immediately
        throw err;
      }
    }
  }
}

router.post("/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
    });

    // Call with retry
    const result = await generateImageWithRetry(model, prompt, 3);

    // Extract image from the result
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
