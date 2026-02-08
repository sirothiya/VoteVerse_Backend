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
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.text || "";
}

module.exports = transcribeAudio;
