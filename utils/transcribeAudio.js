const whisper = require("openai-whisper");

async function transcribeAudio(audioPath) {
  const result = await whisper.transcribe({
    file: audioPath,
    model: "base",
  });

  return result.text;
}

module.exports = transcribeAudio;
