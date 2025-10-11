// const mongoose=require('mongoose')

// const electionSchema= new mongoose.Schema({
//     isActive: {
//     type: Boolean,
//     default: false
//     },
//   startTime: {
//     type: Date,
//     required: true
//   },
//   endTime: {
//     type: Date,
//     required: true
//   },
//   result:[
//     {
//         candidate:{
//             type:mongoose.Schema.Types.ObjectId,
//             ref:'Candidate',
//             required:true
//         },
//         votes:{
//             type:Number,
//             default:0
//         }
//     }
//   ]
// })

// const Election=mongoose.model('Election',electionSchema)
// module.exports=Election;

const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema(
  {
    // --- Election Active Flag ---
    isActive: {
      type: Boolean,
      default: false,
    },

    // --- Admin Announcement ---
    announcement: {
      type: String,
      required: true,
      trim: true,
    },

    // --- Registration Phase ---
    regStart: {
      type: Date,
      required: true,
    },
    regEnd: {
      type: Date,
      required: true,
    },

    // --- Election Timing ---
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    electionDuration: {
      type: Number, // hours (auto-calculated)
    },

    // --- Results ---
    result: [
      {
        candidate: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Candidate",
          required: true,
        },
        votes: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

// 🔹 Pre-save middleware to calculate duration automatically
electionSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const start = new Date(this.startTime);
    const end = new Date(this.endTime);

    // Calculate duration in hours (with decimals if needed)
    const durationMs = end - start;
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours <= 0) {
      return next(new Error("End time must be after start time."));
    }

    // Prevent negative duration
    this.electionDuration = durationHours > 0 ? durationHours : 0;
  }
  next();
});

const Election = mongoose.model("Election", electionSchema);
module.exports = Election;
