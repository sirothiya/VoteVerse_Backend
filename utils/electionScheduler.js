const cron = require("node-cron");
const Admin = require("../Models/Admin");
const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");
const calculateFinalResults = require("./calculateFinalResults");

cron.schedule("* * * * *", async () => {
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.electionSetup) return;

    const { candidateRegStart, candidateRegEnd, electionStart, electionEnd } =
      admin.electionSetup;

    const now = new Date();
    console.log ("election end time:", electionEnd);

    // — REGISTRATION WINDOW —
    if (candidateRegStart && now >= candidateRegStart && now < candidateRegEnd) {
      console.log("Candidate Registration Active");
    }

    // — AUTO START ELECTION —
    if (electionStart && now >= electionStart && now < electionEnd) {
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

    // — AUTO END ELECTION —
    if (electionEnd && now >= electionEnd) {
      let election = await Election.findOne({ isActive: true });

      if (election) {
        election.isActive = false;
        await election.save();

        const finalResults =await calculateFinalResults();

        // Reset setup so next election can be created
        admin.electionSetup = {
          announcementMessage: admin.electionSetup.announcementMessage,
          candidateRegStart: null,
          candidateRegEnd: null,
          electionStart: null,
          electionDurationHours: null,
          electionEnd: null,
        };

        admin.electionLocked = false; // Unlock for next election
        await admin.save();

        console.log("Election Ended Automatically ✔");
      }
    }
  } catch (err) {
    console.log("Scheduler error:", err);
  }
});
