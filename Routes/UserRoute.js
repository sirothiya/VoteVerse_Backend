const express = require("express");
const router = express.Router();

const User = require("../Models/User");
const Candidate = require("../Models/Candidate");
const { generateToken, jwtMiddleware } = require("../jwt");

router.post("/userSignup", async (req, res) => {
  try {
    const data = req.body;
    console.log("Signup Data:", data);
    let num = parseInt(data.class.match(/\d+/)[0]);
    if (num < 6)
      return res
        .status(400)
        .json({
          error: "Classes below 6 are not allowed to particiapte in election",
        });

    const existingUser = await User.findOne({ rollNumber: data.rollNumber });
    if (existingUser)
      return res
        .status(400)
        .json({ error: "User with this rollnumber already registered" });
    const user = new User(data);
    const newUser = await user.save();
    console.log("User created successfully");
    const payload = {
      id: newUser.id,
      rollNumber: newUser.rollNumber,
    };

    // await User.collection.dropIndex("aadhar_1");

    const token = generateToken(payload);
    res.status(201).json({ newUser, token });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/userLogin", async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    console.log("1");
    const user = await User.findOne({ rollNumber });
    console.log("11");
    if (!user) {
      return res.status(401).json({ error: "User not found, please signup" });
    }
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid rollNumber or password" });
    }
    console.log("111");
    const payload = {
      id: user.id,
      rollNumber: user.rollNumber,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      message:"User login successful",
      User: {
        id: user.id,
        name: user.name,
        rollNumber: user.rollNumber,
        class: user.class,
        dob: user.dob,
        role: user.role,
        isVoted: user.isVoted,
      },
      token,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile/:rollNumber", jwtMiddleware, async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;
    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(404).json({ error: "User not found please signup" });
    }
    console.log("user :" ,user);
    res.status(200).json({ user });
  } catch (err) {
    console.log("Error fetching user:", err);
    res.status(500).json({ error: "Error in fetching user data" });
  }
});
// I am updating user restricted to only update all except aadhar,isVoted,role
router.put("/:rollNumber", jwtMiddleware, async (req, res) => {
  const restrictedFields = ["rollNumber", "isVoted", "role"];
  try {
    const rollNumber = req.params.rollNumber;
    const updates = req.body;
    const oldData = await User.findOne({ rollNumber });
    if (restrictedFields.some((field) => field in updates)) {
      return res.status(403).json({
        error: "You are not allowed to update rollNumber, role and isVoted",
      });
    }
    const updatedUser = await User.findByIdAndUpdate(oldData.id, updates, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ message: "User updated successfully", updatedUser });
  } catch (err) {
    console.log("Error updating user:", err);
    res.status(500).json({ error: "Error in updating user data" });
  }
});

router.put("/profile/password", jwtMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; //extracting the id from the token
    console.log(userId, "<---  user id ");
    const { oldpassword, newpassword } = req.body; // extracting current and new password from request body
    const user = await User.findById(userId);
    if (!(await user.comparePassword(oldpassword)))
      return res.status(400).json({ error: "Old password is incorrect" });
    user.password = newpassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("Error updating password:", err);
    res.status(500).json({ error: err });
  }
});

router.delete("/deleteOne", jwtMiddleware, async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
