const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getProblems, getProblemById, submitCode, getSubmissions } = require('./coding.controller');

router.use(authenticate);

router.get('/problems', getProblems);
router.get('/problems/:id', getProblemById);
router.post('/submit', submitCode);
router.get('/problems/:problem_id/submissions', getSubmissions);

module.exports = router;
