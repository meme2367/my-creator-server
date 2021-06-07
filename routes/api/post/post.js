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

const cron = require('node-cron');
const fileSys = require('fs');

const jwt = require('../../../module/utils/jwt');

router.get('/listhot/:boardIdx', async (req, res) => {
 const boardIdx = req.params.boardIdx;
let getPosthotQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url
FROM post p
WHERE p.board_idx = ?
ORDER BY p.like_cnt DESC LIMIT 3`;
    const getPosthotResult = await db.queryParam_Parse(getPosthotQuery,boardIdx);
       
        let anss = getPosthotResult[0];
        for(var i = 0;i<anss.length;i++){
            anss[i]["hot_image"] =1;    
        }

    if (!getPosthotResult ) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else if(getPosthotResult[0].length === 0 || anss.length === 0){
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,anss));
    }
    else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,anss));
    }
});

router.get('/list/:boardIdx', async (req, res) => {
    const boardIdx = req.params.boardIdx;  
    const get = `SELECT idx FROM post WHERE board_idx = ?
ORDER BY like_cnt DESC LIMIT 3`;

    const getResult = await db.queryParam_Parse(get,boardIdx);
    const ans = JSON.parse(JSON.stringify(getResult[0]));
       
    let answer = [];   
    for(var i = 0;i<ans.length;i++){
        answer[i] = ans[i].idx;
    }
    

    if(!getResult){

    }else{
        console.log("22");
        let getPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url FROM post p 
WHERE idx NOT IN (?)
AND p.board_idx = ? 
ORDER BY p.create_time DESC`;

    const getPostResult = await db.queryParam_Parse(getPostQuery,[answer,boardIdx]);
        if (!getPostResult){
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,[]));
        }else if(getPostResult[0].length === 0) {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,[]));
        } else {
            let aaaa = getPostResult[0];
            for(var i = 0;i<aaaa.length;i++){
                aaaa[i]["hot_image"] =0;    
            }
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,aaaa));
        }
    }



    
});

router.get('/detail/:postIdx', async (req, res) => {


 const {postIdx} = req.params;
 let updateViewCntQuery  = `UPDATE post SET view_cnt = view_cnt + 1 WHERE idx = ?`;
 const updateViewCntResult = await db.queryParam_Parse(updateViewCntQuery,[postIdx]);

    let getPostQuery  = `SELECT p.idx AS 'post_idx',p.board_idx,b.name AS 'board_name',p.user_idx AS 'write_user_idx',p.thumbnail_url AS 'thumbnail_url',p.title,p.contents,p.view_cnt,
date_format(p.create_time,'%Y-%m-%d %h:%i') 
AS 'create_time',p.is_anonymous, u.id, u.nickname, u.profile_url , COUNT(r.idx) AS 'reply_cnt' ,pm.type AS 'media_type',pm.media_url AS 'media_url'
    FROM post p 
    INNER JOIN post_media pm ON pm.post_idx = p.idx
    INNER JOIN user u ON u.idx = p.user_idx
    INNER JOIN board b ON b.idx = p.board_idx
    INNER JOIN reply r ON r.user_idx = u.idx
    WHERE p.idx = ?`;
    const getPostResult = await db.queryParam_Parse(getPostQuery,[postIdx]);

    const ans = JSON.parse(JSON.stringify(getPostResult));

    const {token} = req.headers;
    let userIdx;
    if(token){
        const user = jwt.verify(token);
        userIdx = user.user_idx;
 

    }else{
        userIdx = -1;

    }
    ans[0][0]["login_userIdx"] = userIdx;
    if (!getPostResult) { 
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else if(!ans[0][0].post_idx){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_NOTHING));
    }
    else{
        
    const getLikeCntQuery = "SELECT COUNT(*) AS 'like_cnt' FROM post p INNER JOIN `like` l ON l.post_idx = p.idx WHERE p.idx = ?";
    const getLikeCntResult = await db.queryParam_Parse(getLikeCntQuery,[postIdx]);

    if(!getLikeCntResult){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    }else{
        const getHateCntQuery = "SELECT COUNT(*) AS 'hate_cnt' FROM post p INNER JOIN hate h ON h.post_idx = p.idx WHERE p.idx = ?";
        const getHateCntResult = await db.queryParam_Parse(getHateCntQuery,[postIdx]);

        if(!getHateCntResult){
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
        }else{

            ans[0][0]["like_cnt"] = getLikeCntResult[0][0].like_cnt;
                ans[0][0]["hate_cnt"] = getHateCntResult[0][0].hate_cnt;

            if(userIdx === -1){
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, ans[0]));

            }else{
                const getUserLikeQuery = "SELECT * FROM `like` l WHERE l.user_idx = ? AND l.post_idx = ?";
                const getUserLikeResult = await db.queryParam_Parse(getUserLikeQuery,[userIdx,postIdx]);
                    
           
                    if(!getUserLikeResult || getUserLikeResult[0].length===0){
                        ans[0][0]["is_like"] = 0;
                    }else{
                        ans[0][0]["is_like"] = 1;
                    }

                const getUserHateQuery = "SELECT * FROM `hate` h WHERE h.user_idx = ? AND h.post_idx = ?";
                const getUserHateResult = await db.queryParam_Parse(getUserHateQuery,[userIdx,postIdx]);

                    if(!getUserHateResult || getUserHateResult[0].length ===0){
                        ans[0][0]["is_hate"] = 0;
                    }else{
                        ans[0][0]["is_hate"] = 1;
                    }

                if(ans[0][0]["is_like"] === ans[0][0]["is_hate"]){
                    ans[0][0]["is_like"] = 0;
                    ans[0][0]["is_hate"] = 0;
                }
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, ans[0]));
                            
            }
            
        }

    }
        
    }
});

