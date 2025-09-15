const mongoose=require('mongoose')
const { type } = require('os')

const candidateSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    party:{
        type:String,
        required:true
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
        type:String,
        default:"",
        required:true
    }

})


const Candidate=mongoose.model('Candidate',candidateSchema)
module.exports=Candidate