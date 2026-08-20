const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getAchievements } = require('./gamification.controller');

router.use(authenticate);
router.get('/achievements', getAchievements);

module.exports = router;