router.get('/new', async (req, res) => { 
    const getPostByCreateTimeLimitQuery = `SELECT  p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.create_time ASC LIMIT 5`;

    const  getPostByCreateTimeLimitResult = await db.queryParam_None(getPostByCreateTimeLimitQuery);

    if (!getPostByCreateTimeLimitResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByCreateTimeLimitResult[0]));
    }
});

router.get('/hot', async (req, res) => { 
    let getPostByHotQuery= `SELECT  p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.like_cnt DESC LIMIT 5`;  

    const getPostByHotResult = await db.queryParam_None(getPostByHotQuery);

    if (!getPostByHotResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { 
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByHotResult[0]));
    }
});

router.get('/allhot', async (req, res) => { 
    let getPostByCreateTimeQuery = `SELECT p.idx AS 'post_idx', p.board_idx,b.name AS 'board_name',p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,u.name AS 'user_name',(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC`;

    const getPostByCreateTimeResult = await db.queryParam_None(getPostByCreateTimeQuery);
    const answer = JSON.parse(JSON.stringify(getPostByCreateTimeResult[0]));

    for(var i = 0;i<answer.length;i++){
        answer[i]["hot_image"] = 1;
    }

    if (!getPostByCreateTimeResult) { 
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,answer));
    }
});

router.get('/allnew', async (req, res) => { 
    let getPostByCreateTimeQuery = `SELECT p.idx AS 'post_idx', p.board_idx,b.name AS 'board_name',p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,u.name AS 'user_name',(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.create_time DESC`;

    const getPostByCreateTimeResult = await db.queryParam_None(getPostByCreateTimeQuery);

    if (!getPostByCreateTimeResult) { 
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { 
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByCreateTimeResult[0]));
    }
});

router.get('/todayhot', async (req, res) => {

    let getTodayHotPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,u.name
, (SELECT COUNT(*) FROM reply WhERE post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC
    LIMIT 3`;

    let getTodayHotPostResult = await db.queryParam_None(getTodayHotPostQuery);
    if (!getTodayHotPostResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYHOT_GET_ERROR));
    } else if(getTodayHotPostResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYHOT_GET_NOTHING))
    }else{ 
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_TODAYHOT_GET_SUCCESS, getTodayHotPostResult[0]));
    }
});

router.get('/todaynew', async (req, res) => {

    let getTodayHotPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,u.name
, (SELECT COUNT(*) FROM reply WhERE post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    ORDER BY p.create_time DESC
    LIMIT 3`;
    
    let getTodayHotPostResult = await db.queryParam_None(getTodayHotPostQuery);
    
    if (!getTodayHotPostResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYNEW_GET_ERROR));
    } else if(getTodayHotPostResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYNEW_GET_NOTHING))
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_TODAYNEW_GET_SUCCESS, getTodayHotPostResult[0]));
    }
});

router.get('/search', async (req, res) => {
 let {title, contents} = req.query;


    let getBoardSearchQuery  = `SELECT p.idx AS 'post_idx', p.board_idx ,p.user_idx ,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url FROM post p WHERE`
    if(title) getBoardSearchQuery+= ` title LIKE '%${title}%'`;
    if(title && contents) getBoardSearchQuery+= ` OR`;
    if(contents) getBoardSearchQuery+= ` contents LIKE '%${contents}%',`;
    if(contents) getBoardSearchQuery = getBoardSearchQuery.slice(0, getBoardSearchQuery.length-1);
   
    
    const getBoardSearchResult = await db.queryParam_None(getBoardSearchQuery);

  
    if (!getBoardSearchResult) { 
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    } else if(getBoardSearchResult.length === 0){
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    }
    else { 
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.GET_BOARD_SEARCH_SUCCESS,getBoardSearchResult[0]));
    }
});

