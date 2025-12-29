const cron = require("node-cron");
const mongoose = require("mongoose");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

console.log("🚀 Election scheduler running | PID:", process.pid);

cron.schedule("* * * * *", async () => {
  const session = await mongoose.startSession();

  try {
    const now = new Date();

    session.startTransaction();

    /* ----------------------------------
       1️⃣ Load admin with election setup
    ---------------------------------- */
    const admin = await Admin.findOne().session(session);

    if (!admin?.electionSetup?.electionEnd) {
      await session.abortTransaction();
      return;
    }

    if (now < new Date(admin.electionSetup.electionEnd)) {
      await session.abortTransaction();
      return;
    }

    /* ----------------------------------
       2️⃣ Lock election (single winner)
    ---------------------------------- */
    const election = await Election.findOneAndUpdate(
      {
        resultsDeclared: false,
      },
      {
        $set: {
          resultsDeclared: true, // 🔐 LOCK
        },
      },
      {
        sort: { createdAt: -1 },
        new: true,
        session,
      }
    );

    if (!election) {
      await session.abortTransaction();
      return;
    }

    console.log("🛑 Election ended — calculating results");

    /* ----------------------------------
       3️⃣ Calculate results
    ---------------------------------- */
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

    /* ----------------------------------
       4️⃣ Save election results
    ---------------------------------- */
    election.result = finalResults;
    election.isActive = false;
    election.endedAt = now;

    await election.save({ session });

    /* ----------------------------------
       5️⃣ FORCE admin state (authoritative)
    ---------------------------------- */
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
            "Election completed successfully. Results are now available.",
          ],
        },
      },
      { session }
    );

    await session.commitTransaction();

    console.log("🏆 Election closed + announcement updated");
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Election scheduler failed:", err);
  } finally {
    session.endSession();
  }
});

module.exports = {};
