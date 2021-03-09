
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
const jwt = require('../../../module/utils/jwt');

var urlencode = require('urlencode');
var querystring = require('querystring');
var url = require('url');

// 진행중인 최근 한 투표 조회
router.get('/ings/newest', async(req, res) => {
    const {token} = req.headers;
    let userIdx;
    if(token){
        const user = jwt.verify(token);
        userIdx = user.user_idx;
    }else{
        userIdx = -1;
    }

    const getVoteQuery = 
    `SELECT v.idx AS 'vote_idx', v.thumbnail_url, v.create_time, v.start_time, v.end_time, v.title, v.contents, v.type,
	(SELECT vote_choice_idx FROM user_vote uv WHERE uv.vote_idx = v.idx AND uv.user_idx=${userIdx}) AS my_choice
    FROM vote v LEFT JOIN user_vote uv ON v.idx = uv.vote_idx
    WHERE v.start_time <= now() AND v.end_time > now() AND v.is_permitted = 1 ORDER BY v.idx DESC LIMIT 1`;
    const getVoteResult = await db.queryParam_None(getVoteQuery);

    if (!getVoteResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
    } else {
        // 진행중인 투표가 없을 때 빈 배열 반환
        if(getVoteResult.length === 0){
            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, []));
        }
        const result = getVoteResult[0];
        
        const getVoteChoiceQuery = 
        `SELECT vc.idx AS 'choice_idx', vc.vote_idx, vc.name, vc.count, c.profile_url AS creator_profile_url, c.follower_grade_idx,
            fg.name AS follower_grade_name, fg.level AS follower_grade_level, fg.img_url AS follower_grade_img_url,
            vg.name AS view_grade_img_url, vg.img_url AS view_grade_img_url
        FROM vote_choice vc  
            LEFT JOIN (creator c 
            INNER JOIN view_grade vg ON c.view_grade_idx = vg.idx
            INNER JOIN follower_grade fg ON c.follower_grade_idx = fg.idx) ON vc.creator_idx = c.idx 
            WHERE vc.vote_idx = ${result[0].vote_idx};`;
        const getVoteChoiceResult = await db.queryParam_None(getVoteChoiceQuery);
        if(!getVoteChoiceResult){
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
        }else{
            result.forEach((vote, index, votes)=>{
                result[index]["choices"] = [];
                getVoteChoiceResult[0].forEach((choice)=>{
                    if(choice.vote_idx == vote.vote_idx){
                        delete choice.vote_idx;
                        result[index]["choices"].push(choice);
                    }
                });

                result[index]["choices"].forEach((choice, idx)=>{
                    let cnt=choice.count;
                    let rank = 1;
                    result[index]["choices"].forEach((choice2, idx2)=>{
                        if(choice2.count > cnt){
                            rank++;
                        }
                    });
                    result[index]["choices"][idx]["rank"]=rank;
                });
            });
        }

        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, result[0]));
    }
});

