const mongoose = require("mongoose");

const resultSnapshotSchema = new mongoose.Schema(
  {
    candidateId: mongoose.Schema.Types.ObjectId,
    name: String,
    rollNumber: String,
    class: String,
    gender: String,
    position: String,
    profilePhoto: String,
    partySymbol: String,
    campaignVideo: String,
    achievements: [String],
    initiatives: [String],
    votes: Number,
    rank: Number,
  },
  { _id: false }
);

const electionSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
  },

  startTime: {
    type: Date,
    required: true,
  },

  endTime: {
    type: Date,
    required: true,
  },
  endedAt: {
    type: Date,
  },

  electionSession: {
    type: String, // e.g. "2025–2026"
    required: true,
  },

  status: {
    type: String,
    enum: ["ONGOING", "COMPLETED"],
    default: "ONGOING",
  },

  finalResults: {
    totalVotes: {
      type: Number,
    },

    headBoyResults: [resultSnapshotSchema],

    headGirlResults: [resultSnapshotSchema],

    overallResults: [
      {
        candidateId: mongoose.Schema.Types.ObjectId,
        name: String,
        position: String,
        votes: Number,
        rank: Number,
      },
    ],
  },

  resultsCalculated: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const Election = mongoose.model("Election", electionSchema);
module.exports = Election;
