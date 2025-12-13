// backend/routes/gemini.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // or axios if you prefer

const GEMINI_URL = "https://gemini.googleapis.com/v1/images:generate";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

router.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;
  let retries = 3;

  while (retries > 0) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (response.ok) {
        // Convert image data to buffer or send as is
        const imageBase64 = data?.images?.[0]?.b64_json;
        if (!imageBase64) {
          throw new Error("No image returned");
        }
        const imgBuffer = Buffer.from(imageBase64, "base64");
        res.setHeader("Content-Type", "image/png");
        return res.send(imgBuffer);
      } else if (data.error?.includes("RetryInfo")) {
        const retryMatch = data.error.match(/"retryDelay":"(\d+)s"/);
        const delay = retryMatch ? parseInt(retryMatch[1], 10) * 1000 : 5000;
        console.warn(`Gemini retry requested, waiting ${delay / 1000}s`);
        await sleep(delay);
        retries--;
      } else {
        console.error("Gemini error:", data);
        return res.status(500).json({ error: data });
      }
    } catch (err) {
      console.error("Gemini request failed:", err);
      retries--;
      if (retries <= 0) return res.status(500).json({ error: err.message });
      await sleep(5000);
    }
  }
});

module.exports = router;
