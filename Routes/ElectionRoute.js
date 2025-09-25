const express = require("express");
const router = express.Router();
const Election = require("../Models/Election");

router.post("/start", async (req, res) => {
  try {
    const { endTime ,startTime} = req.body;
    // const startTime = new Date();

    const election = await Election.findOneAndUpdate(
      {}, // or specific election if multiple
      {
        isActive: true,
        startTime,
        endTime,
      },
      { upsert: true, new: true }
    );

    return res.json(election);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/election/status
router.get("/status", async (req, res) => {
  const election = await Election.findOne().populate("result.candidate");
  if (!election) return res.json({ isActive: false });

  // Auto deactivate if time passed
  if (election.isActive && new Date() > election.endTime) {
    election.isActive = false;
    await election.save();
  }

  return res.json(election);
});

router.post("/vote", async (req, res) => {
  const { candidateId } = req.body;

  // Check if election active
  const election = await Election.findOne();
  if (!election || !election.isActive || new Date() > election.endTime) {
    return res.status(400).json({ message: "Election is not active or ended" });
  }

  // increment votes
  const resultEntry = election.result.find(
    (r) => r.candidate.toString() === candidateId
  );
  if (resultEntry) {
    resultEntry.votes++;
  } else {
    election.result.push({ candidate: candidateId, votes: 1 });
  }

  await election.save();
  res.json({ message: "Vote casted" });
});

module.exports = router;
