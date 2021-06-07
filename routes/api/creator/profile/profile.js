var express = require('express');
var router = express.Router();

const upload = require('../../../../config/multer');
const defaultRes = require('../../../../module/utils/utils');
const statusCode = require('../../../../module/utils/statusCode');
const resMessage = require('../../../../module/utils/responseMessage');
const db = require('../../../../module/utils/pool');
const authUtil = require('../../../../module/utils/authUtils');
const moment = require('moment');
const jwtUtil = require('../../../../module/utils/jwt');

const fs = require('fs');

const csv = require('csv-parser');


router.get('/video/crawl', async(req, res) => {


    let resultData;
    try {
        let getPostByHotQuery= `SELECT channel_id FROM crecre.creator ORDER BY youtube_subscriber_cnt DESC`;  
        const getPostByHotResult = await db.queryParam_None(getPostByHotQuery);
        
    if (!getPostByHotResult) {
        console.log("popular webtoon file save error");
    } else {
        const ans = JSON.parse(JSON.stringify(getPostByHotResult[0]));
        const ansss = [];

        for(var i = 0;i<ans.length;i++){
            ansss[i] = ans[i].channel_id;
        }
        try {
            fs.writeFileSync('channelCsv.csv', JSON.stringify(ansss), 'UTF-8');
        } catch (resultError) {
            console.log(resultError);
        }
    }
        resultData = JSON.parse(fs.readFileSync('channelCsv.csv', 'UTF-8'));
     
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,resultData));
    } catch (readFileSysError) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    }

});


router.post('/video/crawlHotinput', async(req, res) => {
      var dataArray= fs.readFileSync('hotoutput.csv', 'utf8').toString().split("\n");
  
    for(var i = 0;i<dataArray.length;i++){
        strArray = dataArray[i].split(',');

        let getChannel_id = strArray[0] || null;
        let getTitle  = strArray[1] || null;
        let getVideoLink = strArray[2] || null;
        let getTime = strArray[3] || null;
        let getViewCnt = strArray[4] || null;
        let getThumbnailImg  = strArray[5] || null;
        
        if(!getChannel_id || !getTitle || !getVideoLink){
            continue;
        }else{
            const getCreatorIdxQuery= `SELECT idx FROM creator where channel_id=?`;  
            var getCreatorIdxResult  = await db.queryParam_Parse(getCreatorIdxQuery,[strArray[0]]);
        
            if(!getCreatorIdxResult || getCreatorIdxResult.length == 0){
                console.log("creator_idx");
                console.log(getCreatorIdxResult);
            }else{
                var creator_idx = JSON.parse(JSON.stringify(getCreatorIdxResult[0][0])).idx;

                const params = [creator_idx,getTitle,getVideoLink,getViewCnt,getThumbnailImg,getTime];
                const insertCreatorHotVideoQuery = "INSERT INTO video(creator_idx, title, video_url, view_cnt, thumbnail_url, create_time,if_hot,if_new,insert_time)\
                VALUES(?,?,?,?,?,?,1,0, now())";
                var insertCreatorHotVideoResult = db.queryParam_Parse(insertCreatorHotVideoQuery, params)
                 .then((result,reject)=>{
                    console.log('then');
                    console.log(result);
                })
                .catch(err=>{
                    console.log(err);
                });
            }
        }
        }
});


router.post('/video/crawlNewinput', async(req, res) => {

    var dataArray= fs.readFileSync('newoutput.csv', 'utf8').toString().split("\n");
    
    for(var i = 0;i<dataArray.length;i++){
        strArray = dataArray[i].split(',');

        let getChannel_id = strArray[0] || null;
        let getTitle  = strArray[1] || null;
        let getVideoLink = strArray[2] || null;
        let getTime = strArray[3] || null;
        let getViewCnt = strArray[4] || null;
        let getThumbnailImg  = strArray[5] || null;

        if(!getChannel_id || !getTitle || !getVideoLink){
            continue;
        }else{
            const getCreatorIdxQuery= `SELECT idx FROM creator where channel_id=?`;  
            var getCreatorIdxResult  = await db.queryParam_Parse(getCreatorIdxQuery,[strArray[0]]);
               

            if(!getCreatorIdxResult || getCreatorIdxResult.length == 0){
                console.log("creator_idx");
                console.log(getCreatorIdxResult);
            }else{
                var creator_idx = JSON.parse(JSON.stringify(getCreatorIdxResult[0][0])).idx;
                console.log(creator_idx);//4659
                const params = [creator_idx,getTitle,getVideoLink,getViewCnt,getThumbnailImg,getTime];
                const insertCreatorNewVideoQuery = "INSERT INTO video(creator_idx, title, video_url, view_cnt, thumbnail_url, create_time,if_hot,if_new,insert_time)\
                VALUES(?,?,?,?,?,?,0,1,now())";
                var insertCreatorNewVideoResult = db.queryParam_Parse(insertCreatorNewVideoQuery, params)
                 .then((result,reject)=>{
                    console.log('then');
                    console.log(result);
                })
                .catch(err=>{
                    console.log(err);
                });

            }
        }

        
        }

});


