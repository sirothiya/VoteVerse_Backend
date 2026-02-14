const mammoth = require("mammoth");

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

module.exports = extractDocxText;
