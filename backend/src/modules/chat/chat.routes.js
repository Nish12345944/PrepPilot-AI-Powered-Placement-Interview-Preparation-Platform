const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { sendMessage, getSessions, getMessages } = require('./chat.controller');

router.use(authenticate);
router.post('/message', sendMessage);
router.get('/sessions', getSessions);
router.get('/sessions/:session_id/messages', getMessages);

module.exports = router;
