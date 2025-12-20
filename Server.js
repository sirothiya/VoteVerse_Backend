const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require('path');
// Allow specific frontend (during development)
app.options("/*", cors());
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
require("./utils/electionScheduler");
const candidateRoute = require("./Routes/CandidateRoute");
const userRoute = require("./Routes/UserRoute");
const geminiRoute = require("./Routes/Gemini");
const AdminRoute=require("./Routes/AdminRoutes")
const ElectionRoute=require("./Routes/ElectionRoute")
app.use("/candidate", candidateRoute);
app.use("/user", userRoute);
app.use("/gemini", geminiRoute);
app.use("/admin",AdminRoute)
app.use("/election",ElectionRoute)
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));


app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Voting App");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
