const express = require("express");
const router = express.Router();

const User = require("../Models/User");
const Candidate = require("../Models/Candidate");
const { generateToken, jwtMiddleware } = require("../jwt");

router.post("/signup", async (req, res) => {
  try {
    const data = req.body;
    console.log("Signup Data:", data);
    const isAdmin = await User.findOne({ role: "Admin" });
    if (data.role == "Admin" && isAdmin)
      return res.status(403).json({ error: "Admin already exists" });

    // validate aadhar card number must be 12digit
    if (!/^\d{12}$/.test(data.aadhar))
      return res
        .status(400)
        .json({ error: "Invalid Aadhar number1:must be 12 digit number" });

    const existingUser = await User.findOne({ aadhar: data.aadhar });
    if (existingUser)
      return res
        .status(400)
        .json({ error: "Aadhar number already registered" });
    const user = new User(data);
    const newUser = await user.save();
    console.log("User created successfully");
    const payload = {
      id: newUser.id,
      aadhar: newUser.aadhar,
    };
    const token = generateToken(payload);
    res.status(201).json({ newUser, token });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { aadhar, password } = req.body;
    console.log("1");
    const user = await User.findOne({ aadhar });
    console.log("11");
    if(!user){
      return res.status(401).json({error:"User not found, please signup"});
    }
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid aadhar or password" });
    }
    console.log("111");
    const payload = {
      id: user.id,
      aadhar: user.aadhar,
    };
    console.log("1111");
    const token = generateToken(payload);
    console.log("11111");
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        age: user.age,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        aadhar: user.aadhar,
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

router.get("/profile", jwtMiddleware, async (req, res) => {
  try {
    const aadhar = req.user.aadhar;
    const user = await User.findOne({ aadhar });
    if (!user) {
      return res.status(404).json({ error: "User not found please signup" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.log("Error fetching user:", err);
    res.status(500).json({ error: "Error in fetching user data" });
  }
});
// I am updating user restricted to only update all except aadhar,isVoted,role
router.put("/:aadhar", jwtMiddleware, async (req, res) => {
  const restrictedFields = ["aadhar", "isVoted", "role"];
  try {
    const aadhar = req.params.aadhar;
    const updates = req.body;
    const oldData = await User.findOne({ aadhar });
    if (restrictedFields.some((field) => field in updates)) {
      return res.status(403).json({
        error: "You are not allowed to update aadhar, role and isVoted",
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
