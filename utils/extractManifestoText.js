const path = require("path");
const extractPdfText = require("./extractPdfText");
const extractDocxText = require("./DocExtractor");

async function extractManifestoText(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return await extractPdfText(buffer);
  }

  if (ext === ".docx") {
    return await extractDocxText(buffer);
  }

  throw new Error("Unsupported manifesto file type");
}

module.exports = extractManifestoText;
