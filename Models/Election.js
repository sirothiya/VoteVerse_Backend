const mongoose = require("mongoose");

// 

const electionSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date,

  // Final stored result after calculateResult()
  finalResults: {
    headBoyResults: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        votes: Number,
      },
    ],
    headGirlResults: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        votes: Number,
      },
    ],
    overallResults: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        votes: Number,
      },
    ],  
  },
   status: {
    type: String,
    enum: ["ONGOING", "COMPLETED", "RESET"],
    default: "ONGOING",
  },
  
});

// 🧮 Pre-save hook to auto-calculate endTime based on startTime + duration
electionSchema.pre("save", function (next) {
  if (this.startTime && this.electionDuration) {
    const start = new Date(this.startTime);
    const end = new Date(
      start.getTime() + this.electionDuration * 60 * 60 * 1000
    );
    this.endTime = end;
  }
  next();
});

const Election = mongoose.model("Election", electionSchema);
module.exports = Election;
