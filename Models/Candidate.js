const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const candidateSchema = new mongoose.Schema({
  // 🔗 CRITICAL: Link candidate to ONE election
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true,
  },

  rollNumber: {
    type: String,
    required: true,
  },

  class: {
    type: String,
    required: true,
  },

  dob: {
    type: Date,
    required: true,
  },

  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },

  // 🔐 Auth
  password: {
    type: String,
    required: true,
  },

  // 🗳 Election-Specific
  position: {
    type: String,
    enum: ["Head Boy", "Head Girl"],
    required: true,
  },

  manifesto: {
  pdfPath: String,
  originalPdfName: String,
  extractedText: String,
  summary:String, 
},

  campaignVideo: String,
  achievements: [String],
  initiatives: [String],
  profilePhoto: String,
  partysymbol: String,
  campaignAudio:String,
campaignVideoTranscript: String,
campaignVideoSummary: String,
campaignVideoSentiment: String,

  // 📄 Verification
  parentalConsent: String,
  declarationSigned: {
    type: Boolean,
    default: false,
  },

  profilecompleted: {
    type: Boolean,
    default: false,
  },

  // 🛂 Admin Control
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },

  // 🧮 Votes
  voteCount: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * 🔒 One candidate per position per election per roll number
 */
candidateSchema.index(
  { election: 1, rollNumber: 1 },
  { unique: true }
);

/**
 * 🔐 Hash password before saving
 */
candidateSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

candidateSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Candidate", candidateSchema);
