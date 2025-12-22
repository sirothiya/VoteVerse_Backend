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

    // ✅ Validate class safely
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

    // ✅ Check rollNumber + class uniqueness
    const existingCandidate = await Candidate.findOne({
      rollNumber: data.rollNumber,
      class: data.class,
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

      const candidate = await Candidate.findOne({ rollNumber });
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

      if (req.files?.manifesto)
        candidate.manifesto = `/uploads/manifestos/${req.files.manifesto[0].filename}`; 

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
