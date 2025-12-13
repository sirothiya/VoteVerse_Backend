// models/Admin.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  schoolName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  electionSetup: {
    announcementMessage: { type: [String], default: [] },
    candidateRegStart: { type: Date, default: null },
    candidateRegEnd: { type: Date, default: null },
    electionStart: { type: Date, default: null },
    electionDurationHours: { type: Number, default: null },
    electionEnd: { type: Date, default: null },
  },
});

// password hash (optional)
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
// Pre-save hook to auto-calculate electionEnd based on electionStart + electionDurationHours
adminSchema.pre("save", function (next) {
  const setup = this.electionSetup;

  if (setup.electionStart && setup.electionDurationHours) {
    const start = new Date(setup.electionStart);
    const end = new Date(start.getTime() + setup.electionDurationHours * 60 * 60 * 1000);
    this.electionSetup.electionEnd = end;
  }

  next();
});


adminSchema.methods.comparePassword = async function (password) {
  const admin = this;
  try {
    return await bcrypt.compare(password, admin.password);
  } catch (err) {
    console.log("Error in comparing password:", err);
    throw err;
  }
};

module.exports = mongoose.model("Admin", adminSchema);
