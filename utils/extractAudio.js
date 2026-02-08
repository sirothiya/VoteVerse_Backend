const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require("fs");

const extractAudio = (videoPath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(videoPath)) {
      return reject(
        new Error(`Video file not found at path: ${videoPath}`)
      );
    }

    const audioPath = videoPath
      .replace("/videos/", "/audio/")
      .replace(path.extname(videoPath), ".wav");

    ffmpeg(videoPath)
      .output(audioPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .on("end", () => resolve(audioPath))
      .on("error", reject)
      .run();
  });
};


module.exports = extractAudio;
