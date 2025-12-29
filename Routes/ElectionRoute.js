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

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVoted) {
      return res.status(400).json({ message: "You have already voted" });
    }
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

    const candidate = await Candidate.findById(candidateId);
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });
    candidate.voteCount += 1;

    candidate.votes.push({
      user: userId,
      votedAt: new Date(),
    });

    await candidate.save();
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

    user.isVoted = true;
    await user.save();
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
    const election = await Election.findOne().lean();
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // 🟢 ELECTION STILL RUNNING → calculate from candidates
    if (election.finalResults?.status !== "COMPLETED") {
      const candidates = await Candidate.find({ status: "Approved" }).lean();

      const formatted = candidates
        .map((c) => ({
          candidateId: c._id,
          name: c.name,
          rollNumber: c.rollNumber,
          class: c.class,
          position: c.position,
          partysymbol: c.partysymbol,
          profilePhoto: c.profilePhoto,
          votes: c.voteCount || 0,
        }))
        .sort((a, b) => b.votes - a.votes);

      return res.json({
        success: true,
        status: "ONGOING",
        headBoyResults: formatted.filter((c) => c.position === "Head Boy"),
        headGirlResults: formatted.filter((c) => c.position === "Head Girl"),
        overallResults: formatted,
      });
    }

    // 🔵 ELECTION COMPLETED → use finalResults
    const formatResults = (results = []) =>
      results
        .filter((e) => e.candidate)
        .map((e) => ({
          candidateId: e.candidate._id,
          name: e.candidate.name,
          rollNumber: e.candidate.rollNumber,
          class: e.candidate.class,
          position: e.candidate.position,
          partysymbol: e.candidate.partysymbol,
          profilePhoto: e.candidate.profilePhoto,
          votes: e.votes,
        }));

    const populatedElection = await Election.findOne()
      .populate("finalResults.headBoyResults.candidate")
      .populate("finalResults.headGirlResults.candidate")
      .populate("finalResults.overallResults.candidate")
      .lean();

    return res.json({
      success: true,
      status: "COMPLETED",
      headBoyResults: formatResults(populatedElection.finalResults.headBoyResults),
      headGirlResults: formatResults(populatedElection.finalResults.headGirlResults),
      overallResults: formatResults(populatedElection.finalResults.overallResults),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});



router.get("/history", async (req, res) => {
  const elections = await Election.find({ status: "COMPLETED" })
    .sort({ createdAt: -1 })
    .lean();

 return res.json(elections);
});


module.exports = router;