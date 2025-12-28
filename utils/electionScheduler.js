const cron = require("node-cron");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

// Startup log (helps detect multiple instances on Render)
console.log("🚀 Election cron service started | PID:", process.pid);

cron.schedule("* * * * *", async () => {
  const runId = `${process.pid}-${Date.now()}`;

  try {
    console.log(`⏱️ [${runId}] Cron tick started`);

    // 1️⃣ Fetch admin & election config
    const admin = await Admin.findOne().lean();
    if (!admin?.electionSetup) {
      console.log(`ℹ️ [${runId}] No election setup found`);
      return;
    }

    const { electionStart, electionEnd } = admin.electionSetup;
    if (!electionStart || !electionEnd) {
      console.log(`ℹ️ [${runId}] Election dates not configured`);
      return;
    }

    const now = new Date();
    if (now < new Date(electionEnd)) {
      // Election still running
      return;
    }

    // 2️⃣ Get latest election (not yet declared)
    const election = await Election.findOne({
      resultsDeclared: false,
    }).sort({ createdAt: -1 });

    if (!election) {
      console.log(`ℹ️ [${runId}] No pending election to process`);
      return;
    }

    console.log(`🛑 [${runId}] Election ended. Calculating results...`);

    // 3️⃣ Fetch candidates
    const candidates = await Candidate.find().lean();
    console.log(`🔍 [${runId}] Found ${candidates.length} candidates`);

    if (!candidates.length) {
      console.warn(`⚠️ [${runId}] No candidates found`);
      return;
    }

    // 4️⃣ Group & sort candidates by position
    const groupedResults = {};

    for (const c of candidates) {
      if (!groupedResults[c.position]) {
        groupedResults[c.position] = [];
      }

      groupedResults[c.position].push({
        candidateId: c._id,
        name: c.name,
        votes: c.votes || 0,
      });
    }

    const finalResults = Object.entries(groupedResults).map(
      ([position, list]) => {
        const sorted = list.sort((a, b) => b.votes - a.votes);
        return {
          position,
          candidates: sorted,
          winner: sorted[0] || null,
        };
      }
    );

    // 5️⃣ Atomic update (prevents race condition)
    const updatedElection = await Election.findOneAndUpdate(
      {
        _id: election._id,
        resultsDeclared: false, // 🔐 atomic lock
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
      console.log(
        `⚠️ [${runId}] Election already processed by another instance`
      );
      return;
    }

    console.log(`🎉 [${runId}] Election results saved successfully`);

    // 6️⃣ Reset admin election config
    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          "electionSetup.electionStart": null,
          "electionSetup.electionEnd": null,
          "electionSetup.electionDurationHours": null,
          "electionSetup.candidateRegStart": null,
          "electionSetup.candidateRegEnd": null,
          "electionSetup.announcementMessage": [
            "Election completed. Please check results.",
          ],
        },
      }
    );

    console.log(`🏆 [${runId}] Admin election setup reset`);
  } catch (err) {
    console.error(`❌ [${runId}] Election cron error:`, err);
  }
});

module.exports = {};
