// const express = require("express");
// const router = express.Router();
// const Election = require("../Models/Election");

// router.post("/start", async (req, res) => {
//   try {
//     const { endTime ,startTime} = req.body;
//     // const startTime = new Date();

//     const election = await Election.findOneAndUpdate(
//       {}, // or specific election if multiple
//       {
//         isActive: true,
//         startTime,
//         endTime,
//       },
//       { upsert: true, new: true }
//     );

//     return res.json(election);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

// // GET /api/election/status
// router.get("/status", async (req, res) => {
//   const election = await Election.findOne().populate("result.candidate");
//   if (!election) return res.json({ isActive: false });

//   // Auto deactivate if time passed
//   if (election.isActive && election.endTime && new Date() > election.endTime) {
//     election.isActive = false;
//     await election.save();
//   }

//   return res.json(election);
// });

// router.post("/changeStatus/:status",async (req,res)=>{
//   try{
//    const status=req.params.status;
//    const response =await Election.updateOne({isActive:status});
//    return res.status(200).json({message:"status changed successfully"});
//   }catch(err){
//     console.log(err);
//   }
// })

// router.post('/stop/:id', async (req,res)=>{
//   try{
//     const _id=req.params.id;
//     const election=await Election.updateOne({_id},{isActive:false});
//     return res.json(election);

//   }catch(err){
//     console.error(err);
//     res.status(500).json({message:'Error stopping election'});
//   };
// });




// router.post("/vote", async (req, res) => {
//   const { candidateId } = req.body;

//   // Check if election active
//   const election = await Election.findOne();
//   if (!election || !election.isActive || new Date() > election.endTime) {
//     return res.status(400).json({ message: "Election is not active or ended" });
//   }

//   // increment votes
//   const resultEntry = election.result.find(
//     (r) => r.candidate.toString() === candidateId
//   );
//   if (resultEntry) {
//     resultEntry.votes++;
//   } else {
//     election.result.push({ candidate: candidateId, votes: 1 });
//   }

//   await election.save();
//   res.json({ message: "Vote casted" });
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const Election = require("../Models/Election");
const { jwtMiddleware, generateToken } = require("../jwt");

// 🟢 Create or Setup Election
router.post("/setup", jwtMiddleware, async (req, res) => {
  try {
    const {
      announcement,
      regStart,
      regEnd,
      startTime,
      electionDuration, // in hours
    } = req.body;

    // Check for any currently active election
    const activeElection = await Election.findOne({ isActive: true });
    if (activeElection) {
      return res
        .status(400)
        .json({ message: "An election is already active. End it first." });
    }

    // Validate date order
    const regStartDate = new Date(regStart);
    const regEndDate = new Date(regEnd);
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + electionDuration * 60 * 60 * 1000);

    if (regEndDate < regStartDate) {
      return res.status(400).json({ message: "Registration end cannot be before start." });
    }

    if (startDate < regEndDate) {
      return res.status(400).json({
        message: "Election start should be after registration period ends.",
      });
    }

    // Create new election
    const election = new Election({
      announcement,
      regStart: regStartDate,
      regEnd: regEndDate,
      startTime: startDate,
      endTime: endDate, // computed
      isActive: false,
    });

    await election.save();
   return res.status(201).json({ message: "Election setup created.", election });
  } catch (err) {
    console.error("❌ Error creating election:", err);
    return res.status(500).json({ message: "Error creating election.", error: err.message });
  }
});

router.get("/all", async (req, res) => {
   try{
     const elections=await Election.find().populate('result.candidate');
     return res.status(200).json(elections);
   }catch(err){
     console.error("❌ Error fetching elections:", err);
     return res.status(500).json({ message: "Error fetching elections", error: err.message });
   }

})

// 🟢 Start Election
router.post("/start", jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    const election = await Election.findById(id);

    if (!election) return res.status(404).json({ message: "Election not found" });

    // Deactivate any other active election
    await Election.updateMany({ isActive: true }, { isActive: false });

    election.isActive = true;
    await election.save();

    res.json({ message: "Election started successfully", election });
  } catch (err) {
    console.error("❌ Error starting election:", err);
    res.status(500).json({ message: "Error starting election" });
  }
});

// 🔴 End Election
router.post("/end", jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    election.isActive = false;
    await election.save();

    res.json({ message: "Election ended successfully", election });
  } catch (err) {
    console.error("❌ Error ending election:", err);
    res.status(500).json({ message: "Error ending election" });
  }
});

// 🔍 Get Active Election
router.get("/active", jwtMiddleware, async (req, res) => {
  try {
    const election = await Election.findOne({ isActive: true }).populate(
      "result.candidate"
    );

    if (!election)
      return res.status(404).json({ message: "No active election found" });

    res.json(election);
  } catch (err) {
    console.error("❌ Error fetching active election:", err);
    res.status(500).json({ message: "Error fetching active election" });
  }
});

export default router;
