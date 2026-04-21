const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const {
  getLearningPath, getNextRecommendation, generateStudyMaterial, getStudyMaterials
} = require('./learning.controller');

router.use(authenticate);

router.get('/path', getLearningPath);
router.get('/next', getNextRecommendation);
router.post('/materials/generate', generateStudyMaterial);
router.get('/materials', getStudyMaterials);

module.exports = router;
