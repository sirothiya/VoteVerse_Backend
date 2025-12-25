const cron = require("node-cron");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

cron.schedule("* * * * *", async () => {
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.electionSetup) return;

    const { electionStart, electionEnd } = admin.electionSetup;
    if (!electionStart || !electionEnd) return;

    const now = new Date();

    const election = await Election.findOne().sort({ createdAt: -1 });
    if (!election || election.resultsDeclared) return;

    if (election.resultsDeclared) return;

    if (now >= new Date(electionEnd)) {
      console.log("🛑 Election ended. Calculating results...");

      const candidates = await Candidate.find();

      console.log(`🔍 Found ${candidates.length} candidates.`);

      const groupedResults = {};

      for (const c of candidates) {
        if (!groupedResults[c.position]) {
          groupedResults[c.position] = [];
        }

        groupedResults[c.position].push({
          candidateId: c._id,
          name: c.name,
          votes: c.votes,
        });
      }
      // Sort winners
      const finalResults = [];

      for (const position in groupedResults) {
        const sorted = groupedResults[position].sort(
          (a, b) => b.votes - a.votes
        );

        finalResults.push({
          position,
          candidates: sorted,
          winner: sorted[0] || null,
        });
      }

      console.log("💾 Saving election results...");
      const updatedElection = await Election.findOneAndUpdate(
        {
          _id: election._id,
          resultsDeclared: false, // prevents race condition
        },
        {
          $set: {
            result: finalResults,
            isActive: false,
            resultsDeclared: true,
            endedAt: now,
          },
        },
        { new: true }
      );

      if (!updatedElection) {
        console.log("⚠️ Election already processed by another cron run");
        return;
      }
      console.log("🎉 Election results:", admin);
      admin.electionSetup = {
        electionStart: null,
        electionEnd: null,
        electionDurationHours: null,
        candidateRegStart: null,
        candidateRegEnd: null,
        announcementMessage: ["Election completed. Please check results."],
      };

      await admin.save();

      console.log("🏆 Election results saved successfully");
    }
  } catch (err) {
    console.error("❌ Election Cron Error:", err.message);
  }
});

module.exports = {};
