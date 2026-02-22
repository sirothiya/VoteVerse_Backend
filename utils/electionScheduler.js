const cron = require("node-cron");
const mongoose = require("mongoose");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const calculateElectionResult = require("../utils/calculateElectionResult");

console.log("🚀 Election status cron running | PID:", process.pid);

cron.schedule("* * * * *", async () => {
  const session = await mongoose.startSession();

  try {
    const now = new Date();
    session.startTransaction();

    const election = await Election.findOne({
      status: "ONGOING",
      endTime: { $lte: now },
    }).session(session);

    if (!election) {
      await session.abortTransaction();
      return;
    }

 
    election.status = "COMPLETED";
    election.isActive = false;
    election.endedAt = now;
    election.resultsCalculated = false;

    await election.save({ session });

    await calculateElectionResult(election._id, session);


    await Admin.updateOne(
      {},
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
    console.log("✅ Election ended & results calculated");

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Election cron failed:", err);
  } finally {
    session.endSession();
  }
});

module.exports = {};
