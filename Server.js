const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

const db = require("./db");

const candidateRoute = require("./Routes/CandidateRoute");
const userRoute = require("./Routes/UserRoute");

app.use("/candidate", candidateRoute);
app.use("/user", userRoute);
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Voting App");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
