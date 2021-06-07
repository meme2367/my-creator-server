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
const jwtUtil = require('../../../module/utils/jwt');

router.post('/signin', async (req, res) => {

 const {id, passwd} = req.body;

    if (!id || !passwd) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const getMembershipByIdQuery = 'SELECT * FROM user WHERE id LIKE ?';
    const getMembershipByIdResult = await db.queryParam_Parse(getMembershipByIdQuery, [id]);

    if (!getMembershipByIdResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_SELECT_FAIL));
    } else if (getMembershipByIdResult.length === 0) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.SIGN_IN_FAIL));
    } else { 
        
        const firstMembershipByIdResult=JSON.parse(JSON.stringify(getMembershipByIdResult[0]));

        encrypt.getHashedPassword(passwd, firstMembershipByIdResult[0].salt, res, async (hashedPassword) => {
            
            if (firstMembershipByIdResult[0].passwd !== hashedPassword) {

                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.SIGN_IN_FAIL));
            } else { 
                delete firstMembershipByIdResult.passwd;
                delete firstMembershipByIdResult.salt;

                const jwtToken = jwtUtil.sign(firstMembershipByIdResult);
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATE_TOKEN, { "token" : jwtToken}));
            }
        });
    }
});

router.post('/signup', async (req, res) => {
    const { id, passwd, name, nickname, gender, birth,grade} = req.body;

    if (!id || !passwd || !name || !nickname || !gender || !birth) {

        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const getMembershipQuery = "SELECT * FROM user WHERE id = ?";
    const getMembershipResult = await db.queryParam_Parse(getMembershipQuery, [id]);



    if (!getMembershipResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_INSERT_FAIL));
    } else if (getMembershipResult[0].length > 0) { //Id 존재 
        res.status(200).send(defaultRes.successFalse(statusCode.NOT_FOUND, resMessage.MEMBERSHIP_INSERT_DUPLICATE));
    } else {

        encrypt.getSalt(res, async (salt) => {
            encrypt.getHashedPassword(passwd, salt, res, async (hashedPassword) => {

                const insertMembershipQuery = "INSERT INTO user (id,passwd,salt,name,nickname,gender,birth) VALUES (?, ?, ?, ?,?,?,?)";
                const insertMembershipResult = await db.queryParam_Parse(insertMembershipQuery, [id, hashedPassword, salt, name, nickname, gender, birth, grade]);

                if (!insertMembershipResult) {
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_INSERT_FAIL));
                } else { 
                            const postLikeBoardQuery = "INSERT INTO board_like(user_idx, board_idx) VALUES(?, ?)";
                            const postLikeBoardResult = await db.queryParam_Parse(postLikeBoardQuery, [insertMembershipResult[0].insertId,12]);
                            
                                if (!postLikeBoardResult) {
                                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_LIKE_INSERT_ERROR));
                                }else if(postLikeBoardResult === 0){
                                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
                                }
                                else{
                                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.MEMBERSHIP_INSERT_SUCCESS));
                                }
                    
                }
            });
        });
    }

});


router.get('/duplicate/:id', async (req, res) => {
    const { id} = req.params;

    if (!id) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const getIdQuery = "SELECT * FROM user WHERE id = ?";
    const getIdResult = await db.queryParam_Parse(getIdQuery, [id]);

    if (!getIdResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_INSERT_FAIL));
    } else if (getIdResult[0].length > 0) { 
        res.status(200).send(defaultRes.successTrue(statusCode.NOT_FOUND, resMessage.MEMBERSHIP_ID_EXIST));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.MEMBERSHIP_ID_NOTHING));
    }

});

module.exports = router;
