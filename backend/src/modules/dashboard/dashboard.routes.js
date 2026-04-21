const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getDashboard, getLeaderboard } = require('./dashboard.controller');

router.use(authenticate);
router.get('/', getDashboard);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
