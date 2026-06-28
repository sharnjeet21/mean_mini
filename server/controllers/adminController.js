const User = require("../models/User");
const Itinerary = require("../models/Itinerary");

async function listUsers(req, res, next) {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, deleteUser };