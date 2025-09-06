const mongoose = require("mongoose");
const brcypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
  },
  mobile: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  aadhar: {
    type: Number,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Voter", "Admin"],
    default: "Voter",
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