router.post('/:postIdx/like', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    let getLikeBoardQuery  = "SELECT * FROM `like` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    if(getLikeBoardResult[0].length != 0){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_LIKE_INSERT_ERROR));
    }else{

        
        const postLikeBoardQuery = "INSERT INTO `like` (user_idx,post_idx) VALUES(?, ?)";
        const postLikeBoardResult = await db.queryParam_Parse(postLikeBoardQuery, [req.decoded.user_idx,postIdx]);
       

            if (!postLikeBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_LIKE_INSERT_ERROR));
            }else if(postLikeBoardResult[0].length === 0){    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{

                let putPostLikeQuery  = "UPDATE post SET like_cnt = like_cnt + 1 WHERE idx = ?";
                const putPostLikeResult = await db.queryParam_Parse(putPostLikeQuery, [postIdx]);

                if(!putPostLikeResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_LIKE_INSERT_SUCCESS));
                }
                
            }

    }

});

router.delete('/:postIdx/unlike', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    let getLikeBoardQuery  = "SELECT * FROM `like` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    if(getLikeBoardResult[0].length != 0){
        const postUnlikeBoardQuery = "DELETE FROM `like` WHERE  user_idx = ? AND post_idx = ?";
        const postUnlikeBoardResult = await db.queryParam_Parse(postUnlikeBoardQuery, [req.decoded.user_idx,postIdx]);
        
            if (!postUnlikeBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_LIKE_DELETE_ERROR));
            }else if(postUnlikeBoardResult[0].length === 0){    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{

                let putPostUnlikeQuery  = "UPDATE post SET like_cnt = like_cnt - 1 WHERE idx = ?";
                const putPostUnlikeResult = await db.queryParam_Parse(putPostUnlikeQuery, [postIdx]);

                if(!putPostUnlikeResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_LIKE_DELETE_SUCCESS));
                }
                
            }

    }else{
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_LIKE_DELETE_ERROR));

    }

});

router.post('/:postIdx/hate', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    let getHateBoardQuery  = "SELECT * FROM `hate` WHERE post_idx = ? AND user_idx = ?";
    const getHateBoardResult = await db.queryParam_Parse(getHateBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    if(getHateBoardResult[0].length != 0){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_HATE_INSERT_ERROR));
    }else{
        const postHateBoardQuery = "INSERT INTO `hate` (user_idx,post_idx) VALUES(?, ?)";
        const postHateBoardResult = await db.queryParam_Parse(postHateBoardQuery, [req.decoded.user_idx,postIdx]);
        
    
            if (!postHateBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_HATE_INSERT_ERROR));
            }else if(postHateBoardResult[0].length === 0){    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
                let putPostHateQuery  = "UPDATE post SET hate_cnt = hate_cnt + 1 WHERE idx = ?";
                const putPostHateResult = await db.queryParam_Parse(putPostHateQuery, [postIdx]);

                if(!putPostHateResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_HATE_INSERT_SUCCESS));
                }
                
            }

    }

});

router.delete('/:postIdx/unhate', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    let getLikeBoardQuery  = "SELECT * FROM `hate` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;
    if(getLikeBoardResult[0].length != 0){
        const postUnlikeBoardQuery = "DELETE FROM `hate` WHERE  user_idx = ? AND post_idx = ?";
        const postUnlikeBoardResult = await db.queryParam_Parse(postUnlikeBoardQuery, [req.decoded.user_idx,postIdx]);
   
            if (!postUnlikeBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_HATE_DELETE_ERROR));
            }else if(postUnlikeBoardResult[0].length === 0){
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
                let putPostUnlikeQuery  = "UPDATE post SET hate_cnt = hate_cnt - 1 WHERE idx = ?";
                const putPostUnlikeResult = await db.queryParam_Parse(putPostUnlikeQuery, [postIdx]);

                if(!putPostUnlikeResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_HATE_DELETE_SUCCESS));
                }
                
            }

    }else{
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_HATE_DELETE_ERROR));
    }

});

