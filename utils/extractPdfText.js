// async function extractPdfText(buffer) {
//   const pdfParse = (await import("pdf-parse")).default;
//   const data = await pdfParse(buffer);
//   return data.text;
// }

// module.exports = extractPdfText;

const pdfParse = require("pdf-parse");

async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

module.exports = extractPdfText;


