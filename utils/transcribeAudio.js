const fs = require("fs");
const fetch = require("node-fetch");

async function transcribeAudio(audioPath) {
  const audioBuffer = fs.readFileSync(audioPath);

  const response = await fetch(
    "https://api-inference.huggingface.co/models/openai/whisper-small",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "audio/wav",
      },
      body: audioBuffer,
    },
  );

  const rawText = await response.text();

  console.log("HF RAW RESPONSE:", rawText.slice(0, 300));

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error("HF did not return JSON. Raw response logged above.");
  }
}

module.exports = transcribeAudio;