// 진행중인 투표 목록 조회
router.get('/ings', async(req, res) => {
    const {token} = req.headers;
    let userIdx;
    if(token){
        const user = jwt.verify(token);
        userIdx = user.user_idx;
    }else{
        userIdx = -1;
    }

    const getVoteQuery =  
    `SELECT v.idx AS 'vote_idx', v.thumbnail_url, v.create_time, v.start_time, v.end_time, v.title, v.contents, v.type,
	(SELECT vote_choice_idx FROM user_vote uv WHERE uv.vote_idx = v.idx AND uv.user_idx=${userIdx}) AS my_choice
    FROM vote v
    WHERE start_time<=now() AND end_time>now() AND is_permitted = 1 ORDER BY idx DESC`;

    const getVoteResult = await db.queryParam_None(getVoteQuery);

    if (!getVoteResult) {
        return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
    } else {
        // 진행중인 투표가 없을 때 빈 배열 반환
        if(getVoteResult.length === 0){
            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, []));
        }
        const result = getVoteResult[0];

        let idxList = "";
        if(result.length==0){
            idxList = "-1";
        }else{
            result.forEach((row, idx, array)=>{
                idxList += row.vote_idx;
                if(idx !== array.length-1){
                    idxList += ',';
                }
            });
        }
        const getVoteChoiceQuery = 
        `SELECT vc.idx AS 'choice_idx', vc.vote_idx, vc.name, vc.count, c.profile_url AS creator_profile_url, c.follower_grade_idx, 
        fg.name AS follower_grade_name, fg.level AS follower_grade_level, fg.img_url AS follower_grade_img_url, 
        vg.name AS view_grade_img_url, vg.img_url AS view_grade_img_url
            FROM vote_choice vc  
                LEFT JOIN (creator c 
                    INNER JOIN view_grade vg ON c.view_grade_idx = vg.idx
                    INNER JOIN follower_grade fg ON c.follower_grade_idx = fg.idx) ON vc.creator_idx = c.idx 
            WHERE vc.vote_idx IN (${idxList})`;
        const getVoteChoiceResult = await db.queryParam_None(getVoteChoiceQuery);
        if(!getVoteChoiceResult){
            return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
        }else{
            choiceResult = getVoteChoiceResult[0];
            result.forEach((vote, index, votes)=>{
                result[index]["choices"] = [];
                choiceResult.forEach((choice)=>{
                    if(choice.vote_idx == vote.vote_idx){
                        delete choice.vote_idx;
                        result[index]["choices"].push(choice);
                    }
                });

                result[index]["choices"].forEach((choice, idx)=>{
                    let cnt=choice.count;
                    let rank = 1;
                    result[index]["choices"].forEach((choice2, idx2)=>{
                        if(choice2.count > cnt){
                            rank++;
                        }
                    });
                    result[index]["choices"][idx]["rank"]=rank;
                });
            });
        }
        return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, result));
    }
});

// 지난 투표 조회 - 홈화면
router.get('/lasts/home', async(req, res) => {
    const {token} = req.headers;
    let userIdx;
    if(token){
        const user = jwt.verify(token);
        userIdx = user.user_idx;
    }else{
        userIdx = -1;
    }
    const getVoteQuery = 
    `SELECT idx AS vote_idx, thumbnail_url, title FROM vote 
    WHERE end_time<=now() AND is_permitted = 1 ORDER BY idx DESC
    LIMIT 3`;
    const getVoteResult = await db.queryParam_None(getVoteQuery);

    if (!getVoteResult) {
        return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
    } else {
        // 진행중인 투표가 없을 때 빈 배열 반환
        if(getVoteResult.length === 0){
            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, []));
        }
        const result = getVoteResult[0];

        result.forEach((data, index, array) => {
            const getVoteChoiceQuery = 
            `SELECT vc.idx AS choice_idx, c.profile_url, vc.name, vc.count
            FROM vote_choice vc LEFT JOIN creator c ON vc.creator_idx = c.idx
            WHERE vc.vote_idx = ${data.vote_idx}
            ORDER BY vc.count DESC LIMIT 1;`;
            const getVoteChoiceResult = db.queryParam_None(getVoteChoiceQuery);
            getVoteChoiceResult.then((vote_choice)=>{
                if(!vote_choice){
                    return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
                }else{
                    const choice = vote_choice[0];
                    result[index]["choice_idx"] = choice[0].choice_idx;
                    result[index]["profile_url"] = choice[0].profile_url;
                    result[index]["choice_name"] = choice[0].name;
                }    
                if(index === array.length - 1){
                    return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, result));
                }
            });
        });
    }
});

