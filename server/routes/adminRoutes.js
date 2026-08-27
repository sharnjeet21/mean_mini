const express = require('express');
const { listUsers, deleteUser } = require('../controllers/adminController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/users', (req, res, next) => listUsers(req, res, next));
router.delete('/users/:id', (req, res, next) => deleteUser(req, res, next));

// Admin analytics — global platform stats for the operations panel
router.get('/analytics', (req, res, next) => getDashboardStats(req, res, next));

module.exports = router;