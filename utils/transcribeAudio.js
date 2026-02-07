const { spawn } = require("child_process");

function transcribeAudio(audioPath) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", ["transcribe.py", audioPath]);

    let transcript = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
      transcript += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        reject(errorOutput);
      } else {
        resolve(transcript.trim());
      }
    });
  });
}

module.exports = transcribeAudio;
