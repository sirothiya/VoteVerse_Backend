const { AssemblyAI } = require("assemblyai");
const fs = require("fs");

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

async function transcribeAudio(audioPath) {
  if (!fs.existsSync(audioPath)) {
    throw new Error("Audio file not found");
  }

  const transcript = await client.transcripts.transcribe({
    audio: audioPath,
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error);
  }

  return transcript.text || "";
}

module.exports = transcribeAudio;
