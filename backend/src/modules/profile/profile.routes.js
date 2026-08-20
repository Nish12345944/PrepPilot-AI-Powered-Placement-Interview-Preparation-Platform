const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getProfile, updateProfile } = require('./profile.controller');

router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);

module.exports = router;