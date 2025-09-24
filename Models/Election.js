const mongoose=require('mongoose')

const electionSchema= new mongoose.Schema({
    isActive: {
    type: Boolean,
    default: false
    },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  result:[
    {
        candidate:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Candidate',
            required:true
        },
        votes:{
            type:Number,
            default:0
        }
    }
  ]
})

const Election=mongoose.model('Election',electionSchema)
module.exports=Election;