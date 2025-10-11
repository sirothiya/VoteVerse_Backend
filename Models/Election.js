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
    // --- Active Flag ---
    isActive: {
      type: Boolean,
      default: false,
    },

    // --- Announcement ---
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
    },
    electionDuration: {
      type: Number, // in hours
      required: true,
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

// 🧮 Pre-save hook to auto-calculate endTime based on startTime + duration
electionSchema.pre("save", function (next) {
  if (this.startTime && this.electionDuration) {
    const start = new Date(this.startTime);
    const end = new Date(start.getTime() + this.electionDuration * 60 * 60 * 1000);
    this.endTime = end;
  }
  next();
});

const Election = mongoose.model("Election", electionSchema);
module.exports = Election;
