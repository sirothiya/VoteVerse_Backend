const cron = require("node-cron");
const mongoose = require("mongoose");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

console.log("🚀 Election cron started | PID:", process.pid);

cron.schedule("* * * * *", async () => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const admin = await Admin.findOne().session(session);
    if (!admin?.electionSetup?.electionEnd) {
      await session.abortTransaction();
      return;
    }

    const now = new Date();
    if (now < new Date(admin.electionSetup.electionEnd)) {
      await session.abortTransaction();
      return;
    }

    const election = await Election.findOne({
      resultsDeclared: false,
    })
      .sort({ createdAt: -1 })
      .session(session);

    if (!election) {
      await session.abortTransaction();
      return;
    }

    console.log("🛑 Election ended. Calculating results...");

    const candidates = await Candidate.find().session(session);

    const grouped = {};
    for (const c of candidates) {
      if (!grouped[c.position]) grouped[c.position] = [];
      grouped[c.position].push({
        candidateId: c._id,
        name: c.name,
        votes: c.votes || 0,
      });
    }

    const finalResults = Object.entries(grouped).map(
      ([position, list]) => {
        const sorted = list.sort((a, b) => b.votes - a.votes);
        return {
          position,
          candidates: sorted,
          winner: sorted[0] || null,
        };
      }
    );

    // 🔐 Election update
    election.result = finalResults;
    election.resultsDeclared = true;
    election.isActive = false;
    election.endedAt = now;
    await election.save({ session });

    // 🔐 Admin update (SAME TRANSACTION)
    admin.electionSetup = {
      electionStart: null,
      electionEnd: null,
      electionDurationHours: null,
      candidateRegStart: null,
      candidateRegEnd: null,
      announcementMessage: [
        "Election completed. Please check results.",
      ],
    };
    await admin.save({ session });

    await session.commitTransaction();

    console.log("🎉 Election + Announcement updated atomically");
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Cron error:", err);
  } finally {
    session.endSession();
  }
});

module.exports = {};
