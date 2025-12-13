const Election = require("../Models/Election");

async function calculateFinalResults() {
  let election = await Election.findOne()
    .populate({
      path: "result.candidate",
      select: "name rollNumber class position partysymbol profilePhoto",
    });

  if (!election) return null;

  const formattedResults = election.result
    .map((entry) => ({
      candidate: entry.candidate._id,
      name: entry.candidate.name,
      rollNumber: entry.candidate.rollNumber,
      class: entry.candidate.class,
      position: entry.candidate.position,
      partysymbol: entry.candidate.partysymbol,
      profilePhoto: entry.candidate.profilePhoto,
      votes: entry.votes,
    }))
    .sort((a, b) => b.votes - a.votes);

  const headBoyResults = formattedResults.filter(
    (c) => c.position === "Head Boy"
  );
  const headGirlResults = formattedResults.filter(
    (c) => c.position === "Head Girl"
  );

  election.finalResults = {
    headBoyResults,
    headGirlResults,
    overallResults: formattedResults,
  };

  await election.save();
  return election.finalResults;
}

module.exports = calculateFinalResults;
