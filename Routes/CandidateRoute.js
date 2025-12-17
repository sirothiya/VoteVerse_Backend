const express = require("express");
const router = express.Router();

const Candidate = require("../Models/Candidate");
const { generateToken, jwtMiddleware } = require("../jwt");

// ------------------ File Upload Setup ------------------
const fs = require("fs");
const path = require("path");
const multer = require("multer");

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
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/candidateSignup", async (req, res) => {
  try {
    const data = req.body;
    const existingCandidate = await Candidate.findOne({
      rollNumber: data.rollNumber,
      class: data.class,
    });
    if (existingCandidate)
      return res
        .status(400)
        .json({
          error: "Candidate with this rollnumber and class already registered",
        });
    const newCandidate = new Candidate({
      name: data.name,
      rollNumber: data.rollNumber,
      password: data.password,
      class: data.class,
      dob: data.dob,
      gender: data.gender,
      position: data.position,
      password: data.password,
    });
    console.log("check1");
    let num = parseInt(data.class.match(/\d+/)[0]);
    if (num < 10)
      return res.status(400).json({
        error: "Classes below 10 are not allowed to be a candidate",
      });
    console.log("check2");
    const savedCandidate = await newCandidate.save();
    console.log("check3");
    const payload = {
      id: savedCandidate.id,
      rollNumber: savedCandidate.rollNumber,
    };
    await Candidate.collection.dropIndex("aadhar_1");
    console.log("check4");
    const token = generateToken(payload);
    console.log("check5");
    return res.status(200).json({ savedCandidate, token });
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/candidateLogin", async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    console.log("1");
    const can = await Candidate.findOne({ rollNumber });
    console.log("11");
    if (!can) {
      return res
        .status(401)
        .json({ error: "candidate not found, please signup" });
    }
    if (!can || !(await can.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid aadhar or password" });
    }
    console.log("111");
    const payload = {
      id: can.id,
      rollNumber: can.rollNumber,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      message: "Canidate login successfull",
      Candidate: {
        id: can.id,
        name: can.name,
        rollNumber: can.rollNumber,
        class: can.class,
        dob: can.dob,
        gender: can.gender,
        position: can.position,
      },
      token,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
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
    const candidate = await Candidate.findOne({ rollNumber }).lean(); // 'let' since we might reassign

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
      let candidate = await Candidate.findOne({ rollNumber }); // 'let' since we might reassign

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
  }
);

// ✅ DELETE candidate by roll number
router.delete("/delete/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;

    // Find the candidate
    const candidate = await Candidate.findOne({ rollNumber });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: `Candidate with roll number ${rollNumber} not found.`,
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
