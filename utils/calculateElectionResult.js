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
    election.finalResults = {
      totalVotes: 0,
      headBoyResults: [],
      headGirlResults: [],
      overallResults: [],
    };
    await election.save({ session });
    return election;
  }

  // 🔥 ENHANCED SNAPSHOT: Store all visible candidate data
  const snapshot = (c, rank) => ({
    // Basic Info
    candidateId: c._id,
    name: c.name,
    rollNumber: c.rollNumber,
    class: c.class,
    gender: c.gender,
    position: c.position,
    status: c.status,

    // Media & Photos
    profilePhoto: c.profilePhoto,
    partySymbol: c.partysymbol,
    campaignVideo: c.campaignVideo,
    campaignAudio: c.campaignAudio,

    // Election Results
    votes: c.voteCount,
    rank,

    // Campaign Materials
    manifesto: {
      pdfPath: c.manifesto?.pdfPath,
      originalPdfName: c.manifesto?.originalPdfName,
      extractedText: c.manifesto?.extractedText,
      summary: c.manifesto?.summary,
    },

    // Video Analysis
    campaignVideoTranscript: c.campaignVideoTranscript,
    campaignVideoSummary: c.campaignVideoSummary,
    campaignVideoSentiment: c.campaignVideoSentiment,

    // Profile Achievements
    achievements: c.achievements || [],
    initiatives: c.initiatives || [],
    profileCompleted: c.profilecompleted,

    // Verification Status
    parentalConsent: c.parentalConsent,
    declarationSigned: c.declarationSigned,

    // Metadata
    createdAt: c.createdAt,
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
      rollNumber: c.rollNumber,
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
