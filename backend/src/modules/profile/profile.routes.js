const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { getProfile, updateProfile } = require('./profile.controller');
const { updateProfileSchema } = require('./profile.schema');

router.use(authenticate);

router.get('/', getProfile);
router.put('/', validate(updateProfileSchema), updateProfile);

module.exports = router;