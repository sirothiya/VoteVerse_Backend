// const cron = require("node-cron");
// const mongoose = require("mongoose");
// const Admin = require("../Models/Admin");
// const Election = require("../Models/Election");

// console.log("🚀 Election status cron running | PID:", process.pid);

// cron.schedule("* * * * *", async () => {
//   const session = await mongoose.startSession();

//   try {
//     const now = new Date();
//     session.startTransaction();

//     const admin = await Admin.findOne().session(session);
//     if (!admin?.electionSetup?.electionEnd) {
//       await session.abortTransaction();
//       return;
//     }

//     if (now < new Date(admin.electionSetup.electionEnd)) {
//       await session.abortTransaction();
//       return;
//     }

    
//     const election = await Election.findOneAndUpdate(
//       {
//         status: "ONGOING",
//         endTime: { $exists: true, $lte: now },
//       },
//       {
//         $set: {
//           status: "COMPLETED",
//           isActive: false,
//           endedAt: now,
//           resultsCalculated:false
//         },
//       },
//       { new: true, session }
//     );

//     if (!election || election.resultsCalculated === true) {
//       await session.abortTransaction();
//       return;
//     }

  
//     await Admin.updateOne(
//       { _id: admin._id },
//       {
//         $set: {
//           "electionSetup.electionStart": null,
//           "electionSetup.electionEnd": null,
//           "electionSetup.electionDurationHours": null,
//           "electionSetup.candidateRegStart": null,
//           "electionSetup.candidateRegEnd": null,
//           "electionSetup.announcementMessage": [
//             "Election completed successfully. Results are now available.",
//           ],
//         },
//       },
//       { session }
//     );

//     await session.commitTransaction();
//     console.log("✅ Election marked COMPLETED");
    


//   } catch (err) {
//     await session.abortTransaction();
//     console.error("❌ Election cron failed:", err);
//   } finally {
//     session.endSession();
//   }
// });

// module.exports = {};


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

    // 1️⃣ Mark election completed
    election.status = "COMPLETED";
    election.isActive = false;
    election.endedAt = now;
    election.resultsCalculated = false;

    await election.save({ session });

    // 2️⃣ IMMEDIATELY calculate results 🔥
    await calculateElectionResult(election._id, session);

    // 3️⃣ Reset admin election setup
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
