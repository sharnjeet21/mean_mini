const express = require("express");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).send("All fields are required.");
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).send("All fields are required.");
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).send("User already exists. Please login.");
    }

    const user = new User({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
    });
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

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.password !== cleanPassword) {
      return res.status(401).send("Invalid email or password.");
    }

    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).send("Server error during login.");
  }
});

module.exports = router;
