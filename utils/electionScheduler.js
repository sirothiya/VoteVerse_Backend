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

    // Find active election
    // const election = await Election.findOne({ isActive: true });
    // if (!election) return;

    const election = await Election.findOne().sort({ createdAt: -1 });
    if (!election || election.resultsDeclared) return;

    if (election.resultsDeclared) return;

    if (now >= new Date(electionEnd)) {
      console.log("🛑 Election ended. Calculating results...");

      // Fetch candidates
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

      // Save results permanently
      console.log("💾 Saving election results...");
      election.result = finalResults;
      election.isActive = false;
      election.resultsDeclared = true;
      election.endedAt = now;

      await election.save();

      const admin = await Admin.findOne();
      console.log("🎉 Election results:", admin);
      admin.electionSetup.electionEnd = null;
      admin.electionSetup.electionStart = null;
      admin.electionSetup.electionDurationHours = null;
      admin.electionSetup.candidateRegStart = null;
      admin.electionSetup.candidateRegEnd = null;
      admin.electionSetup.announcementMessage = [
        "Election completed. Please check results.",
      ];
      await admin.save();

      console.log("🏆 Election results saved successfully");
    }
  } catch (err) {
    console.error("❌ Election Cron Error:", err.message);
  }
});

module.exports = {};
