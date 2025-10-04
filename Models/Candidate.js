const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  class: {
    type: String, // e.g., "12-A"
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

  // Auth
  password: {
    type: String,
    required: true,
  },

  // Election-Specific
  position: {
    type: String,
    enum: ["Head Boy", "Head Girl"],
    required: true,
  },
  manifesto: {
    type: String,
    required: true,
  },
  campaignVideo: {
    type: String, // file path or URL
  },
  achievements: [
    {
      type: String, // bullet points
    },
  ],
  initiatives: [
    {
      type: String, // promises / goals
    },
  ],
  profilePhoto: {
    type: String, // file path or URL
  },
  partysymbol: {
    type: String,
    required: true,
  },

  // Verification
  parentalConsent: {
    type: String, // file path / yes-no
  },
  declarationSigned: {
    type: Boolean,
    default: false,
  },

  // Admin Controls
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  votes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      votedAt: {
        type: Date,
        required: true,
      },
    },
  ],
  voteCount: {
    type: Number,
    default: 0,
  }
});

/**
 * Hash password before saving
 */
candidateSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (err) {
    console.log("Error in hashing Password:", err);
    next(err);
  }
});

/**
 * Check if profile is complete
 */
candidateSchema.methods.checkProfileComplete = function () {
  return (
    this.education &&
    this.profession &&
    this.bio &&
    this.manifesto &&
    this.Video &&
    Array.isArray(this.achievements) &&
    this.achievements.length > 0 &&
    this.socialLinks &&
    (this.socialLinks.twitter ||
      this.socialLinks.linkedin ||
      this.socialLinks.website)
  );
};

/**
 * Compare password
 */
candidateSchema.methods.comparePassword = async function (password) {
  const user = this;
  try {
    return await bcrypt.compare(password, user.password);
  } catch (err) {
    console.log("Error in comparing password:", err);
    throw err;
  }
};

const Candidate = mongoose.model("Candidate", candidateSchema);
module.exports = Candidate;
