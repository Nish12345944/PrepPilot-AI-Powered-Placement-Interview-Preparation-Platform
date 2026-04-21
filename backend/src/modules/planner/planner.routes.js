const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { generateDailyPlan, getTodayPlan, updateTaskStatus } = require('./planner.controller');

router.use(authenticate);

router.post('/generate', generateDailyPlan);
router.get('/today', getTodayPlan);
router.patch('/tasks/:task_id', updateTaskStatus);

module.exports = router;
