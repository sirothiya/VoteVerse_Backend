const express = require("express");
const router = express.Router();
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");
const User = require("../Models/User");
const jwtMiddleware = require("../jwt").jwtMiddleware;

// GET /api/election/status
router.get("/status", async (req, res) => {
  const election = await Election.findOne();
  return res.json(election);
});

router.post("/vote/:candidateId", jwtMiddleware, async (req, res) => {
  try {
    const userId = req.adminId;
    const candidateId = req.params.candidateId;

    console.log("User ID:", userId, "Candidate ID:", candidateId);

    // ----------------------------------------
    // 1. Validate User
    // ----------------------------------------
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVoted) {
      return res.status(400).json({ message: "You have already voted" });
    }

    // ----------------------------------------
    // 2. Validate Election
    // ----------------------------------------
    const election = await Election.findOne();
    if (!election)
      return res.status(404).json({ message: "Election not found" });

    const now = new Date();
    if (
  !election.startTime ||
  !election.endTime ||
  now < election.startTime ||
  now > election.endTime
) {
  return res.status(400).json({ message: "Election is not active" });
}


    // ----------------------------------------
    // 3. Validate Candidate
    // ----------------------------------------
    const candidate = await Candidate.findById(candidateId);
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });

    // ----------------------------------------
    // 4. Update Candidate Votes
    // ----------------------------------------
    candidate.voteCount += 1;

    candidate.votes.push({
      user: userId,
      votedAt: new Date(),
    });

    await candidate.save();

    // ----------------------------------------
    // 5. Update Election Results
    // ----------------------------------------
    const existingEntry = election.result.find(
      (entry) => entry.candidate.toString() === candidateId
    );

    if (existingEntry) {
      existingEntry.votes += 1;
    } else {
      election.result.push({
        candidate: candidateId,
        votes: 1,
      });
    }

    await election.save();

    // ----------------------------------------
    // 6. Mark User as Voted
    // ----------------------------------------
    user.isVoted = true;
    await user.save();

    // ----------------------------------------
    // 7. Response
    // ----------------------------------------
    return res.json({
      success: true,
      message: "Vote cast successfully",
      votedTo: candidate.name,
    });
  } catch (err) {
    console.error("Vote Error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

router.get("/vote/count", async (req, res) => {
  try {
    const election = await Election.findOne()
      .populate({
        path: "finalResults.headBoyResults.candidate",
        select:
          "name rollNumber class position partysymbol profilePhoto",
      })
      .populate({
        path: "finalResults.headGirlResults.candidate",
        select:
          "name rollNumber class position partysymbol profilePhoto",
      })
      .populate({
        path: "finalResults.overallResults.candidate",
        select:
          "name rollNumber class position partysymbol profilePhoto",
      })
      .lean();

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const formatResults = (results = []) =>
      results
        .map((entry) => ({
          candidateId: entry.candidate?._id,
          name: entry.candidate?.name,
          rollNumber: entry.candidate?.rollNumber,
          class: entry.candidate?.class,
          position: entry.candidate?.position,
          partysymbol: entry.candidate?.partysymbol,
          profilePhoto: entry.candidate?.profilePhoto,
          votes: entry.votes || 0,
        }))
        .sort((a, b) => b.votes - a.votes);

    const headBoyResults = formatResults(
      election.finalResults?.headBoyResults
    );

    const headGirlResults = formatResults(
      election.finalResults?.headGirlResults
    );

    const overallResults = formatResults(
      election.finalResults?.overallResults
    );

    return res.json({
      success: true,
      status: election.finalResults?.status || "ONGOING",
      headBoyResults,
      headGirlResults,
      overallResults,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});


router.get("/history", async (req, res) => {
  const elections = await Election.find({ status: "COMPLETED" })
    .sort({ createdAt: -1 })
    .lean();

 return res.json(elections);
});


module.exports = router;