var express = require('express');
var router = express.Router();

router.use('/', require('./post'));
//router.use('/like', require('./like/index'));

module.exports = router;
