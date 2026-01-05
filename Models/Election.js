const mongoose = require("mongoose");


// const electionSchema = new mongoose.Schema({
//   isActive: { type: Boolean, default: false },
//   startTime: Date,
//   endTime: Date,

//   finalResults: {
//     totalVotes: Number,
//     headBoyResults: [
//       {
//         candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
//          votes: Number,

//       },
//     ],
//     headGirlResults: [
//       {
//         candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
//         votes: Number,
//       },
//     ],
//     overallResults: [
//       {
//         candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
//         votes: Number,
//       },
//     ],  
//   },
//    status: {
//     type: String,
//     enum: ["ONGOING", "COMPLETED"],
//     default: "ONGOING",
//   },
  
// });

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

  electionSession: {
    type: String, 
    required: true,
  },

  status: {
    type: String,
    enum: ["ONGOING", "COMPLETED"],
    default: "ONGOING",
  },

  finalResults: {
    totalVotes: Number,

    headBoyResults: [
      {
        candidateId: mongoose.Schema.Types.ObjectId,
        name: String,
        admissionNo: String,
        class: String,
        section: String,
        photo: String,
        position: String,
        votes: Number,
      },
    ],

    headGirlResults: [
      {
        candidateId: mongoose.Schema.Types.ObjectId,
        name: String,
        admissionNo: String,
        class: String,
        section: String,
        photo: String,
        photo: String,
        position: String,
        votes: Number,
      },
    ],

    overallResults: [
      {
        candidateId: mongoose.Schema.Types.ObjectId,
        name: String,
        position: String,
        votes: Number,
      },
    ],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

electionSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: "ONGOING" } }
);


const Election = mongoose.model("Election", electionSchema);
module.exports = Election;
