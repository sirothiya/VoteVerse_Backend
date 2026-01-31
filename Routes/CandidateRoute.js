const express = require("express");
const router = express.Router();
const axios = require("axios");

const Candidate = require("../Models/Candidate");
const Election = require("../Models/Election");
const { generateToken, jwtMiddleware } = require("../jwt");
const extractPdfText = require("../utils/extractPdfText");

// ------------------ File Upload Setup ------------------
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const getActiveElection = require("../utils/getActiveElection");
const { get } = require("http");

// Ensure folders exist
[
  "uploads/manifestos",
  "uploads/videos",
  "uploads/photos",
  "uploads/consents",
  "uploads/others",
].forEach((dir) => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads/others";
    if (file.fieldname === "manifesto") folder = "uploads/manifestos";
    else if (file.fieldname === "campaignVideo") folder = "uploads/videos";
    else if (file.fieldname === "profilePhoto") folder = "uploads/photos";
    else if (file.fieldname === "parentalConsent") folder = "uploads/consents";
    cb(null, path.join(__dirname, "..", folder));
    // cb(bull,folder)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/candidateSignup", async (req, res) => {
  try {
    const data = req.body;

    const classMatch = data.class?.match(/\d+/);
    if (!classMatch) {
      return res.status(400).json({
        error: "Invalid class format",
      });
    }

    const classNum = parseInt(classMatch[0]);
    if (classNum < 10) {
      return res.status(400).json({
        error: "Classes below 10 are not allowed to be a candidate",
      });
    }

    const election = await getActiveElection();
    // const election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(400).json({ error: "No active election" });
    }
    const existingCandidate = await Candidate.findOne({
      rollNumber: data.rollNumber,
      election: election._id,
    });

    if (existingCandidate) {
      return res.status(400).json({
        error:
          "Candidate with this roll number already registered in this class",
      });
    }

    // ✅ Create candidate
    const newCandidate = new Candidate({
      name: data.name,
      rollNumber: data.rollNumber,
      password: data.password,
      class: data.class,
      dob: data.dob,
      gender: data.gender,
      position: data.position,
      election: election._id,
    });

    const savedCandidate = await newCandidate.save();

    const payload = {
      id: savedCandidate._id,
      rollNumber: savedCandidate.rollNumber,
    };

    const token = generateToken(payload);

    return res.status(201).json({
      message: "Candidate registered successfully",
      savedCandidate,
      token,
    });
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/candidateLogin", async (req, res) => {
  try {
    const { rollNumber, password } = req.body;

    // 🔑 Find candidate WITHOUT election filter
    console.log("Attempting login for roll number:", rollNumber);
    const candidate = await Candidate.findOne({ rollNumber }).populate(
      "election",
    );
    console.log("Candidate found:", candidate); // Debug log
    if (!candidate) {
      return res.status(401).json({ error: "Candidate not found" });
    }

    const isMatch = await candidate.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid roll number or password" });
    }

    const token = generateToken({
      id: candidate._id,
      rollNumber: candidate.rollNumber,
    });

    return res.status(200).json({
      message: "Candidate login successful",
      token,
      candidate: {
        id: candidate._id,
        name: candidate.name,
        rollNumber: candidate.rollNumber,
        class: candidate.class,
        position: candidate.position,
        electionStatus: candidate.election.status, // ⭐ KEY
        electionId: candidate.election._id,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const candidate = await Candidate.find();
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });
    return res.json(candidate);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;
    const candidate = await Candidate.findOne({ rollNumber }).populate(
      "election",
    );

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    return res.status(200).json({ candidate });
  } catch (err) {
    console.error("Error checking profile:", err);
    return res
      .status(500)
      .json({ message: "Error checking profile", error: err.message });
  }
});

router.get(
  "/checkprofilestatus/:rollNumber",
  jwtMiddleware,
  async (req, res) => {
    try {
      const rollNumber = req.params.rollNumber;
      const candidate = await Candidate.findOne({ rollNumber });

      // 'let' since we might reassign

      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      return res.status(200).json({ status: candidate.status });
    } catch (err) {
      console.error("Error checking profile:", err);
      res
        .status(500)
        .json({ message: "Error checking profile", error: err.message });
    }
  },
);

