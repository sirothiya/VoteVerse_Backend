const express = require("express");
const router = express.Router();
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");
const User = require("../Models/User");
const jwtMiddleware = require("../jwt").jwtMiddleware;

// GET /api/election/status
router.get("/status", async (req, res) => {
  const election = await Election.findOne().sort({ createdAt: -1 });
  return res.json(election);
});

router.post("/vote/:candidateId", jwtMiddleware, async (req, res) => {
  try {
    const userId = req.adminId;
    const candidateId = req.params.candidateId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const election = await Election.findOne();
    if (!election || election.status !== "ONGOING") {
      return res.status(400).json({ message: "Election not active" });
    }

    const now = new Date();
    if (now < election.startTime || now > election.endTime) {
      return res.status(400).json({ message: "Election is not active" });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // 🔥 CORE LOGIC
    if (candidate.position === "Head Boy" && user.votesCast.headBoy) {
      return res.status(400).json({ message: "Already voted for Head Boy" });
    }

    if (candidate.position === "Head Girl" && user.votesCast.headGirl) {
      return res.status(400).json({ message: "Already voted for Head Girl" });
    }

    // Record vote
    candidate.voteCount += 1;
    candidate.votes.push({
      user: userId,
      votedAt: new Date(),
    });
    await candidate.save();

    // Update user's vote status per category
    if (candidate.position === "Head Boy") {
      user.votesCast.headBoy = true;
    }

    if (candidate.position === "Head Girl") {
      user.votesCast.headGirl = true;
    }

    // ✅ Mark fully voted ONLY when both done
    if (user.votesCast.headBoy && user.votesCast.headGirl) {
      user.isVoted = true;
    }

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

router.get("/calculate-result", async (req, res) => {
  const election = await Election.findOne({ status: "COMPLETED" }).sort({
    createdAt: -1,
  });

  if (!election) {
    return res.status(400).json({ message: "Election not yet completed" });
  }

  if (
    election.finalResults?.headBoyResults?.length ||
    election.finalResults?.headGirlResults?.length
  ) {
    return res.status(400).json({ message: "Results already calculated" });
  }

  const candidates = await Candidate.find({ status: "Approved" }).lean();

  const mapResults = (position) =>
    candidates
      .filter((c) => c.position === position)
      .map((c) => ({
        candidate: c._id,
        name: c.name,
        votes: c.voteCount,
      }))
      .sort((a, b) => b.votes - a.votes);

  const mapOverallResults = () =>
    candidates
      .map((c) => ({ candidate: c._id, name: c.name, votes: c.voteCount }))
      .sort((a, b) => b.votes - a.votes);

  totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

  election.finalResults = {
    totalVotes: totalVotes,
    headBoyResults: mapResults("Head Boy"),
    headGirlResults: mapResults("Head Girl"),
    overallResults: mapOverallResults(),
  };

  await election.save();
  return res.json({ success: true, election: election.finalResults });
});

router.get("/history", async (req, res) => {
  const elections = await Election.find({
    status: "COMPLETED",
  })
    .sort({ endedAt: -1 })
    .populate("finalResults.headBoyResults.candidate")
    .populate("finalResults.headGirlResults.candidate")
    .populate("finalResults.overallResults.candidate");

  console.log("Election History:", elections);

  console.log(
    "Election History:",
    elections.map((e) => ({
      startTime: e.startTime,
      endTime: e.endTime,
      finalResults: e.finalResults,
    }))
  );

  return res.json(elections);
});

module.exports = router;
