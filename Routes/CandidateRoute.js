const express = require("express");
const router = express.Router();
const multer =require("multer")
const path=require("path")

const Candidate = require("../Models/Candidate");
const User = require("../Models/User");
const { generateToken, jwtMiddleware } = require("../jwt");


// ------------------ File Upload Setup ------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "manifesto") {
      cb(null, "uploads/manifestos/");
    } else if (file.fieldname === "video") {
      cb(null, "uploads/videos/");
    } else {
      cb(null, "uploads/others/");
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/candidateSignup", jwtMiddleware,async (req, res) => {
    try {
      const data=req.body;
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
       let num = parseInt(data.class.match(/\d+/)[0]);
    if (num < 10)
      return res
        .status(400)
        .json({
          error: "Classes below 10 are not allowed to be a candidate",
        });
      const savedCandidate = await newCandidate.save();
       const payload = {
        id: savedCandidate.id,
        rollNumber: savedCandidate.rollNumber,
      };
      const token = generateToken(payload);
     return res.status(200).json({ savedCandidate ,token});
    } catch (err) {
      console.error("Error adding candidate:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    const { aadhar, password } = req.body;
    console.log("1");
    const can = await Candidate.findOne({ aadhar });
    console.log("11");
    if(!can){
      return res.status(401).json({error:"candidate not found, please signup"});
    }
    if (!can || !(await can.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid aadhar or password" }); 
    }
    console.log("111");
    const payload = {
      id: can.id,
      aadhar: can.aadhar,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      participant: {
        id: can.id,
        name: can.name,
        age: can.age,
        addhar:can.aadhar,
        partySymbol:can.partySymbol,
       party:can.party,
       isProfileComplete: can.isProfileComplete,
      },
      token,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id",jwtMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const ummedwar = await Candidate.findById(id);
    if (!ummedwar) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    const checkProfile= ummedwar.checkProfileComplete();
    ummedwar.isProfileComplete=checkProfile;
    await ummedwar.save();
    
   return res.status(200).json(ummedwar);
  } catch (err) {
    console.log("Error fetching candidate by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/update-profile/:id",
  jwtMiddleware,
  upload.fields([
    { name: "manifesto", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const candidateId = req.params.id;

      // Get candidate from DB
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Extract fields from body
      const { education, profession, bio, socialLinks, achievements } = req.body;

      if (education) candidate.education = education;
      if (profession) candidate.profession = profession;
      if (bio) candidate.bio = bio;

      // handle social links (JSON expected)
      if (socialLinks) {
        try {
          const links = JSON.parse(socialLinks);
          candidate.socialLinks = {
            twitter: links.twitter || "",
            linkedin: links.linkedin || "",
            website: links.website || "",
          };
        } catch (err) {
          console.log("Error parsing socialLinks:", err);
        }
      }

      // handle achievements (comma-separated string OR array)
      if (achievements) {
        if (Array.isArray(achievements)) {
          candidate.achievements = achievements;
        } else {
          candidate.achievements = achievements.split(",").map((a) => a.trim());
        }
      }

      // handle files
      if (req.files["manifesto"]) {
        candidate.manifesto = "/uploads/manifestos/" + req.files["manifesto"][0].filename;
      }
      if (req.files["video"]) {
        candidate.Video = "/uploads/videos/" + req.files["video"][0].filename;
      }

      // update isProfileComplete automatically
      candidate.isProfileComplete = candidate.checkProfileComplete();

      await candidate.save();

      return res.status(200).json({
        message: "Profile updated successfully",
        candidate,
      });
    } catch (err) {
      console.error("Error updating candidate profile:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);




module.exports = router;
