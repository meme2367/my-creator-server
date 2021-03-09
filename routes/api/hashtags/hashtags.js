
var express = require('express');
var router = express.Router();

const upload = require('../../../config/multer');
const defaultRes = require('../../../module/utils/utils');
const statusCode = require('../../../module/utils/statusCode');
const resMessage = require('../../../module/utils/responseMessage');
const encrypt = require('../../../module/utils/encrypt');
const db = require('../../../module/utils/pool');
const moment = require('moment');
const authUtil = require('../../../module/utils/authUtils');


// 해시태그 조회
router.get('/', async (req, res) => {
    const getHashtagsQuery = "SELECT * FROM hashtag";
    const getHashtagsResult = await db.queryParam_Parse(getHashtagsQuery);

    if (!getHashtagsResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.HASHTAG_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.HASHTAG_SELECT_SUCCESS, getHashtagsResult[0]));
    }
});



// 해시태그 수정
router.put('/:hashtagIdx', authUtil.isAdmin, (req, res) => {
    const { hashtagIdx } = req.params;
    const { name } = req.body;

    // hashtagIdx 없으면 에러 응답
    if (!hashtagIdx || !name) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    let putHashtagsQuery = "UPDATE hashtag SET ";
    if (name) putHashtagsQuery += ` name = '${name}',`;
    putHashtagsQuery = putHashtagsQuery.slice(0, putHashtagsQuery.length - 1);
    putHashtagsQuery += " WHERE idx = ?";

    db.queryParam_Parse(putHashtagsQuery, [hashtagIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CATEGORY_UPDATE_ERROR));
        } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CATEGORY_UPDATE_SUCCESS));
        }
    });
});

//해시태그 삭제
router.delete('/:hashtagIdx', authUtil.isAdmin, async (req, res) => {
    const { hashtagIdx } = req.params;

    const deleteHashtagsQuery = "DELETE FROM hashtag WHERE idx = ?";
    const deleteHashtagsResult = await db.queryParam_Parse(deleteHashtagsQuery, [hashtagIdx]);

    if (!deleteHashtagsResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.HASHTAG_DELETE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.HASHTAG_DELETE_SUCCESS));
    }
});

module.exports = router;