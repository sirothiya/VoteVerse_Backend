const axios = require("axios");
const fs = require("fs");

async function transcribeAudio(audioPath) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  // 1️⃣ Upload audio
  const uploadRes = await axios.post(
    "https://api.assemblyai.com/v2/upload",
    fs.createReadStream(audioPath),
    {
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
    }
  );

  const audioUrl = uploadRes.data.upload_url;

  // 2️⃣ Start transcription (🔥 FIX IS HERE)
  const transcriptRes = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    {
      audio_url: audioUrl,
      speech_models: ["universal-2"], // ✅ REQUIRED
    },
    {
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
    }
  );

  const transcriptId = transcriptRes.data.id;

  // 3️⃣ Poll result
  while (true) {
    const pollingRes = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: { authorization: apiKey },
      }
    );

    const status = pollingRes.data.status;

    if (status === "completed") {
      return pollingRes.data.text;
    }

    if (status === "failed") {
      throw new Error(pollingRes.data.error);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
}

module.exports = transcribeAudio;