router.get('/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;


    const getCreatorProfileQuery = `SELECT c.idx AS 'creator_idx',c.view_grade_idx,c.follower_grade_idx,c.profile_url,c.name AS'creator_name',c.youtube_subscriber_cnt,
c.youtube_view_cnt,c.follower_cnt,c.contents,c.channel_id,date_format(c.create_time,'%Y-%m-%d %h:%i') AS 'creator_create_time',
ca.name AS 'category_name',ca.idx AS 'category_idx', 
vg.name AS 'view_grade_name',vg.img_url AS 'view_grade_img_url',vg.view_cnt AS 'view_grade_view_cnt',vg.profile_asset AS 'profile_asset',
fg.name AS 'follower_grade_name',fg.level AS 'follower_grade_level',fg.img_url AS 'follower_grade_img_url',fg.follower_cnt AS 'follower_grade_follower_cnt',
b.idx AS 'board_idx' ,b.name AS 'board_name',b.type AS 'board_type'
    FROM creator c 
    INNER JOIN view_grade vg ON vg.idx = c.view_grade_idx 
    INNER JOIN follower_grade fg ON fg.idx = c.follower_grade_idx 
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx 
    INNER JOIN category ca ON ca.idx = cc.category_idx 
    LEFT OUTER JOIN board b ON b.creator_idx = c.idx
    WHERE c.idx = ?`;
    const getCreatorProfileResult = await db.queryParam_Parse(getCreatorProfileQuery, [creatorIdx]);

    
    let flev = 0;
    if (!getCreatorProfileResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_ERROR));
    } else if(getCreatorProfileResult[0].length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_NOTHING));
    }
    else{
        
        const result = JSON.parse(JSON.stringify(getCreatorProfileResult[0][0]));

    const category_json = JSON.parse(JSON.stringify(getCreatorProfileResult));
    const categoryIdx = category_json[0][0].category_idx;
    const youtube_subscriber_cnt = category_json[0][0].youtube_subscriber_cnt;


    const follower_cnt = category_json[0][0].follower_grade_follower_cnt;
    const follower_grade_idx = category_json[0][0].follower_grade_idx;
    const follower_grade_level = category_json[0][0].follower_grade_level;
    const follower_grade_name = category_json[0][0].follower_grade_name;

    const youtube_view_cnt = category_json[0][0].youtube_view_cnt;
    const view_grade_name = category_json[0][0].view_grade_name;

        switch (follower_grade_name){
        case  "브론즈":
        flev = (youtube_subscriber_cnt - follower_cnt)/200*100;
            result["back_lank_exp"] = follower_cnt+99;
            break;
        case "실버" :
            result["back_lank_exp"] = follower_cnt+999;
            flev = (youtube_subscriber_cnt - follower_cnt)/2000*100;
            break;
        case "골드":
        flev = (youtube_subscriber_cnt - follower_cnt)/20000*100;
            result["back_lank_exp"] = follower_cnt+9999;
            break;
        case "플레티넘":
            result["back_lank_exp"] = follower_cnt+99999;
            flev = (youtube_subscriber_cnt - follower_cnt)/200000*100;
            break;
        case "다이아" :
            result["back_lank_exp"] = follower_cnt+999999;
             flev = (youtube_subscriber_cnt - follower_cnt)/2000000*100;
            break;
        case "마스터":
            flev = 0;
            result["back_lank_exp"] = 0;
        
    }


    let flex = 0;
    switch (view_grade_name){
        case  "F":
            flex = youtube_view_cnt/100000*100;
            result["back_lank2_exp"] = 100000;
            break;
        case "D" :
            flex = youtube_view_cnt/900000*100;
            result["back_lank2_exp"] = 1000000;
            break;
        case "C":
            flex = youtube_view_cnt/9000000*100;
            result["back_lank2_exp"] = 10000000;
            break;
        case "B":
            flex = youtube_view_cnt/90000000*100;
            result["back_lank2_exp"] = 10000000;
            break;

        case "A":
            flex = youtube_view_cnt/900000000*100;
            result["back_lank2_exp"] = 100000000;
            break;
        case "S":
            flex = 0;
            result["back_lank2_exp"] = 0;
           
    }

            if(follower_grade_level  === 1){
                flev = flev*2;
            }

            result["front_lank_exp"]=youtube_subscriber_cnt;
            result["front_lank2_exp"]=youtube_view_cnt;
            result["follower_grade_percent"]= parseInt(flev);
            
            result["view_grade_percent"]=parseInt(flex);
    const getCreatorsQuery=`SELECT cc.creator_idx ,c.*
    FROM creator_category cc 
    INNER JOIN creator c ON c.idx = cc.creator_idx 
    WHERE cc.category_idx = ?
    ORDER BY c.youtube_subscriber_cnt DESC`;

    const getCreatorsResult = await db.queryParam_Parse(getCreatorsQuery,categoryIdx);
    const creators_json = JSON.parse(JSON.stringify(getCreatorsResult));


    if(!getCreatorsResult){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_ERROR));
    }else{

    let cnt = 0;
   let cre = '';
        getCreatorsResult[0].forEach((creator)=>{
            cre = JSON.parse(JSON.stringify(creator));
            cree = cre.creator_idx;
            cnt += 1;
            if(creator.creator_idx == creatorIdx){
                const ans = cnt;//2
                result["category_lank"]= ans;


            }
        });

    const insertCreatorTimeQuery = `INSERT INTO creator_search(creator_idx,search_time ) VALUES(?,?)`; 
    const insertCreatorTimeResult = await db.queryParam_Parse(insertCreatorTimeQuery,[creatorIdx,moment().format("YYYY-MM-DD HH:mm")]);

    if(!insertCreatorTimeResult){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_ERROR));
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_SELECT_PROFILE_SUCCESS, result));
    }

    }
    }
});



