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

//게시판별 게시글 리스트 조회 okdk
//인기글은 HOT배너//좋아요수 기준
//썸네일(기본/게시글 속 사진), 제목, 등록유저,게시판이름,게시글 등록 시간    
//시간!!!!!!!!!
//cron보류
//3개 핫배너 붙는거

router.get('/listhot/:boardIdx', async (req, res) => {
 const boardIdx = req.params.boardIdx;
let getPosthotQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url
FROM post p
WHERE p.board_idx = ?
ORDER BY p.like_cnt DESC LIMIT 3`;//인기글 1로 나머지 다 0으로 / 시간 순서 최신순이 위에 
    const getPosthotResult = await db.queryParam_Parse(getPosthotQuery,boardIdx);
        
        console.log(getPosthotResult[0]);
        let anss = getPosthotResult[0];
        console.log("Aa");
        console.log(anss.length); 
        for(var i = 0;i<anss.length;i++){
            anss[i]["hot_image"] =1;    
        }
        

        console.log("kz");
        console.log(anss); 
    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPosthotResult ) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else if(getPosthotResult[0].length === 0 || anss.length === 0){
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,anss));
    }
    else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,anss));
    }
});

//나머지 최신글 API 2개로 나누기 
//
/*

SELECT * FROM post WHERE board_idx = 11 
AND idx NOT IN (45,47,46)
ORDER BY create_time DESC;
*/
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
    
    console.log(answer);//45,47,46//[]

    if(!getResult){

    }else{
        console.log("22");
        let getPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url FROM post p 
WHERE idx NOT IN (?)
AND p.board_idx = ? 
ORDER BY p.create_time DESC`;//인기글 1로 나머지 다 0으로 / 시간 순서 최신순이 위에 

    const getPostResult = await db.queryParam_Parse(getPostQuery,[answer,boardIdx]);

        //console.log("aass");    
       //console.log(getPostResult);//undefined
        //console.log(getPostResult[0].length);
    

   
        //쿼리문의 결과가 실패이면 null을 반환한다
        if (!getPostResult){
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,[]));
        }else if(getPostResult[0].length === 0) { //쿼리문이 실패했을 때
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_ERROR,[]));
        } else { //쿼리문이 성공했을 때
            let aaaa = getPostResult[0];
            for(var i = 0;i<aaaa.length;i++){
                aaaa[i]["hot_image"] =0;    
            }

             console.log("aaaa");
    console.log(aaaa);

            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,aaaa));
        }
    }



    
});


//게시글 상세 조회 다~ okdk
//게시글 미디오 한장만일때임
//
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
        console.log("userIdx1");
        console.log(userIdx);


    }else{
        userIdx = -1;

    }

            ans[0][0]["login_userIdx"] = userIdx;//id가     

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else if(!ans[0][0].post_idx){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_NOTHING));
    }
    else{ //쿼리문이 성공했을 때
        
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

            if(userIdx === -1){//토큰 없으면/is_liked = false 헤더가 없으면, 헤더가 잇으면 검사해서 true
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, ans[0]));

            }else{//userIdx검사

                /*SELECT *
FROM `like` l
WHERE l.user_idx = 12 AND post_idx = 43;

SELECT *
FROM `hate` h
WHERE h.user_idx = 12 AND post_idx = 43;*/

                const getUserLikeQuery = "SELECT * FROM `like` l WHERE l.user_idx = ? AND l.post_idx = ?";
                const getUserLikeResult = await db.queryParam_Parse(getUserLikeQuery,[userIdx,postIdx]);
                    
                console.log("###########");
                console.log(getUserLikeResult);
                        // TODO: 변경필요 . 쿼리 에러 안 나면 무조건 1뜸
                    if(!getUserLikeResult || getUserLikeResult[0].length===0){
                        ans[0][0]["is_like"] = 0;
                    }else{
                        ans[0][0]["is_like"] = 1;
                    }

                const getUserHateQuery = "SELECT * FROM `hate` h WHERE h.user_idx = ? AND h.post_idx = ?";
                const getUserHateResult = await db.queryParam_Parse(getUserHateQuery,[userIdx,postIdx]);


                        // TODO: 변경필요 . 쿼리 에러 안 나면 무조건 1뜸
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

//커뮤니티 창 작은 최신글 순 조회(게시판 상관없이 5개만)성공
//썸네일 추가해야함 okdk
router.get('/new', async (req, res) => { 
    const getPostByCreateTimeLimitQuery = `SELECT  p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.create_time ASC LIMIT 5`;

    /*
    SELECT  p.*,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.create_time ASC LIMIT 5
    */

    const  getPostByCreateTimeLimitResult = await db.queryParam_None(getPostByCreateTimeLimitQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostByCreateTimeLimitResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByCreateTimeLimitResult[0]));
    }
});


