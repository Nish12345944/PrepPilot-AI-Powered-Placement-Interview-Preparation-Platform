const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { upload, handleUploadError, uploadResume, analyzeResume, getAnalyses, getResumes } = require('./resume.controller');

router.use(authenticate);

router.post('/upload', upload.single('resume'), handleUploadError, uploadResume);
router.post('/analyze', analyzeResume);
router.get('/analyses', getAnalyses);
router.get('/', getResumes);

module.exports = router;
