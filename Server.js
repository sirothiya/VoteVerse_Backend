const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require('path');
// Allow specific frontend (during development)
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

const db = require("./db");

const candidateRoute = require("./Routes/CandidateRoute");
const userRoute = require("./Routes/UserRoute");
const geminiRoute = require("./Routes/Gemini");
app.use("/candidate", candidateRoute);
app.use("/user", userRoute);
app.use("/gemini", geminiRoute);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/uploads', express.static('uploads'));


app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Voting App");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
