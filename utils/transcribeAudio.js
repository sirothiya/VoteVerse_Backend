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
      },
      body: audioBuffer,
    }
  );

  const rawText = await response.text();

  // 👇 VERY IMPORTANT LOG
  console.error("HF RAW RESPONSE:", rawText.slice(0, 300));

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("HF did not return JSON");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.text || "";
}

module.exports = transcribeAudio;