// 지난 투표 조회
router.get('/lasts', async(req, res) => {
    const {token} = req.headers;
    let userIdx;
    if(token){
        const user = jwt.verify(token);
        userIdx = user.user_idx;
    }else{
        userIdx = -1;
    }
    const getVoteQuery = 
    `SELECT v.idx AS 'vote_idx', v.thumbnail_url, v.create_time, v.start_time, v.end_time, v.title, v.contents, v.type,
	(SELECT vote_choice_idx FROM user_vote uv WHERE uv.vote_idx = v.idx AND uv.user_idx=${userIdx}) AS my_choice
    FROM vote v
    WHERE end_time <= now() AND is_permitted = 1 ORDER BY idx DESC;`;
    const getVoteResult = await db.queryParam_None(getVoteQuery);

    if (!getVoteResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
    } else {
        // 진행중인 투표가 없을 때 빈 배열 반환
        if(getVoteResult.length === 0){
            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, []));
        }
        const result = getVoteResult[0];

        let idxList;
        if(result.length==0){
            idxList = "-1";
        }else{
            idxList = ""
            result.forEach((row, idx, array)=>{
                idxList += row.vote_idx;
                if(idx !== array.length-1){
                    idxList += ',';
                }
            });
        }
        const getVoteChoiceQuery = 
        `SELECT vc.idx AS 'choice_idx', vc.vote_idx, vc.name, vc.count, c.profile_url AS creator_profile_url, c.follower_grade_idx, 
        fg.name AS follower_grade_name, fg.level AS follower_grade_level, fg.img_url AS follower_grade_img_url, 
        vg.name AS view_grade_img_url, vg.img_url AS view_grade_img_url
            FROM vote_choice vc  
                LEFT JOIN (creator c 
                    INNER JOIN view_grade vg ON c.view_grade_idx = vg.idx
                    INNER JOIN follower_grade fg ON c.follower_grade_idx = fg.idx) ON vc.creator_idx = c.idx 
            WHERE vc.vote_idx IN (${idxList});`;
        const getVoteChoiceResult = await db.queryParam_None(getVoteChoiceQuery);
        choiceResult = getVoteChoiceResult[0];
        if(!choiceResult){
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
        }else{
            result.forEach((vote, index, votes)=>{
                result[index]["choices"] = [];
                choiceResult.forEach((choice)=>{
                    if(choice.vote_idx == vote.vote_idx){
                        result[index]["choices"].push(choice);
                    }
                });

                result[index]["choices"].forEach((choice, idx)=>{
                    let cnt=choice.count;
                    let rank = 1;
                    result[index]["choices"].forEach((choice2, idx2)=>{
                        if(choice2.count > cnt){
                            rank++;
                        }
                    });
                    result[index]["choices"][idx]["rank"]=rank;
                });
            });
        }
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, result));
    }
});

// 제안한 투표 목록 조회
router.get('/suggestions', authUtil.isAdmin, async(req, res) => {
    const getVoteQuery =  
    `SELECT v.idx AS 'vote_idx', v.thumbnail_url, v.create_time, v.start_time, v.end_time, v.title, v.contents, v.type
    FROM vote v
    WHERE is_permitted = 0 ORDER BY idx DESC`;

    const getVoteResult = await db.queryParam_None(getVoteQuery);

    if (!getVoteResult) {
        return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
    } else {
        // 진행중인 투표가 없을 때 빈 배열 반환
        if(getVoteResult.length === 0){
            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, []));
        }
        const result = getVoteResult[0];

        let idxList = "";
        if(result.length==0){
            idxList = "-1";
        }else{
            result.forEach((row, idx, array)=>{
                idxList += row.vote_idx;
                if(idx !== array.length-1){
                    idxList += ',';
                }
            });
        }
        const getVoteChoiceQuery = 
        `SELECT vc.idx AS 'choice_idx', vc.vote_idx, vc.name, vc.count, c.profile_url AS creator_profile_url, c.follower_grade_idx, 
        fg.name AS follower_grade_name, fg.level AS follower_grade_level, fg.img_url AS follower_grade_img_url, 
        vg.name AS view_grade_img_url, vg.img_url AS view_grade_img_url
            FROM vote_choice vc  
                LEFT JOIN (creator c 
                    INNER JOIN view_grade vg ON c.view_grade_idx = vg.idx
                    INNER JOIN follower_grade fg ON c.follower_grade_idx = fg.idx) ON vc.creator_idx = c.idx 
            WHERE vc.vote_idx IN (${idxList})`;
        const getVoteChoiceResult = await db.queryParam_None(getVoteChoiceQuery);
        if(!getVoteChoiceResult){
            return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.EPISODE_SELECT_ERROR));
        }else{
            choiceResult = getVoteChoiceResult[0];
            result.forEach((vote, index, votes)=>{
                result[index]["choices"] = [];
                choiceResult.forEach((choice)=>{
                    if(choice.vote_idx == vote.vote_idx){
                        delete choice.vote_idx;
                        result[index]["choices"].push(choice);
                    }
                });

                result[index]["choices"].forEach((choice, idx)=>{
                    let cnt=choice.count;
                    let rank = 1;
                    result[index]["choices"].forEach((choice2, idx2)=>{
                        if(choice2.count > cnt){
                            rank++;
                        }
                    });
                    result[index]["choices"][idx]["rank"]=rank;
                });
            });
        }
        return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, result));
    }
});