router.post('/', authUtil.isLoggedin, upload.array('imgs'), async (req, res) => {
    const {boardIdx,title,contents,is_anonymous} = req.body;
    const userIdx = req.decoded.user_idx;
    const imgUrl = req.files;
    let video_cnt = 0;
    let image_cnt = 0;
    if(!title || !contents || !boardIdx){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }


    let thumbnail_url = 'https://meme2367.s3.ap-northeast-2.amazonaws.com/1562469662156.png';
    for (let i = 0; i < imgUrl.length; i++) {

        let mimeType = '';
        
        switch (imgUrl[i].mimetype) {
          case "image/jpeg":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/png":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/gif":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/bmp":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/jpg":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "video/webm":
            mimeType = "VIDEO";
            video_cnt += 1;
          break;
          case "video/ogg":
            mimeType = "VIDEO";
            video_cnt += 1;
          break;
          default:
            break;
        }

        if(video_cnt === 1){
            break;
        }else if(image_cnt === 1){
            thumbnail_url =imgUrl[i].location;

        }
    }

    let postPostQuery = "INSERT INTO post(board_idx, user_idx, title, contents,is_anonymous,image_cnt,video_cnt,thumbnail_url) VALUES(?,?, ?, ?,?,?,?,?)";
    let postPostResult  = await db.queryParam_Parse(postPostQuery, [boardIdx,userIdx,title,contents,is_anonymous,image_cnt,video_cnt,thumbnail_url]);

    let post_idx = postPostResult[0].insertId;

     for (let i = 0; i < imgUrl.length; i++) {

        let mimeType = '';
        switch (imgUrl[i].mimetype) {
          case "image/jpeg":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/png":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/gif":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/bmp":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "image/jpg":
            mimeType = "IMAGE";
            image_cnt += 1;
          break;
          case "video/webm":
            mimeType = "VIDEO";
            video_cnt += 1;
          break;
          case "video/ogg":
            mimeType = "VIDEO";
            video_cnt += 1;
          break;
          default:
            break;
        }
        let postPostimgQuery = "INSERT INTO post_media(post_idx,type,media_url) VALUES(?,?,?)";
        postPostimgResult = await db.queryParam_Parse(postPostimgQuery,[post_idx,"IMAGE",imgUrl[0].location]);
    }

        if ( postPostResult[0].length === 0 || !postPostResult) { //쿼리문이 실패했을 때
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_POST_IMAGE_ERROR));
        } else if(!postPostResult[0].insertId){
            
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_POST_IMAGE_ERROR));
        }else{ 
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_POST_IMAGE_SUCCESS));
        }

});

router.put('/:postIdx', authUtil.isLoggedin, upload.array('imgs'),async(req, res) => {
    const postIdx = req.params.postIdx;

    let title = "";
    let contents = "";
    let media_url = "";
    if(req.body.title) title+= req.body.title;
    if(req.body.contents) contents+= req.body.contents;
    if(req.file.location) media_url+= req.body.media_url;

    if(!title || !contents || !media_url){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    let putPostQuery =  "UPDATE  post  SET";
    if(title)  putPostQuery+= ` title = '${title}',`;        
    if(contents) putPostQuery+= `  contents = '${contents}',`;
    putPostQuery = putPostQuery.slice(0, putPostQuery.length-1);
    putPostQuery += ` WHERE idx = '${postIdx}'`;
    
    let putPostResult = await db.queryParam_None(putPostQuery);
    if (!putPostResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_UPDATE_ERROR));
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_UPDATE_SUCCESS));
    }

});

router.put('/image/:postIdx',upload.single('imgs'),async(req, res) => {
    const postIdx = req.params.postIdx;
    const imgUrl = req.file.location;
   
    if(!imgUrl){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    let putPostimgQuery =  `UPDATE post SET thumbnail_url = ? WHERE idx = ?`;    
    let putPostimgResult = await db.queryParam_Parse(putPostimgQuery,[imgUrl,postIdx]);
    if (!putPostimgResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_UPDATE_ERROR));
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_UPDATE_SUCCESS));
    }

});

router.delete('/:postIdx', authUtil.isLoggedin,  async(req, res) => {
    const postIdx = req.params.postIdx;


    const deletePostMediaQuery = "DELETE FROM post_media WHERE post_idx = ?";
    const deletePostMediaResult = await db.queryParam_Parse(deletePostMediaQuery, [postIdx]);

   if (!deletePostMediaResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_DELETE_ERROR));
    } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_DELETE_SUCCESS));
    }
    
    const deletePostQuery = "DELETE FROM post WHERE idx = ?";
    const deletePostResult = await db.queryParam_Parse(deletePostQuery, [postIdx]);

   if (!deletePostResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_DELETE_ERROR));
    } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_DELETE_SUCCESS));
    }
});




module.exports = router;

