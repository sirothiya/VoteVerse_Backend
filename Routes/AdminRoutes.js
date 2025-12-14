const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");

const candidate = require("../Models/Candidate");
const User = require("../Models/User");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const calculateFinalResults = require("../utils/calculateFinalResults");
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

router.post("/adminSignup", async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.name || !data.email || !data.schoolName || !data.password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if an admin already exists for the same school
    const existingAdmin = await Admin.findOne({ schoolName: data.schoolName });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: `An admin for ${data.schoolName} already exists` });
    }

    // Create new admin
    const admin = new Admin({
      name: data.name,
      email: data.email,
      schoolName: data.schoolName,
      password: data.password,
    });

    await admin.save();

    res
      .status(201)
      .json({ message: `Admin for ${data.schoolName} created successfully` });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/adminLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Must await this
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: "Admin with this email not found" });
    }

    // ✅ Use your schema method properly
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // ✅ Prepare token payload
    const payload = {
      id: admin._id,
      email: admin.email,
    };

    const token = generateToken(payload);

    return res.status(200).json({
      message: "Admin login successful",
      token,
      Admin: {
        name: admin.name,
        email: admin.email,
        schoolName: admin.schoolName,
      },
    });
  } catch (err) {
    console.error("Error logging in admin:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const candidates = await Admin.find();
    if (candidate.length > 1)
      return res.status(400).json({ error: "Admin Already Exist" });
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


router.post("/election/reset", jwtMiddleware, async (req, res) => {
  try {
    // 1️⃣ Fetch admin
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 2️⃣ Fetch active election
    const election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(400).json({ message: "No active election found" });
    }

    // 3️⃣ Finalize election results
    await calculateFinalResults();

    // 4️⃣ Close election
    election.isActive = false;
    election.status = "COMPLETED";
    await election.save();

    // 5️⃣ Reset admin election configuration
    admin.electionSetup = {
      announcementMessage: [],
      candidateRegStart: null,
      candidateRegEnd: null,
      electionStart: null,
      electionEnd: null,
      electionDurationHours: null,
    };
    admin.electionLocked = false;
    await admin.save();

    await User.updateMany({}, { isVoted: false });

    await candidate.deleteMany({});
    
    return res.json({
      success: true,
      message: "Election reset successfully. Candidates cleared for next election.",
    });
  } catch (err) {
    console.error("Election reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/electionsetup", jwtMiddleware, async (req, res) => {
  try {
    const adminId = req.adminId;
    const setupData = req.body;

    console.log("Received election setup data:", setupData);

    // Remove empty fields (prevents overwriting with null)
    Object.keys(setupData).forEach((key) => {
      if (setupData[key] === "" || setupData[key] === undefined) {
        delete setupData[key];
      }
    });

    // Calculate election end
    let endTime = null;
    if (setupData.electionStart && setupData.electionDurationHours) {
      const start = new Date(setupData.electionStart);
      endTime = new Date(start.getTime() + setupData.electionDurationHours * 3600000);
    }

    setupData.electionEnd = endTime;

    // Update admin
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: { electionSetup: setupData } },
      { new: true }
    );

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Update or create election
    let election = await Election.findOne();
    if (!election) {
      election = new Election({
        isActive: false,
        startTime: setupData.electionStart || null,
        endTime: endTime,
      });
    } else {
      election.startTime = setupData.electionStart || null;
      election.endTime = endTime;
    }

    await election.save();

    console.log("Saved Election End:", admin.electionSetup.electionEnd);

    return res.status(200).json({
      message: "Election setup updated",
      electionSetup: admin.electionSetup,
    });
  } catch (err) {
    console.log("Error in election setup:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/electionsetup", async (req, res) => {
  try {
    const admin = await Admin.findOne();
    return res.json(admin.electionSetup);
  } catch (err) {
    console.log("Error fetching election setup:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/updateStatus/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const status = req.body.status;
    const rollNumber = req.params.rollNumber;
    const candi = await candidate.findOneAndUpdate(
      { rollNumber: rollNumber },
      { status: status },
      { new: true }
    );
    if (!candi) return res.status(404).json({ message: "Candidate not found" });
    return res.status(200).json({ success: true, Candidate: candi });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/announcement", async (req, res) => {
  try {
    const { announcement } = req.body;

    if (!announcement) {
      return res.status(400).json({ message: "Announcement text required" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.announcements.push(announcement);
    await admin.save();

    res.json({
      message: "Announcement added",
      announcements: admin.announcements,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

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
