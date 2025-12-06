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
  const election = await Election.findOne();
  return res.json(election);
});


router.post('/stop/:id', async (req,res)=>{
  try{
    const _id=req.params.id;
    const election=await Election.updateOne({_id},{isActive:false});
    return res.json(election);

  }catch(err){
    console.error(err);
    res.status(500).json({message:'Error stopping election'});
  };
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



