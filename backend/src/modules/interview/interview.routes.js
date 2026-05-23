const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const {
  startSession, submitResponse, completeSession,
  getSessions, getSessionDetail,
  getCompanies, getQuestionsByCompany,
  transcribeAudio, audioUpload,
} = require('./interview.controller');

router.get('/companies', getCompanies);
router.get('/questions', getQuestionsByCompany);

router.use(authenticate);
router.post('/sessions', startSession);
router.get('/sessions', getSessions);
router.get('/sessions/:session_id', getSessionDetail);
router.post('/sessions/:session_id/respond', submitResponse);
router.post('/sessions/:session_id/complete', completeSession);
router.post('/transcribe', audioUpload.single('audio'), transcribeAudio);

module.exports = router;
