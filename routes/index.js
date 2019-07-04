var express = require('express');
var router = express.Router();

router.use('/api', require('./api/index'));
router.use('/auth', require('./auth'));

module.exports = router;