const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");

const candidate = require("../Models/Candidate");
const User = require("../Models/User");
const Admin=require("../Models/Admin")
const { generateToken, jwtMiddleware } = require("../jwt");

const checkAdmin = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log("User fetched from DB:", user);
    console.log("User role:", user.role);
    return user && user.role == "Admin";
  } catch (err) {
    return false;
  }
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, "./uploads"); // folder to store images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    return cb(null, uniqueSuffix + path.extname(file.originalname)); // unique filename
  },
});
const upload = multer({ storage });

router.post("/adminSignup",async(req,res)=>{
 try {
    const data = req.body;

    // Check if an admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ error: "An admin account already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create new admin
    const admin = new Admin({
      name: data.name,
      email: data.email,
      schoolName: data.schoolName,
      password: hashedPassword,
    });

    await admin.save();
    res.status(201).json({ message: "Admin account created successfully" });

  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/adminLogin",async(req,res)=>{
  try{
    const {email,password}=req.body;
    const admin=Admin.findOne({email});
    if(!admin){
      return res.status(401).json({error:"Admin with this email not found"});
    }
    if(!admin || await (admin.comparePassword(password))){
      return res.status(401).json({ error: "Invalid aadhar or password" });
    }
    const payload={
      id:admin.id,
      rollNumber:admin.rollNumber
    }
    const token=generateToken(payload);
    return res.status(200).json({
      name:admin.name,
      email:admin.email,
      school:admin.school
    },token)
  }catch(err){
console.error("Error logging in user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
})

router.get("/", async (req, res) => {
  try {
    const candidates = await Admin.find();
    if(candidate.length>1)return res.status(400).json({error:"Admin Already Exist"});
    const data = candidates?.map((c) => ({
      name: c.name,
      email: c.email,
      schoolName: c.schoolName,
      id: c._id,
    }));
    return res.status(200).json(data);
  } catch (err) {
    console.log("Error fetching admin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// router.get("/:party", async (req, res) => {
//   try {
//     if (checkAdmin(req.user.id))
//       return res.status(403).json({ message: "user is not an admin" });
//     const party = req.params.party;
//     const candidates = await candidate.find({ party });
//     if (!candidates) {
//       return res.status(400).json({ message: "No candidate found" });
//     }
//     res.status(200).json(candidates);
//   } catch (err) {
//     console.log("Error fetching candidate:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.put("/:id", jwtMiddleware, async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id)))
      return res.status(403).json({ message: "user is not an admin" });
    const id = req.params.id;
    const updatedData = req.body;
    const updatedCandidate = await candidate.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedCandidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    return res.status(200).json({
      message: "Candidate updated successfully",
      candidate: updatedCandidate,
    });
  } catch (err) {
    console.error("Error updating candidate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", jwtMiddleware, async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id)))
      return res.status(403).json({ message: "user is not an admin" });
    const id = req.params.id;
    const deletedCandidate = await candidate.findByIdAndDelete(id);
    if (!deletedCandidate) {
      return res.status(400).json({ message: "No candidate found" });
    }
    return res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Error deleting candidate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vote/:candidateId", jwtMiddleware, async (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const userId = req.user.id;
    const user = await User.findById(userId);
    const Candidate = await candidate.findById(candidateId);
    if (user.isVoted)
      return res.status(403).json({ error: "User has already voted" });
    if (user.role === "Admin")
      return res.status(403).json({ error: "Admin cannot vote" });
    Candidate.votes.push({ user: userId, votedAt: new Date() });
    Candidate.voteCount++;
    await Candidate.save();
    user.isVoted = true;
    await user.save();
    return res.status(200).json({ message: "Vote cast successfully" });
  } catch (err) {
    console.error("Error casting vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vote/count", async (req, res) => {
  try {
    const candidates = await candidate.find().sort({ voteCount: "desc" });
    const partyVoteMap = {};

    candidates.forEach((el) => {
      if (partyVoteMap[el.party]) {
        partyVoteMap[el.party] += el.voteCount;
      } else {
        partyVoteMap[el.party] = el.voteCount;
      }
    });
    const voteRecord = Object.entries(partyVoteMap).map(([party, votes]) => ({
      party,
      votes,
    }));

    return res.status(200).json({ voteRecord });
  } catch (err) {
    console.error("Error fetching vote count:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/delete/all", jwtMiddleware, async (req, res) => {
  try {
    await candidate.deleteMany({});
    await User.updateMany({}, { $set: { isVoted: false } });
    return res
      .status(200)
      .json({ message: "All candidates deleted successfully" });
  } catch (err) {
    console.error("Error deleting all candidates:", err);
   return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
