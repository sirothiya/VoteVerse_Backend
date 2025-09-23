const mongoose=require('mongoose')
const { type } = require('os')
const brcypt = require("bcrypt");


const candidateSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    aadhar:{
        type:String,
        required:true,
        unique:true,
        length:12
    },
    password:{
        type:String,
        required:true
    },
    party:{
        type:String,
        required:true,
        unique:true,
    },
    age:{
        type:Number,
        required:true
    },
    votes:[{
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true        
        },
        votedAt:{
            type:Date,
            required:true
        }
    }],
    voteCount:{
        type:Number,
        default:0
    },
    partySymbol:{
       type: String,
    required: true,
    }

})

candidateSchema.pre("save", async function (next) {
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

candidateSchema.methods.comparePassword=async function(password){
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

const Candidate=mongoose.model('Candidate',candidateSchema)
module.exports=Candidate