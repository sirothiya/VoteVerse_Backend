const mongoose = require("mongoose");
const brcypt = require("bcrypt");

const userSchema = new mongoose.Schema({
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
    type: String, // e.g., "10-B"
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },

  // Auth
  password: {
    type: String,
    required: true,
  },

  // Voting Info
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isVoted: {
    type: Boolean,
    default: false,
  },
});
//it is a mongoose middleware. runs before saving the document
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  try {
    const salt = await brcypt.genSalt(10);
    const hashedPassword = await brcypt.hash(user.password, salt);
    user.password = hashedPassword;
    
  } catch (err) {
    console.log("error in hashing Password:", err);
    next(err);
  }
});

userSchema.methods.comparePassword=async function(password){
    console.log("2")
    const user=this;
    console.log("22")
    try{
        const isMatch= await brcypt.compare(password,user.password)
       console.log("222") 
       return isMatch
    }catch(err){
        console.log("Error in comparing password:",err)
        throw err
    }
}

const User = mongoose.model("User", userSchema);
module.exports = User;
