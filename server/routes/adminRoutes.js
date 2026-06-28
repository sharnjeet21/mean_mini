const express = require("express");
const { listUsers, deleteUser } = require("../controllers/adminController");
const { authMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/users", (req, res, next) => listUsers(req, res, next));
router.delete("/users/:id", (req, res, next) => deleteUser(req, res, next));

module.exports = router;