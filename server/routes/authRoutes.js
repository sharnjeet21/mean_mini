const express = require("express");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).send("All fields are required.");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).send("User already exists. Please login.");
    }

    const user = new User({ name, email, password });
    await user.save();

    return res.redirect("/login");
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).send("Server error during registration.");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required.");
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      password,
    });

    if (!user) {
      return res.status(401).send("Invalid email or password.");
    }

    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).send("Server error during login.");
  }
});

module.exports = router;
