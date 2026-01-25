const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

async function buildElectionContext() {
  const election = await Election.findOne({ isActive: true }).lean();
  if (!election) return null;

  const candidates = await Candidate.find({
    election: election._id,
    status: "Approved",
  }).lean();

  const headBoys = candidates.filter(c => c.position === "Head Boy");
  const headGirls = candidates.filter(c => c.position === "Head Girl");

  return {
    electionSession: election.electionSession,
    status: election.status,
    startTime: election.startTime,
    endTime: election.endTime,
    isActive: election.isActive,

    candidates: {
      headBoy: headBoys.map(c => ({
        name: c.name,
        rollNumber: c.rollNumber,
        class: c.class,
        achievements: c.achievements,
        initiatives: c.initiatives,
      })),
      headGirl: headGirls.map(c => ({
        name: c.name,
        rollNumber: c.rollNumber,
        class: c.class,
        achievements: c.achievements,
        initiatives: c.initiatives,
      })),
    },

    resultsAvailable: election.resultsCalculated,
    totalVotes: election.finalResults?.totalVotes || 0,
  };
}

module.exports = buildElectionContext;
