const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require('path');

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "https://vote-verse-frontend.vercel.app",
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

const db = require("./db");
require("./utils/electionScheduler");
const candidateRoute = require("./Routes/CandidateRoute");
const userRoute = require("./Routes/UserRoute");
const geminiRoute = require("./Routes/Gemini");
const AdminRoute=require("./Routes/AdminRoutes")
const ElectionRoute=require("./Routes/ElectionRoute")
const AI=require("./Routes/Ai")
app.use("/candidate", candidateRoute);
app.use("/user", userRoute);
app.use("/gemini", geminiRoute);
app.use("/admin",AdminRoute)
app.use("/election",ElectionRoute)
app.use("/api/ai",AI)
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));


app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Voting App");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
