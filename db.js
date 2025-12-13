const mongoose=require('mongoose')
require('dotenv').config()

const mongoUrl=process.env.DB_ONLINE||process.env.DB_URL_local

mongoose.connect(mongoUrl,{
    useNewUrlParser:true,
    useUnifiedTopology:true
})

const db=mongoose.connection

db.on('connected',()=>{
    console.log('Database connected successfully')
})

db.on('error',(err)=>{
    console.error('Database connection error:', err)
})

db.on('disconnected',()=>{
    console.log('Database disconnected')
})

db.on('close',()=>{
    console.log('Database connection closed')
})

module.exports=db