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

router.get('/:userIdx', async (req, res) => {
const passwd = req.body.passwd;
 const idx = req.params.userIdx;

    if (!idx ) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const getMembershipByIdQuery = 'SELECT * FROM user WHERE idx = ?';
    const getMembershipByIdResult = await db.queryParam_Parse(getMembershipByIdQuery, [idx]);

    if (!getMembershipByIdResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_SELECT_FAIL));
    } else if (getMembershipByIdResult.length === 0) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
    } else { 

        const firstMembershipByIdResult=JSON.parse(JSON.stringify(getMembershipByIdResult[0]));

        encrypt.getHashedPassword(passwd, firstMembershipByIdResult[0].salt, res, async (hashedPassword) => {            
            if (firstMembershipByIdResult[0].passwd !== hashedPassword) {
             
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            } else { 
             
          
                delete firstMembershipByIdResult[0].passwd;
                delete firstMembershipByIdResult[0].salt;


                const getUserInfoQuery = 'select id,passwd,name,nickname,gender,birth,profile_url FROM user WHERE idx = ?';
                const getUserInfoResult = await db.queryParam_Parse(getUserInfoQuery,[idx]);

                if(!getUserInfoResult){
                    
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
                }else if(getUserInfoResult === 0){
                    
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
                }else{
                    
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.USERINFO_SELECT_SUCCESS,getUserInfoResult[0]));
                }


                
            }
        });
    }
});


router.post('/', authUtil.isLoggedin,  (req, res) => {
    
    const {name,nickname,gender,birth,profile_url} = req.body;
    const idx = req.decoded.user_idx;

    
    if(!idx || (!name && !nickname && !gender && !birth && !profile_url )){
        res.status(400).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    
    let putUserQuery = "UPDATE user SET ";
    if(name) putUserQuery+= ` name = '${name}',`;
    if(nickname) putUserQuery+= ` nickname = '${nickname}',`;
    if(gender) putUserQuery+= ` gender = '${gender}',`;
    if(birth) putUserQuery+= ` birth = '${birth}',`;
    if(profile_url) putUserQuery+= ` profile_url = '${profile_url}',`;


    putUserQuery = putUserQuery.slice(0, putUserQuery.length-1);
    
    putUserQuery += " WHERE idx = ?";

    db.queryParam_Parse(putUserQuery, idx, function(result){
        if (!result) {
            res.status(400).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USER_UPDATE_ERROR));
        } else {
            if(result.length  === 0){
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.USER_UPDATE_NOTHING));
            }else{
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.USER_UPDATE_SUCCESS));
            }
        }
    });
});

router.delete('/', authUtil.isLoggedin,  async(req, res) => {
    const idx = req.decoded.user_idx;
    
    const deleteUserQuery = "DELETE FROM user WHERE idx = ?";
    const deleteUserResult = await db.queryParam_Parse(deleteUserQuery, [idx]);

    if (!deleteUserResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USER_DELETE_ERROR));
    } else {
        if(deleteUserResult.length  === 0){
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.USER_DELETE_NOTHING));
        }else{
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.USER_DELETE_SUCCESS));
        }
    }
});

module.exports = router;
