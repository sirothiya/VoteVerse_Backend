const express = require("express");
const router = express.Router();
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");
const User = require("../Models/User");
const { get } = require("mongoose");
const getActiveElection = require("../utils/getActiveElection");
const calculateElectionResult = require("../utils/calculateElectionResult");
const jwtMiddleware = require("../jwt").jwtMiddleware;


router.get("/status", async (req, res) => {
  const election = await Election.findOne().sort({ createdAt: -1 });
  return res.json(election);
});


router.post("/vote/:candidateId", jwtMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // ✅ correct user id
    const candidateId = req.params.candidateId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

  
    const election = await getActiveElection();

    if (!election) {
      return res.status(400).json({ message: "No active election" });
    }

    const now = new Date();
    if (now < election.startTime || now > election.endTime) {
      return res.status(400).json({ message: "Election is not live" });
    }

    
    const candidate = await Candidate.findOne({
      _id: candidateId,
      election: election._id,
      status: "Approved",
    });

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found in active election",
      });
    }

 
    if (candidate.position === "Head Boy" && user.votesCast?.headBoy) {
      return res.status(400).json({
        message: "Already voted for Head Boy",
      });
    }

    if (candidate.position === "Head Girl" && user.votesCast?.headGirl) {
      return res.status(400).json({
        message: "Already voted for Head Girl",
      });
    }

   
    candidate.voteCount += 1;
    await candidate.save();

    
    user.votesCast = user.votesCast || {};
    if (candidate.position === "Head Boy") user.votesCast.headBoy = true;
    if (candidate.position === "Head Girl") user.votesCast.headGirl = true;

    user.isVoted = user.votesCast.headBoy && user.votesCast.headGirl;

    await user.save();

    return res.json({
      success: true,
      message: `Vote cast successfully for ${candidate.position}`,
      fullyVoted: user.isVoted,
    });
  } catch (err) {
    console.error("Vote Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// router.get("/calculate-result", async (req, res) => {
//   try {
    
//     const election = await Election.findOne({
//       status: "COMPLETED",
//       resultsCalculated: false,
//     }).sort({ endTime: -1 });

//     console.log("Calculating results for election:", election);

//     if (!election) {
//       return res.status(400).json({
//         message: "No completed election pending result calculation",
//       });
//     }
//     if (election.resultsCalculated) {
//       return res.status(400).json({
//         message: "Results already calculated",
//       });
//     }

    
//     const candidates = await Candidate.find({
//       election: election._id,
//       status: "Approved",
//     }).lean();

//     if (!candidates.length) {
//       election.resultsCalculated = true; 
//       await election.save();

//       return res.status(400).json({
//         message: "Election completed but no candidates found",
//       });
//     }
//     const snapshot = (c, rank) => ({
//       candidateId: c._id,
//       name: c.name,
//       rollNumber: c.rollNumber,
//       class: c.class,
//       gender: c.gender,
//       position: c.position,
//       profilePhoto: c.profilePhoto,
//       partySymbol: c.partysymbol,
//       campaignVideo: c.campaignVideo,
//       achievements: c.achievements,
//       initiatives: c.initiatives,
//       votes: c.voteCount,
//       rank, 
//     });

  
//     const headBoys = candidates.filter((c) => c.position === "Head Boy");
//     const headGirls = candidates.filter((c) => c.position === "Head Girl");

    
//     headBoys.sort((a, b) => b.voteCount - a.voteCount);
//     headGirls.sort((a, b) => b.voteCount - a.voteCount);


//     const headBoyResults = headBoys.map((c, index) => snapshot(c, index + 1));

//     const headGirlResults = headGirls.map((c, index) => snapshot(c, index + 1));

    
//     const overallResults = [...candidates]
//       .sort((a, b) => b.voteCount - a.voteCount)
//       .map((c, index) => ({
//         candidateId: c._id,
//         name: c.name,
//         position: c.position,
//         votes: c.voteCount,
//         rank: index + 1,
//       }));

  
//     const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

   
//     election.finalResults = {
//       totalVotes,
//       headBoyResults,
//       headGirlResults,
//       overallResults,
//     };

//     election.resultsCalculated = true;
//     await election.save();

//     return res.json({
//       success: true,
//       message: "Election results calculated successfully",
//       finalResults: election.finalResults,
//     });
//   } catch (err) {
//     console.error("Calculate Result Error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

router.get("/calculate-result", async (req, res) => {
  const election = await Election.findOne({
    status: "COMPLETED",
    resultsCalculated: false,
  }).sort({ endTime: -1 });

  if (!election) {
    return res.status(400).json({ message: "No pending election" });
  }

  const result = await calculateElectionResult(election._id);
  return res.json({ success: true, finalResults: result.finalResults });
});



router.get("/history", async (req, res) => {
  try {
    const elections = await Election.find({
      status: "COMPLETED",
      resultsCalculated: true,
      "finalResults.totalVotes": { $exists: true },
    }).sort({ endedAt: -1 });

    return res.json(elections);
  } catch (err) {
    console.error("History Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