// 투표 제안
router.post('/suggestion', /*authUtil.isLoggedin,*/ async(req, res) => {
    const {title, choices} = req.body;

    if (!title || !choices) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const insertVoteQuery = "INSERT INTO vote(title) VALUES(?)";
    const insertVoteResult = await db.queryParam_Parse(insertVoteQuery, [title]);

    if(!insertVoteResult){
        return res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, `fail insert vote`));
    }
    
    choices.forEach(async (choice, index, array)=>{
        const insertVoteChoiceQuery = "INSERT INTO vote_choice(vote_idx, name) VALUES (?, ?)";
        const insertVoteChoiceResult = await db.queryParam_Parse(insertVoteChoiceQuery, [insertVoteResult[0].insertId,choice.name]);
        console.log(insertVoteChoiceResult);
    })
    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, `success to suggest vote`));
});


// 투표 하기
router.post('/:voteIdx/take', authUtil.isLoggedin, async(req, res) => {
    const userIdx = req.decoded.user_idx;
    const {voteIdx} = req.params;
    const {choiceIdx} = req.body;

    if (!userIdx || !voteIdx || !choiceIdx) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const insertUserVoteQuery = "INSERT INTO user_vote(vote_idx, user_idx, vote_choice_idx) VALUES(?, ?, ?)";
    const insertUserVoteResult = await db.queryParam_Parse(insertUserVoteQuery, [voteIdx, userIdx, choiceIdx]);

    if(!insertUserVoteResult){
        return res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, `fail insert vote`));
    }
    const increaseVoteChoiceCountQuery = "UPDATE vote_choice SET count = count + 1 WHERE idx = ?;";
    const increaseVoteChoiceCountResult = await db.queryParam_Parse(increaseVoteChoiceCountQuery, [choiceIdx]);
    
    return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, `success to take vote`));
});

// 투표 허가
router.put('/:voteIdx/permit', authUtil.isAdmin, async(req, res) => {
    const {voteIdx} = req.params;
    const {startTime, endTime} = req.body;

    if (!voteIdx || !startTime || !endTime) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const permitVoteQuery = "UPDATE vote SET start_time = ?, end_time = ?, is_permitted = 1 WHERE idx = ?";
    const permitVoteResult = await db.queryParam_Parse(permitVoteQuery, [startTime, endTime, voteIdx]);

    console.log(permitVoteResult);
    if(!permitVoteResult){
        return res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, `fail insert vote`));
    }
    
    return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, `success to permit vote`));
});

// 투표 거부
router.put('/:voteIdx/refuse', authUtil.isAdmin, async(req, res) => {
    const {voteIdx} = req.params;

    if (!voteIdx) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    const permitVoteQuery = "UPDATE vote SET is_permitted = 2 WHERE idx = ?";
    const permitVoteResult = await db.queryParam_Parse(permitVoteQuery, [voteIdx]);

    console.log(permitVoteResult);
    if(!permitVoteResult){
        return res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, `fail insert vote`));
    }
    
    return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.EPISODE_SELECT_SUCCESS, `success to refuse vote`));
});

module.exports = router;
