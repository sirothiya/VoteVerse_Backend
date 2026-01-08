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
const getActiveElection = require("../utils/getActiveElection");

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



router.post("/election/reset", jwtMiddleware, async (req, res) => {
  try {
    // 1️⃣ Fetch admin
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 2️⃣ Fetch active election
    const election = await getActiveElection();

    // 3️⃣ Finalize election results
    if (election) {
      try {
        await calculateFinalResults();
        // 4️⃣ Close election
        election.isActive = false;
        election.status = "COMPLETED";
        await election.save();
      } catch (err) {
        console.error("Error calculating final results during reset:", err);
        
      }
    }
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

    await User.updateMany({}, { isVoted: false, votesCast: { headBoy: false, headGirl: false } });

  await candidate.deleteMany({});

    return res.json({
      success: true,
      message:
        "Election reset successfully. Candidates cleared for next election.",
    });
  } catch (err) {
    console.error("Election reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// router.put("/electionsetup", jwtMiddleware, async (req, res) => {
//   try {
//     const adminId = req.adminId;
//     const setupData = req.body;

//     console.log("Received election setup data:", setupData);

//     Object.keys(setupData).forEach((key) => {
//       if (setupData[key] === "" || setupData[key] === undefined) {
//         delete setupData[key];
//       }
//     });

//     let endTime = null;
//     if (setupData.electionStart && setupData.electionDurationHours) {
//       const start = new Date(setupData.electionStart);
//       endTime = new Date(
//         start.getTime() + setupData.electionDurationHours * 3600000
//       );
//     }

//     setupData.electionEnd = endTime;

   
//     const admin = await Admin.findByIdAndUpdate(
//       adminId,
//       { $set: { electionSetup: setupData } },
//       { new: true }
//     );

//     if (!admin) return res.status(404).json({ message: "Admin not found" });

    
//     let election = await Election.findOne();
//     if (!election) {
//       election = new Election({
//         isActive: false,
//         startTime: setupData.electionStart || null,
//         endTime: endTime,
//       });
//     } else {
//       election.startTime = setupData.electionStart || null;
//       election.endTime = endTime;
//       election.status = "ONGOING";
//     }

//     await election.save();

//     console.log("Saved Election End:", admin.electionSetup.electionEnd);

//     return res.status(200).json({
//       message: "Election setup updated",
//       electionSetup: admin.electionSetup,
//     });
//   } catch (err) {
//     console.log("Error in election setup:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });



router.put("/electionsetup", jwtMiddleware, async (req, res) => {
  try {
    const adminId = req.adminId;
    const setupData = req.body;

    // 1️⃣ Clean empty fields
    Object.keys(setupData).forEach((key) => {
      if (setupData[key] === "" || setupData[key] === undefined) {
        delete setupData[key];
      }
    });

    // 2️⃣ Calculate start & end time
    if (!setupData.electionStart || !setupData.electionDurationHours) {
      return res.status(400).json({
        message: "Election start time and duration are required",
      });
    }

    const startTime = new Date(setupData.electionStart);
    const endTime = new Date(
      startTime.getTime() + setupData.electionDurationHours * 3600000
    );

    // 3️⃣ Close any ONGOING election (VERY IMPORTANT)
    await Election.updateMany(
      { status: "ONGOING" },
      {
        $set: {
          status: "COMPLETED",
          isActive: false,
        },
      }
    );
    const getElectionSession = (startTime, endTime) => {
  const startYear = startTime.getFullYear();
  const endYear = endTime.getFullYear();

  if (startYear === endYear) {
    return `${startYear}-${startYear + 1}`;
  }

  return `${startYear}-${endYear}`;
};
  const electionSession = getElectionSession(startTime, endTime);

    // 4️⃣ Create a BRAND NEW election
    const election = await Election.create({
      isActive: true,
      startTime,
      endTime,
      status: "ONGOING",
      electionSession: electionSession, // e.g. 2024-25
    });

    // 5️⃣ Update admin setup (UI purpose only)
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $set: {
          electionSetup: {
            ...setupData,
            electionStart: startTime,
            electionEnd: endTime,
            electionId: election._id,
          },
        },
      },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json({
      message: "New election created successfully",
      election,
    });
  } catch (err) {
    console.error("Election Setup Error:", err);
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
    const activeElection = await Election.findOne({ isActive: true });
    const candi = await candidate.findOneAndUpdate(
      { rollNumber: rollNumber,election: activeElection._id },
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


router.delete("/delete/all", jwtMiddleware, async (req, res) => {
  try {
    const election = await Election.findOne({ isActive: true });
    const electionId = election._id;
    await candidate.deleteMany({ election: electionId });
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
