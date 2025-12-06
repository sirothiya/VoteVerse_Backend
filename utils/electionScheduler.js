const cron = require("node-cron");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

cron.schedule("* * * * *", async () => {
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.electionSetup) return;

    const { electionStart, electionEnd } = admin.electionSetup;

    const current = new Date();

    // --- AUTO START ---
    if (current >= electionStart && current < electionEnd) {
      let election = await Election.findOne({ isActive: true });
      if (!election) {
        await Election.create({
          isActive: true,
          startTime: electionStart,
          endTime: electionEnd,
        });

        console.log("Election Started Automatically ✔");
      }
    }

    // --- AUTO END ---
    if (current >= electionEnd) {
      const election = await Election.findOne({ isActive: true });
      if (election) {
        election.isActive = false;

        // Calculate results
        const candidates = await Candidate.find().sort({ voteCount: -1 });
        election.result = candidates.map((c) => ({
          candidate: c._id,
          votes: c.voteCount,
        }));

        await election.save();
        console.log("Election Ended Automatically ✔");
      }
    }
  } catch (error) {
    console.log("Error in scheduler:", error);
  }
});
