const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const {
  startSession, submitResponse, completeSession, getSessions
} = require('./interview.controller');

router.use(authenticate);

router.post('/sessions', startSession);
router.get('/sessions', getSessions);
router.post('/sessions/:session_id/respond', submitResponse);
router.post('/sessions/:session_id/complete', completeSession);

module.exports = router;
