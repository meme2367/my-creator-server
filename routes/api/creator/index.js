var express = require('express');
var router = express.Router();

router.use('/', require('./creator'));
router.use('/profiles', require('./profile/index'));

module.exports = router;