//커뮤니티 창 작은 인기글 순 조회(게시판 상관없이 5개만)성공 okdk
//제목추천수,댓글수,등록시간
//일주일 기준 cron !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


router.get('/hot', async (req, res) => { 
    let getPostByHotQuery= `SELECT  p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.like_cnt DESC LIMIT 5`;  


    
    const getPostByHotResult = await db.queryParam_None(getPostByHotQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostByHotResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByHotResult[0]));
    }
});

/*
router.get('/hot', async(req, res) => {

    let resultData;
    try {

        resultData = JSON.parse(fileSys.readFileSync('smallpopularResult.txt', 'UTF-8'));
     
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,resultData));
    } catch (readFileSysError) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    }

});



cron.schedule('0 0 12 * * *', async() => {
    let getPostByHotQuery= `SELECT  p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.like_cnt DESC LIMIT 5`;  

    const getPostByHotResult = await db.queryParam_None(getPostByHotQuery);

    if (!getPostByHotResult) {
        console.log("popular webtoon file save error");
    } else {
        try {
            fileSys.writeFileSync('smallpopularResult.txt', JSON.stringify(getPostByHotResult), 'UTF-8');
        } catch (resultError) {
            console.log(resultError);
        }
    }
});

*/
//전체 인기글 순 조회 성공(게시판 상관없이) Okdk
//제목,이름,게시판,썸네일,시간(int) 
//년,월,일,시간(초빼고
//일주일 기준 cron !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!일주일 사이 글에서만 
/*
SELECT p.idx,p.board_idx,p.user_idx,p.title,p.contents,date_format(p.create_time,'%Y-%m-%d %h:%i'),date_format(p.update_time,'%Y-%m-%d %h:%i'),b.*,u.name
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC
*/

router.get('/allhot', async (req, res) => { 
    let getPostByCreateTimeQuery = `SELECT p.idx AS 'post_idx', p.board_idx,b.name AS 'board_name',p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,u.name AS 'user_name',(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC`;


/*
SELECT  p.*,b.*,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx) 
    GROUP BY p.idx
    ORDER BY p.create_time ASC LIMIT 5


    const ans = JSON.parse(JSON.stringify(getResult[0]));
        console.log("getResult");
        console.log(ans.length);//3
    console.log(ans[0].idx); //45
    let answer = [];   
    for(var i = 0;i<ans.length;i++){
        answer[i] = ans[i].idx;
    }
    
    console.log(answer);//45,47,46

*/

    const getPostByCreateTimeResult = await db.queryParam_None(getPostByCreateTimeQuery);
    console.log("aaa");
//c    console.log(getPostByCreateTimeResult);

    console.log(getPostByCreateTimeResult[0]);

    const answer = JSON.parse(JSON.stringify(getPostByCreateTimeResult[0]));

    for(var i = 0;i<answer.length;i++){
        answer[i]["hot_image"] = 1;
    }


    console.log("asdfadf");
    console.log(answer);




    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostByCreateTimeResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,answer));
    }
});


//전체 최신글 순 조회(성공)(게시판 상관없이) okdk
//제목,이름,게시판,썸네일,시간(int)
//년,월,일,시간(초빼고)
router.get('/allnew', async (req, res) => { 
    let getPostByCreateTimeQuery = `SELECT p.idx AS 'post_idx', p.board_idx,b.name AS 'board_name',p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,u.name AS 'user_name',(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.create_time DESC`;

    /*
    SELECT p.*,b.*,u.name,(SELECT COUNT(r.idx) FROM reply r WHERE r.post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC*/

    const getPostByCreateTimeResult = await db.queryParam_None(getPostByCreateTimeQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostByCreateTimeResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS, getPostByCreateTimeResult[0]));
    }
});