router.get('/stat/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;

    const getCreatorStatQuery = `SELECT AVG(cs.score) AS 'stat_score',s.name , s.idx AS 'stat_idx'
FROM creator_stat cs
INNER JOIN stat s ON s.idx = cs.stat_idx
WHERE cs.creator_idx = ?
GROUP BY cs.stat_idx`;
    const getCreatorStatResult = await db.queryParam_Parse(getCreatorStatQuery, [creatorIdx]);

    const result = JSON.parse(JSON.stringify(getCreatorStatResult[0]));



    if (!getCreatorStatResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_STAT_ERROR));
    } else {

        const getCreatorStatAvgQuery = `SELECT AVG(cs.score) AS 'avg_stat',
        COUNT(cs.score) AS 'join_cnt_stat'
FROM creator_stat cs
INNER JOIN stat s ON s.idx = cs.stat_idx
WHERE cs.creator_idx = ?`;

        const getCreatorStatAvgResult = await db.queryParam_Parse(getCreatorStatAvgQuery, [creatorIdx]);
        const avg_json = JSON.parse(JSON.stringify(getCreatorStatAvgResult));


    if (!getCreatorStatAvgResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_STAT_ERROR));
    } else {
        const avg = JSON.parse(JSON.stringify(getCreatorStatAvgResult[0]));
        result.push(avg[0]);
    }

        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_SELECT_STAT_SUCCESS, result));
    }
});

router.get('/stat/detail/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;

    let getStatDetailQuery  = `SELECT DISTINCT s.*
FROM creator_stat cs
INNER JOIN stat s ON s.idx = cs.stat_idx
WHERE cs.creator_idx = ?`;
    
    const getStatDetailResult = await db.queryParam_Parse(getStatDetailQuery,[creatorIdx]);

    if (!getStatDetailResult) { 
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_STAT_DETAIL_ERROR));
    } else if(getStatDetailResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_STAT_DETAIL_ERROR));
    }else{ 
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_SELECT_STAT_DETAIL_SUCCESS,getStatDetailResult[0]));
    }
});

