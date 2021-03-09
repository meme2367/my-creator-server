var express = require('express');
var router = express.Router();

router.use('/', require('./hashtags'));

module.exports = router;