//첫화면 오늘 뜨는 인기글 조회(3개)성공
//썸네일 
//정각 기준으로 작성한 글에서 추천수 많은 수로 인기글 순위 매김.  오늘 뜨는 인기글에서 더보기 누르면 인기글로 넘어감.
//좋아요수많은 거
//OKDK

router.get('/todayhot', async (req, res) => {

    let getTodayHotPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,u.name
, (SELECT COUNT(*) FROM reply WhERE post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    GROUP BY p.idx ORDER BY p.like_cnt DESC
    LIMIT 3`;
    //WHERE p.create_time >= CURDATE() 

    let getTodayHotPostResult = await db.queryParam_None(getTodayHotPostQuery);
    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getTodayHotPostResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYHOT_GET_ERROR));
    } else if(getTodayHotPostResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYHOT_GET_NOTHING))
    }else{ //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_TODAYHOT_GET_SUCCESS, getTodayHotPostResult[0]));
    }
});

//첫화면 방금 막 올라온 최신글 조회(3개)성공 OKDK
router.get('/todaynew', async (req, res) => {

    let getTodayHotPostQuery  = `SELECT p.idx AS 'post_idx', p.board_idx,p.user_idx,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url,b.*,u.name
, (SELECT COUNT(*) FROM reply WhERE post_idx = p.idx) AS reply_cnt
    FROM ( post p INNER JOIN board b ON b.idx = p.board_idx)
    INNER JOIN user u ON u.idx = p.user_idx
    ORDER BY p.create_time DESC
    LIMIT 3`;
    // WHERE p.create_time >= CURDATE() 
    let getTodayHotPostResult = await db.queryParam_None(getTodayHotPostQuery);
    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getTodayHotPostResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYNEW_GET_ERROR));
    } else if(getTodayHotPostResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_TODAYNEW_GET_NOTHING))
    }else{ //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_TODAYNEW_GET_SUCCESS, getTodayHotPostResult[0]));
    }
});




//게시글 내용,제목 검색 okdk
//localhost:3000/api/posts/search?title=free&contents=category
router.get('/search', async (req, res) => {
 let {title, contents} = req.query;

    console.log(title,contents);



    let getBoardSearchQuery  = `SELECT p.idx AS 'post_idx', p.board_idx ,p.user_idx ,p.title,p.contents,
date_format(p.create_time,'%Y-%m-%d %h:%i') AS 'create_time', date_format(p.update_time,'%Y-%m-%d %h:%i') AS 'update_time',
p.view_cnt,p.like_cnt,p.hate_cnt,p.is_anonymous,p.image_cnt,p.video_cnt,p.thumbnail_url FROM post p WHERE`
    if(title) getBoardSearchQuery+= ` title LIKE '%${title}%'`;
    if(title && contents) getBoardSearchQuery+= ` OR`;
    if(contents) getBoardSearchQuery+= ` contents LIKE '%${contents}%',`;
    if(contents) getBoardSearchQuery = getBoardSearchQuery.slice(0, getBoardSearchQuery.length-1);
   
   
    console.log("aaaa");
    console.log(getBoardSearchQuery);


    
    const getBoardSearchResult = await db.queryParam_None(getBoardSearchQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getBoardSearchResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    } else if(getBoardSearchResult.length === 0){
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    }
    else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.GET_BOARD_SEARCH_SUCCESS,getBoardSearchResult[0]));
    }
});


//토큰 :eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZHgiOjEsImdyYWRlIjoiQURNSU4iLCJuYW1lIjoi66qF64uk7JewIiwiaWF0IjoxNTYyMDU0NTI0LCJleHAiOjE1NjMyNjQxMjQsImlzcyI6InlhbmcifQ.MccUElA8iA4HRcz4IN4mBIxpqoa9i6PUyPbv2aTwT8w

//'/:boardIdx'
//게시글 좋아요 okdk
router.post('/:postIdx/like', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    
    // just check the
    let getLikeBoardQuery  = "SELECT * FROM `like` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    console.log("aa");
    console.log(getLikeBoardResult[0].length);//0
    console.log("bb");
    console.log(getLikeBoardResult[0]);

    if(getLikeBoardResult[0].length != 0){//이미 즐겨찾기한 상태 -> 걍 놔둠
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_LIKE_INSERT_ERROR));
    }else{//즐겨찾기 안함 -> like, post

        
        const postLikeBoardQuery = "INSERT INTO `like` (user_idx,post_idx) VALUES(?, ?)";
        const postLikeBoardResult = await db.queryParam_Parse(postLikeBoardQuery, [req.decoded.user_idx,postIdx]);
        
        console.log("cc");
        console.log(postLikeBoardResult);


            if (!postLikeBoardResult) {
//error
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_LIKE_INSERT_ERROR));
            }else if(postLikeBoardResult[0].length === 0){
            //error    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
            //update

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


//게시글 좋아요 취소

//okdk
router.delete('/:postIdx/unlike', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    
    // just check the
    let getLikeBoardQuery  = "SELECT * FROM `like` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    console.log("aa");
    console.log(getLikeBoardResult[0].length);//0
    console.log("bb");
    console.log(getLikeBoardResult[0]);

    if(getLikeBoardResult[0].length != 0){//이미 즐겨찾기한 상태 -> update post / delete like


        const postUnlikeBoardQuery = "DELETE FROM `like` WHERE  user_idx = ? AND post_idx = ?";
        const postUnlikeBoardResult = await db.queryParam_Parse(postUnlikeBoardQuery, [req.decoded.user_idx,postIdx]);
        
        console.log("cc");
        console.log(postUnlikeBoardResult);


            if (!postUnlikeBoardResult) {
//error
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_LIKE_DELETE_ERROR));
            }else if(postUnlikeBoardResult[0].length === 0){
            //error    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
            //update

                let putPostUnlikeQuery  = "UPDATE post SET like_cnt = like_cnt - 1 WHERE idx = ?";
                const putPostUnlikeResult = await db.queryParam_Parse(putPostUnlikeQuery, [postIdx]);

                if(!putPostUnlikeResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_LIKE_DELETE_SUCCESS));
                }
                
            }


            


    }else{//즐겨찾기 안함 -> like, post
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_LIKE_DELETE_ERROR));

    }

});
//게시글 싫어요 
router.post('/:postIdx/hate', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    
    // just check the
    let getHateBoardQuery  = "SELECT * FROM `hate` WHERE post_idx = ? AND user_idx = ?";
    const getHateBoardResult = await db.queryParam_Parse(getHateBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    console.log("aa");
    console.log(getHateBoardResult[0].length);//0
    console.log("bb");
    console.log(getHateBoardResult[0]);

    if(getHateBoardResult[0].length != 0){//이미 즐겨찾기한 상태 -> 걍 놔둠
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_HATE_INSERT_ERROR));
    }else{//즐겨찾기 안함 -> like, post

        
        const postHateBoardQuery = "INSERT INTO `hate` (user_idx,post_idx) VALUES(?, ?)";
        const postHateBoardResult = await db.queryParam_Parse(postHateBoardQuery, [req.decoded.user_idx,postIdx]);
        
        console.log("cc");
        console.log(postHateBoardResult);


            if (!postHateBoardResult) {
//error
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_HATE_INSERT_ERROR));
            }else if(postHateBoardResult[0].length === 0){
            //error    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
            //update

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


//게시글 싫어요  취소
//okdk
router.delete('/:postIdx/unhate', authUtil.isLoggedin,  async(req, res) => {
    let postIdx = req.params.postIdx;
    
    
    // just check the
    let getLikeBoardQuery  = "SELECT * FROM `hate` WHERE post_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [postIdx,req.decoded.user_idx]) || null;

    console.log("aa");
    console.log(getLikeBoardResult[0].length);//0
    console.log("bb");
    console.log(getLikeBoardResult[0]);

    if(getLikeBoardResult[0].length != 0){//이미 즐겨찾기한 상태 -> update post / delete like


        const postUnlikeBoardQuery = "DELETE FROM `hate` WHERE  user_idx = ? AND post_idx = ?";
        const postUnlikeBoardResult = await db.queryParam_Parse(postUnlikeBoardQuery, [req.decoded.user_idx,postIdx]);
        
        console.log("cc");
        console.log(postUnlikeBoardResult);


            if (!postUnlikeBoardResult) {
//error
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_HATE_DELETE_ERROR));
            }else if(postUnlikeBoardResult[0].length === 0){
            //error    
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
            //update

                let putPostUnlikeQuery  = "UPDATE post SET hate_cnt = hate_cnt - 1 WHERE idx = ?";
                const putPostUnlikeResult = await db.queryParam_Parse(putPostUnlikeQuery, [postIdx]);

                if(!putPostUnlikeResult){
                    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));                    
                }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_HATE_DELETE_SUCCESS));
                }
                
            }


            


    }else{//즐겨찾기 안함 -> like, post
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.POST_HATE_DELETE_ERROR));

    }

});



// 게시글 생성 okdk

router.post('/', authUtil.isLoggedin, upload.array('imgs'), async (req, res) => {
    const {boardIdx,title,contents,is_anonymous} = req.body;
    const userIdx = req.decoded.user_idx;
    const imgUrl = req.files;
    let video_cnt = 0;
    let image_cnt = 0;
    // name, title, thumbnail 중 하나라도 없으면 에러 응답
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
            //기본 로고
            break;
        }else if(image_cnt === 1){
            thumbnail_url =imgUrl[i].location;
            console.log("Aa");
        }
    }

    console.log(boardIdx,title,contents,is_anonymous,video_cnt,image_cnt,thumbnail_url,userIdx);
    //게시글 db에 제목,내용 넣기
    let postPostQuery = "INSERT INTO post(board_idx, user_idx, title, contents,is_anonymous,image_cnt,video_cnt,thumbnail_url) VALUES(?,?, ?, ?,?,?,?,?)";
    let postPostResult  = await db.queryParam_Parse(postPostQuery, [boardIdx,userIdx,title,contents,is_anonymous,image_cnt,video_cnt,thumbnail_url]);

    console.log('#########');
    console.log(postPostResult);
    console.log('#########');

    

    //let post_idx = JSON.parse(JSON.stringify(postPostResult[0].insertId));
    let post_idx = postPostResult[0].insertId;
    console.log("post_idx");
   console.log(post_idx);

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
        //post_media에 각자 넣기
        let postPostimgQuery = "INSERT INTO post_media(post_idx,type,media_url) VALUES(?,?,?)";
        postPostimgResult = await db.queryParam_Parse(postPostimgQuery,[post_idx,"IMAGE",imgUrl[0].location]);
    }

        if ( postPostResult[0].length === 0 || !postPostResult) { //쿼리문이 실패했을 때
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_POST_IMAGE_ERROR));
        } else if(!postPostResult[0].insertId){
            
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_POST_IMAGE_ERROR));
        }else{ //쿼리문이 성공했을 때
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_POST_IMAGE_SUCCESS));
        }

});






// 게시글 수정
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
    //const imgUrl = req.files;
//imgUrl[i].location

    //본인이 올린 
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

    //이미지 수정기능 추가해야함!
});

//게시글 이미지 
router.put('/image/:postIdx',upload.single('imgs'),async(req, res) => {
    const postIdx = req.params.postIdx;
    const imgUrl = req.file.location;
    console.log(imgUrl);
//UPDATE `crecre`.`post` SET `thumbnail_url` = 'https://crecre.s3.ap-northeast-2.amazonaws.com/cls6.png' WHERE (`idx` = '43');

    
    if(!imgUrl){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    //const imgUrl = req.files;
//imgUrl[i].location

    //본인이 올린 
    let putPostimgQuery =  `UPDATE post SET thumbnail_url = ? WHERE idx = ?`;    
    let putPostimgResult = await db.queryParam_Parse(putPostimgQuery,[imgUrl,postIdx]);

    console.log("put");
    console.log(putPostimgResult);
    if (!putPostimgResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_UPDATE_ERROR));
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_UPDATE_SUCCESS));
    }

    //이미지 수정기능 추가해야함!
});




// 게시글 삭제
router.delete('/:postIdx', authUtil.isLoggedin,  async(req, res) => {
    const postIdx = req.params.postIdx;



    console.log(postIdx);

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

