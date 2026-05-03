const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const {
  startSession, submitResponse, completeSession, getSessions, getCompanies, getQuestionsByCompany
} = require('./interview.controller');

// Public routes (no auth needed)
router.get('/companies', getCompanies);
router.get('/questions', getQuestionsByCompany);

// Protected routes (auth required)
router.use(authenticate);
router.post('/sessions', startSession);
router.get('/sessions', getSessions);
router.post('/sessions/:session_id/respond', submitResponse);
router.post('/sessions/:session_id/complete', completeSession);

module.exports = router;
