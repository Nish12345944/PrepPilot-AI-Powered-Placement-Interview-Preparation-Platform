const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { upload, uploadResume, analyzeResume, getAnalyses } = require('./resume.controller');

router.use(authenticate);

router.post('/upload', upload.single('resume'), uploadResume);
router.post('/analyze', analyzeResume);
router.get('/analyses', getAnalyses);

module.exports = router;