router.post('/stat/detail/:creatorIdx', authUtil.isLoggedin, async(req, res) => {
    
    let statIdx = [];
    let score = [];
    statIdx[0] = req.body.statIdx1;
    statIdx[1] = req.body.statIdx2;
    statIdx[2]= req.body.statIdx3;
    statIdx[3] = req.body.statIdx4;
    statIdx[4]= req.body.statIdx5;

    const creatorIdx = parseInt(req.params.creatorIdx);
    const userIdx = req.decoded.user_idx;
    
    score[0] = parseFloat(req.body.score1);
    score[1] = parseFloat(req.body.score2);
    score[2]= parseFloat(req.body.score3);
    score[3] = parseFloat(req.body.score4);
    score[4]= parseFloat(req.body.score5);



    if (!score[1] || !score[2] || !score[3] || !score[4] || !score[0] || !statIdx[1] || !statIdx[2] || !statIdx[3] || !statIdx[4] || !statIdx[0] || !userIdx || !creatorIdx) {
        return res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    console.log(userIdx,creatorIdx,score[1],score[2],score[3],score[4],score[0],statIdx[1],statIdx[2],statIdx[3],statIdx[4],statIdx[0]);
    
    let insertStatResult = [];
    for(var i = 0;i<5;i++){
        const insertStatQuery = "INSERT INTO creator_stat(stat_idx, creator_idx, user_idx,score) VALUES(?, ?, ?,?)";
        insertStatResult[i] = await db.queryParam_Parse(insertStatQuery, [statIdx[i],creatorIdx,userIdx,score[i]]);
        };


    if (!insertStatResult[0] ||!insertStatResult[1] || !insertStatResult[2] || !insertStatResult[3] || !insertStatResult[4]) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.STAT_INSERT_ERROR));
        } else {
                res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.STAT_INSERT_SUCCESS));
    }
    });


  
router.post('/stat/hashtag/:creatorIdx', authUtil.isLoggedin, async(req, res) => {
    

    const creatorIdx = parseInt(req.params.creatorIdx);
    const userIdx = req.decoded.user_idx;
    const hashtagName = req.body.hashtagName;

    const gethashtagQuery = "SELECT idx FROM hashtag WHERE name = ?";
    const gethashtagResult = await db.queryParam_Parse(gethashtagQuery, [hashtagName]);

    
    if(gethashtagResult[0][0]){
        let hashtagIdx_json = JSON.parse(JSON.stringify(gethashtagResult));
        hashtagIdx = hashtagIdx_json[0][0].idx || null;
    }else{
        hashtagIdx = null;
    }
        

     if(!hashtagIdx || !gethashtagResult[0][0]){

        const insertHashtagQuery = "INSERT INTO hashtag(name) VALUES(?)";
        const insertHashtagResult = await db.queryParam_Parse(insertHashtagQuery,[hashtagName]);

        if(insertHashtagResult[0].insertId < 1)
        {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.STAT_HASHTAG_INSERT_ERROR));
        }
        else{
            const insertCreatorHashtagQuery = "INSERT INTO creator_hashtag(creator_idx, hashtag_idx) VALUES(?, ?)";
            const insertCreatorHashtagResult = await db.queryParam_Parse(insertCreatorHashtagQuery,[creatorIdx,insertHashtagResult[0].insertId]);

         
            if(!insertCreatorHashtagResult)
            {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.STAT_HASHTAG_INSERT_ERROR));
            }
            else{
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.STAT_HASHTAG_INSERT_SUCCESS));
            }


        }
            
    }else{
        const insertStatHashtagQuery = "INSERT INTO creator_hashtag(creator_idx, hashtag_idx) VALUES(?, ?)";
        const insertStatHashtagResult = await db.queryParam_Parse(insertStatHashtagQuery,[creatorIdx,hashtagIdx]);

        if(!insertStatHashtagResult)
        {
            return res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.STAT_HASHTAG_INSERT_ERROR));
        }
        else{

            return res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.STAT_HASHTAG_INSERT_SUCCESS));
        }

    }
    
});


module.exports = router;
