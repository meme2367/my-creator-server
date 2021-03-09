var express = require('express');
var router = express.Router();

router.use('/users', require('./user/index'));
router.use('/boards', require('./board/index'));
router.use('/creators', require('./creator/index'));
router.use('/votes', require('./vote/index'));
router.use('/posts', require('./post/index'));
router.use('/replies',require('./replies/index'));
router.use('/hashtags', require('./hashtags/index'));
router.use('/categories', require('./categories/index'));
router.use('/auth', require('./auth/index'));
module.exports = router;
