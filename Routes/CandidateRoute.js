const express = require("express");
const router = express.Router();
const multer =require("multer")
const path=require("path")

const Candidate = require("../Models/Candidate");
const { generateToken, jwtMiddleware } = require("../jwt");


// ------------------ File Upload Setup ------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "manifesto") cb(null, "uploads/manifestos/");
    else if (file.fieldname === "campaignVideo") cb(null, "uploads/videos/");
    else if (file.fieldname === "profilePhoto") cb(null, "uploads/photos/");
    else if (file.fieldname === "parentalConsent") cb(null, "uploads/consents/");
    else cb(null, "uploads/others/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/candidateSignup",async (req, res) => {
  
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
      console.log("check1")
       let num = parseInt(data.class.match(/\d+/)[0]);
    if (num < 10)
      return res
        .status(400)
        .json({
          error: "Classes below 10 are not allowed to be a candidate",
        });
        console.log("check2")
      const savedCandidate = await newCandidate.save();
      console.log("check3")
       const payload = {
        id: savedCandidate.id,
        rollNumber: savedCandidate.rollNumber,
      };
      console.log("check4")
      const token = generateToken(payload);
      console.log("check5")
     return res.status(200).json({ savedCandidate ,token});
    } catch (err) {
      console.error("Error adding candidate:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post("/candidateLogin", async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    console.log("1");
    const can = await Candidate.findOne({ rollNumber });
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
      rollNumber: can.rollNumber,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      message:"Canidate login successfull",
      Candidate: {
        id: can.id,
        name: can.name,
        rollNumber:can.rollNumber,
        class:can.class,
        dob:can.dob,
        gender:can.gender,
        position:can.position
      },
      token,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/checkprofilestatus/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;
    let candidate = await Candidate.findOne({ rollNumber }).lean(); // 'let' since we might reassign

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Hydrate if needed
    if (typeof candidate.checkProfileComplete !== "function") {
      candidate = Candidate.hydrate(candidate);
    }

    const isComplete = candidate.checkProfileComplete();
    const status = candidate.status;

    res.json({
      profileCompleted: isComplete || false,
      status: status
    });

  } catch (err) {
    console.error("Error checking profile:", err);
    res.status(500).json({ message: "Error checking profile", error: err.message });
  }
});

router.get("/checkprofilestatus/:rollNumber",jwtMiddleware,async(req,res)=>{
  try{
    const rollNumber=req.params.rollNumber;
    const candidate=await Candidate.findOne({rollNumber}).lean();
   if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    if (typeof candidate.checkProfileComplete !== "function") {
      candidate = Candidate.hydrate(candidate);
    }
    //  console.log(typeof checkProfileComplete);
    
    const isComplete = candidate.checkProfileComplete();
    const status=candidate.status;
    res.json({
      profileCompleted: isComplete || "",
      status:status
    });

  }catch(err){
    res.status(500).json({ message: "Error checking profile", error: err.message });
  }
})


router.post(
  "/update-profile/:id",
  jwtMiddleware,
  upload.fields([
    { name: "manifesto", maxCount: 1 },
    { name: "campaignVideo", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "parentalConsent", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const candidateId = req.params.id;
      const data=req.body;
      const files=req.files;
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      // Get candidate from DB
       const updateData = {
        manifesto: files.manifesto ? files.manifesto[0].path : undefined,
        campaignVideo: files.campaignVideo ? files.campaignVideo[0].path : undefined,
        profilePhoto: files.profilePhoto ? files.profilePhoto[0].path : undefined,
        parentalConsent: files.parentalConsent ? files.parentalConsent[0].path : undefined,
        achievements: data.achievements ? JSON.parse(data.achievements) : [],
        initiatives: data.initiatives ? JSON.parse(data.initiatives) : [],
        declarationSigned: data.declarationSigned === "true",
      };
      
       const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $set: updateData },
        { new: true }
      );

      // Extract fields from body
      res.status(200).json({ message: "Profile updated successfully", updatedCandidate });
      
    } catch (err) {
      console.error("Error updating candidate profile:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);




module.exports = router;