router.post(
  "/complete-profile/:rollNumber",
  jwtMiddleware,
  upload.fields([
    { name: "manifesto", maxCount: 1 },
    { name: "campaignVideo", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "parentalConsent", maxCount: 1 },
    { name: "partysymbol", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { rollNumber } = req.params;
      const activeElection = await getActiveElection();
      const candidate = await Candidate.findOne({
        rollNumber,
        election: activeElection._id,
      });

      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      if (candidate.profilecompleted) {
        return res.status(400).json({
          message: "Profile already completed",
        });
      }

      if (req.files?.campaignVideo)
        candidate.campaignVideo = `/uploads/videos/${req.files.campaignVideo[0].filename}`;

      if (req.files?.profilePhoto)
        candidate.profilePhoto = `/uploads/photos/${req.files.profilePhoto[0].filename}`;

      if (req.files?.parentalConsent)
        candidate.parentalConsent = `/uploads/consents/${req.files.parentalConsent[0].filename}`;

      if (req.files?.partysymbol)
        candidate.partysymbol = `/uploads/others/${req.files.partysymbol[0].filename}`;

      // if (req.files?.manifesto)
      //   candidate.manifesto = `/uploads/manifestos/${req.files.manifesto[0].filename}`;

      if (req.files?.manifesto) {
        const manifestoFile = req.files.manifesto[0];

        candidate.manifesto = {
          pdfPath: `/uploads/manifestos/${manifestoFile.filename}`,
          originalPdfName: manifestoFile.originalname,
          extractedText: "", // extracted later
        };
      }

      candidate.achievements = req.body.achievements
        ? JSON.parse(req.body.achievements)
        : [];

      candidate.initiatives = req.body.initiatives
        ? JSON.parse(req.body.initiatives)
        : [];

      candidate.declarationSigned =
        req.body.declarationSigned === "true" ||
        req.body.declarationSigned === true;

      candidate.profilecompleted = true;

      await candidate.save();

      return res.status(200).json({
        message: "Candidate profile completed successfully",
        updatedCandidate: candidate,
      });
    } catch (err) {
      console.error("Error completing profile:", err);
      return res.status(500).json({
        message: "Error completing profile",
        error: err.message,
      });
    }
  },
);

const list = [
  "AI is warming up. Please try again.",
  "AI model loading. Try again after some time.",
  "Could not summarize.",
  "AI temporarily unavailable.",
];
router.post("/extract/manifesto/:rollNumber", async (req, res) => {
  let candidate; // <-- important for logging
  try {
    const rollNumber = req.params.rollNumber;
    console.log("➡️ Extracting manifesto for:", rollNumber);

    candidate = await Candidate.findOne({ rollNumber });
    console.log("✅ Candidate found:", !!candidate);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    console.log("📄 Manifesto path:", candidate.manifesto?.pdfPath);

    if (!candidate.manifesto?.pdfPath) {
      throw new Error("Manifesto PDF path is missing");
    }
    
    if(candidate.manifesto.summary && candidate.manifesto.summary.length > 0){
      return res.json({
        message: "Manifesto already summarized",
        summary: candidate.manifesto.summary,
      });
    }
    const pdfUrl = `https://voteverse-backend-new.onrender.com${candidate.manifesto.pdfPath}`;
    console.log("🌐 Fetching PDF from:", pdfUrl);

    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
    });

    console.log("📦 PDF size:", response.data.byteLength);

    const text = await extractPdfText(response.data);
    console.log("🧠 Extracted text length:", text.length);

    candidate.manifesto.extractedText = text;

    const aiRes = await fetch(
      "https://voteverse-backend-new.onrender.com/api/ai/summarize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      },
    );

    const aiData = await aiRes.json();

    if (!list.includes(aiData.summary)) {
      candidate.manifesto.summary = aiData.summary;
      console.log("📝 Manifesto summary length:", aiData.summary.length);
      await candidate.save();
    }

    return res.json({
      message: "Manifesto extracted successfully",
      extractedText: text,
      summary: aiData.summary,
    });
  } catch (err) {
    console.error("❌ EXTRACTION FAILED");
    console.error("Reason:", err.message);
    console.error("Stack:", err.stack);
    console.error("Candidate:", candidate);

    return res.status(500).json({
      message: "Extraction failed",
      error: err.message, // TEMP
    });
  }
});

// ✅ DELETE candidate by roll number
router.delete("/delete/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;

    // Find the candidate
    const activeElection = await getActiveElection();
    if (!activeElection) {
      return res.status(400).json({
        success: false,
        message: "No active election found.",
      });
    }
    const candidate = await Candidate.findOneAndDelete({
      rollNumber,
      election: activeElection._id,
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: `Candidate with roll number ${rollNumber} not found.`,
      });
    }
    if (candidate.status === "Approved") {
      return res.status(400).json({
        success: false,
        message: `Approved candidates cannot be deleted.`,
      });
    }
    // 🗑️ Delete uploaded files safely
    const filesToDelete = [
      candidate.profilePhoto,
      candidate.manifesto,
      candidate.campaignVideo,
      candidate.partysymbol,
      candidate.parentalConsent,
    ];

    filesToDelete.forEach((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        }
      }
    });

    // 🧹 Delete the candidate document from DB
    await Candidate.deleteOne({ rollNumber });

    return res.status(200).json({
      success: true,
      message: `Candidate with roll number ${rollNumber} and all associated files deleted successfully.`,
    });
  } catch (err) {
    console.error("Error deleting candidate:", err);
    return res.status(500).json({
      success: false,
      message: "Error deleting candidate and associated files.",
      error: err.message,
    });
  }
});

module.exports = router;
