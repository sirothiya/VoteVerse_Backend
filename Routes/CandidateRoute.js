const express = require("express");

const router = express.Router();

const candidate = require("../Models/Candidate");
const User = require("../Models/User");
const { jwtMiddleware } = require("../jwt");

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

router.post("/addcandidate", jwtMiddleware, async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id)))
      return res.status(403).json({ message: "user is not an admin" });
    const data = req.body;
    const newCandidate = new candidate(data);
    const savedCandidate = await newCandidate.save();
    res.status(200).json(savedCandidate);
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", jwtMiddleware, async (req, res) => {
  try {
    console.log("User ID from token:", req.user.id);
    if (!(await checkAdmin(req.user.id)))
      return res.status(403).json({ message: "user is not an admin" });
    const candidates = await candidate.find();
    const data = candidates.map((c) => ({
      name: c.name,
      party: c.party,
      age: c.age,
      id: c._id,
    }));
    return res.status(200).json(data);
  } catch (err) {
    console.log("Error fetching candidates:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// router.get("/:id", async (req, res) => {
//   try {
//     if (checkAdmin(req.user.id))
//       return res.status(403).json({ message: "user is not an admin" });
//     const id = req.params.id;
//     const ummedwar = await candidate.findById(id);
//     if (!ummedwar) {
//       return res.status(404).json({ message: "Candidate not found" });
//     }
//     res.status(200).json(ummedwar);
//   } catch (err) {
//     console.log("Error fetching candidate by ID:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

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
    res.status(200).json({
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
    res.status(200).json({ message: "Candidate deleted successfully" });
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
    const candidates = await candidate.find().sort({ voteCount: 'desc' });
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
      votes
    }));

    return res.status(200).json({ voteRecord });
  } catch (err) {
    console.error("Error fetching vote count:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
