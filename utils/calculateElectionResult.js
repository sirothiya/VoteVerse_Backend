const Election = require("../Models/Election");
const Candidate = require("../Models/Candidate");

async function calculateElectionResult(electionId, session = null) {
  const election = await Election.findOne({
    _id: electionId,
    status: "COMPLETED",
    resultsCalculated: false,
  }).session(session);

  if (!election) return null;

  const candidates = await Candidate.find({
    election: election._id,
    status: "Approved",
  }).session(session);

  if (!candidates.length) {
    election.resultsCalculated = true;
    await election.save({ session });
    return election;
  }

  const snapshot = (c, rank) => ({
    candidateId: c._id,
    name: c.name,
    rollNumber: c.rollNumber,
    class: c.class,
    gender: c.gender,
    position: c.position,
    profilePhoto: c.profilePhoto,
    partySymbol: c.partysymbol,
    votes: c.voteCount,
    rank,
  });

  const headBoys = candidates
    .filter((c) => c.position === "Head Boy")
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((c, i) => snapshot(c, i + 1));

  const headGirls = candidates
    .filter((c) => c.position === "Head Girl")
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((c, i) => snapshot(c, i + 1));

  const overallResults = [...candidates]
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((c, i) => ({
      candidateId: c._id,
      name: c.name,
      position: c.position,
      votes: c.voteCount,
      rank: i + 1,
    }));

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

  election.finalResults = {
    totalVotes,
    headBoyResults: headBoys,
    headGirlResults: headGirls,
    overallResults,
  };

  election.resultsCalculated = true;
  await election.save({ session });

  return election;
}

module.exports = calculateElectionResult;
