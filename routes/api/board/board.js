
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
var urlencode = require('urlencode');
var querystring = require('querystring');
var url = require('url');
//meme2367 1234
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkeCI6MTIsImdyYWRlIjoiQURNSU4iLCJuYW1lIjoi66qF64uk7JewIiwiaWF0IjoxNTYyNDIzOTUyLCJleHAiOjE1NjM2MzM1NTIsImlzcyI6InlhbmcifQ.DbGROLSRyAm_NN1qcQ5sLmjxKpUACyMsFQRiDd2z3Lw
//전체 게시판 조회 okdk
router.get('/', async (req, res) => { 
    let getPostQuery  = "SELECT * FROM board";
    
    const getPostResult = await db.queryParam_None(getPostQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getPostResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_SELECT_SUCCESS,getPostResult[0]));
    }
});




//즐겨찾기한 게시판 조회 okdk

//즐겨찾기한 게시판 조회 okdk
router.get('/like', authUtil.isLoggedin, async (req, res) => {

    const userIdx = req.decoded.user_idx;
    console.log("ss");
    console.log(userIdx);

    let getLikeBoardQuery  = `SELECT b.idx, b.name,b.type FROM board b 
    INNER JOIN board_like bl ON bl.board_idx = b.idx 
    WHERE user_idx = ?`;
    
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery,[userIdx]);
    console.log("sss");
    console.log(getLikeBoardResult[0]);

    let ans = getLikeBoardResult[0];
    for(var i = 0;i<getLikeBoardResult[0].length;i++){
        ans[i]["is_love"]=1;
    }

    console.log("ans");
    console.log(ans);
    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getLikeBoardResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_LIKE_SELECT_ERROR));
    } else if(getLikeBoardResult.length === 0){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_LIKE_SELECT_ERROR));
    }else{ //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_LIKE_SELECT_SUCCESS,ans));
    }
});

//즐겨찾기 하지 않은 게시판 리스트 조회 okdk

router.get('/unlike', authUtil.isLoggedin,async (req, res) => {
    const userIdx = req.decoded.user_idx;
    console.log("unlikeboard\n");
    console.log(userIdx);
    //user없는 경우


    const getMembershipByIdQuery = 'SELECT * FROM user WHERE idx = ?';
    const getMembershipByIdResult = await db.queryParam_Parse(getMembershipByIdQuery, [userIdx]);

    if (!getMembershipByIdResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.MEMBERSHIP_SELECT_FAIL));
    } else if (getMembershipByIdResult[0].length === 0) {//없는 경우
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
    }else{

        let getLikeBoardQuery  = `SELECT bb.* FROM board bb 
        WHERE bb.idx NOT IN (SELECT b.idx FROM board b 
        INNER JOIN board_like bl ON bl.board_idx = b.idx 
        WHERE user_idx = ?);`;
        
        const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery,[userIdx]);

        //쿼리문의 결과가 실패이면 null을 반환한다
        if (!getLikeBoardResult) { //쿼리문이 실패했을 때
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_UNLIKE_SELECT_ERROR));
        } else if(getLikeBoardResult.length === 0){
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_UNLIKE_SELECT_ERROR));
        }else{ //쿼리문이 성공했을 때


            let anss = getLikeBoardResult[0];
            for(var i = 0;i<getLikeBoardResult[0].length;i++){
                anss[i]["is_love"]=0;
            }

            console.log("ans");
            console.log(anss);


            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_UNLIKE_SELECT_SUCCESS,anss));
        }
    }
});

//즐겨찾기 하지 않은 게시판 리스트 조회 - 로그인되지 않은 상태 okdk
router.get('/unlike/guest', async (req, res) => {
    let getLikeBoardQuery = `SELECT * FROM board ;`;

    const getLikeBoardResult = await db.queryParam_None(getLikeBoardQuery);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getLikeBoardResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_UNLIKE_SELECT_ERROR));
    } else if (getLikeBoardResult.length === 0) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_UNLIKE_SELECT_ERROR));
    } else { //쿼리문이 성공했을 때

        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_UNLIKE_SELECT_SUCCESS, getLikeBoardResult[0]));
    }
});

// 게시판 생성 okdk
router.post("/", authUtil.isAdmin, async(req, res)=>{
    const {name,type} = req.body;
    //저장 시 필수 값인 게시물Id와 제목(title)이 없으면 실패 response 전송

    if (!name && !type) {
        res.status(200).send(defaultRes.successTrue(statusCode.BAD_REQUEST, resMessage.NULL_VALUE));
    } else {

        try{
                const getBoardRequestQuery = `SELECT request_cnt FROM board_request WHERE name = ?`;
                const getBoardRequestResult  = await db.queryParam_Parse(getBoardRequestQuery,[name]) || null;
                
                console.log(getBoardRequestResult[0]);
                const request_cnt = JSON.parse(JSON.stringify(getBoardRequestResult[0])) || null;
                const req_cnt = request_cnt[0].request_cnt;
            

                 if(req_cnt >= 100){

                    const postBoardQuery = `INSERT INTO board(name, type) VALUES(?,?)`;
                    const postBoardResult  = await db.queryParam_Parse(postBoardQuery,[name,type]);
                    if(!getBoardRequestResult){
                        res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.POST_BOARD_ERROR));
                     } else if(getBoardRequestResult === 0){
                        res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.POST_BOARD_ERROR));
                    }else{
                        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_BOARD_SUCCESS));
                    }

                 }else{
                    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_BOARD_ERROR));
                }
            }catch(err){
                res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.POST_BOARD_ERROR));
            }
        }
});



// 게시판 수정 okdk
router.put('/:boardIdx', authUtil.isAdmin, async(req, res) => {
    const boardIdx = req.params.boardIdx;
    

    //name or type 하나만인경우도 추가하기!!
    let name = "";
    let type = "";
    if(req.body.name) name+= req.body.name;
    if(req.body.type) type+= req.body.type;

    if(!name || !type ){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    //본인이 올린 
    let putBoardQuery =  "UPDATE  board  SET";
    if(name)  putBoardQuery+= ` name = '${name}',`;        
    if(type) putBoardQuery+= `  type = '${type}',`;
    putBoardQuery = putBoardQuery.slice(0, putBoardQuery.length-1);
    putBoardQuery += ` WHERE idx = '${boardIdx}'`;
    
    console.log(putBoardQuery);
    let putBoardResult = await db.queryParam_None(putBoardQuery);
    if (!putBoardResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.POST_UPDATE_ERROR));
    }else{
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_UPDATE_SUCCESS));
    }
});


//게시판 삭제
router.delete('/:boardIdx', authUtil.isAdmin, async(req, res) => {
    const boardIdx = req.params.boardIdx;

    const deleteBoardQuery = "DELETE FROM board WHERE idx = ?";
    const deleteBoardResult = await db.queryParam_Parse(deleteBoardQuery, [boardIdx]);


    if (!deleteBoardResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_DELETE_ERROR));
    } else {
        if(deleteBoardResult.affectedRows > 0){
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_DELETE_SUCCESS));
        }else{
            res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.BOARD_DELETE_NOTHING));
        }
    }
});



//게시판 즐겨찾기 okdk
router.post('/:boardIdx/like', authUtil.isLoggedin,  async(req, res) => {
    const {boardIdx} = req.params;

    // just check the
    let getLikeBoardQuery  = "SELECT * FROM board_like WHERE board_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [boardIdx,req.decoded.user_idx]);


    if(!getLikeBoardResult){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.BOARD_LIKE_SELECT_ERROR));
    }else if(getLikeBoardResult[0].length != 0){//이미 즐겨찾기한 상태
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.BOARD_LIKE_INSERT_ERROR));
    }else if(getLikeBoardResult[0].length === 0){
        const postLikeBoardQuery = "INSERT INTO board_like(user_idx, board_idx) VALUES(?, ?)";
        const postLikeBoardResult = await db.queryParam_Parse(postLikeBoardQuery, [req.decoded.user_idx,boardIdx]);
        
            if (!postLikeBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_LIKE_INSERT_ERROR));
            }else if(postLikeBoardResult === 0){
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_LIKE_INSERT_SUCCESS));
            }

    }

});



//게시판 즐겨찾기 취소 OKDK
router.delete('/:boardIdx/unlike', authUtil.isLoggedin,  async(req, res) => {
    const {boardIdx} = req.params;

    // just check the
    let getLikeBoardQuery  = "SELECT * FROM board_like WHERE board_idx = ? AND user_idx = ?";
    const getLikeBoardResult = await db.queryParam_Parse(getLikeBoardQuery, [boardIdx,req.decoded.user_idx]);


    if(!getLikeBoardResult){
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.BOARD_LIKE_SELECT_ERROR));
    }else if(getLikeBoardResult[0].length === 0){//즐겨찾기 안함
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.BOARD_LIKE_DELETE_ERROR));
    }else if(getLikeBoardResult[0].length != 0){
        const deleteLikeBoardQuery = "DELETE FROM board_like WHERE user_idx = ? and board_idx = ?";
        const deleteLikeBoardResult = await db.queryParam_Parse(deleteLikeBoardQuery, [req.decoded.user_idx,boardIdx]);
       
            if (!deleteLikeBoardResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.BOARD_LIKE_DELETE_ERROR));
            }else if(deleteLikeBoardResult[0].affectedRows != 1){
                res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.USERINFO_SELECT_FAIL));
            }
            else{
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.BOARD_LIKE_DELETE_SUCCESS));
            }

    }

});


//크리에이터 팬 게시판 조회

//크리에이터 팬 게시판 조회
router.get('/creator/:creatorIdx', async (req, res) => {
 const {creatorIdx} =req.params;
//post글 board_idx  = board idx name -> 
    let getCreatorBoardQuery = `SELECT b.idx AS 'board_idx',b.name ,b.type,b.creator_idx
FROM board b 
INNER JOIN creator c ON c.idx = b.creator_idx 
WHERE b.type = 'creator' AND b.creator_idx = ?`;
    
    const getCreatorBoardResult = await db.queryParam_Parse(getCreatorBoardQuery,[creatorIdx]);
    console.log(getCreatorBoardResult[0].length);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getCreatorBoardResult) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_BOARD_SELECT_ERROR));
   } else if(getCreatorBoardResult[0].length === 0){
        res.status(200).send(defaultRes.successTrue(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_BOARD_SELECT_NOTHING,getCreatorBoardResult[0]));
    }else{ //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_BOARD_SELECT_SUCCESS,getCreatorBoardResult[0]));
    }
});



//게시판 검색  okdk
//localhost:3000/api/boards/search?name=free&type=category
router.get('/search', authUtil.isLoggedin,async (req, res) => {
 
 let {name, type} = req.query;
 console.log("name: " + name);
 console.log("type: " + type);

    let is_love;
if(!req.decoded){
    if_user = 0;//비회원이 검색시
}else{
    if_user = 1;//user사용자일땐
}

    let getBoardSearchQuery  = "SELECT * FROM board"
    if(name || type) getBoardSearchQuery+= ` WHERE`;
    if(name) getBoardSearchQuery+= ` name LIKE '%${name}%'`;
    if(name && type) getBoardSearchQuery+= ` AND`;
    if(type) getBoardSearchQuery+= ` type LIKE '%${type}%',`;
    if(type) getBoardSearchQuery = getBoardSearchQuery.slice(0, getBoardSearchQuery.length-1);
    console.log(getBoardSearchQuery);
    const getBoardSearchResult = await db.queryParam_None(getBoardSearchQuery);
    console.log(getBoardSearchResult[0].length);
    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getBoardSearchResult ){
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    }
    else if(getBoardSearchResult[0].length === 0) { //쿼리문이 실패했을 때

        res.status(500).send(defaultRes.successTrue(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_NOTHING,getBoardSearchResult[0]));
    } else { //쿼리문이 성공했을 때
        let ans  = JSON.parse(JSON.stringify(getBoardSearchResult[0]));
    
//        ans = getBoardSearchResult[0];
        ans[0]["is_love"] = if_user;
            if(!req.decoded){
                ans[0]["userIdx"] = null;
            }
            else{
                    ans[0]["userIdx"] = req.decoded.user_idx;
            }
        console.log("Aaaa");
        console.log(ans);
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.GET_BOARD_SEARCH_SUCCESS,ans));
    }
});

//게시판 요청 okdk
router.post("/request", authUtil.isLoggedin, async(req, res)=>{
    const {name,link} = req.body;
    //저장 시 필수 값인 게시물Id와 제목(title)이 없으면 실패 response 전송

    if (!name || !link) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    let getBoardRequestQuery  = "SELECT idx FROM board_request WHERE name = ?";
    const getBoardRequestResult = await db.queryParam_Parse(getBoardRequestQuery,name);
    
    const request_idx = JSON.parse(JSON.stringify(getBoardRequestResult[0])) || null;
    
    let postBoardRequestResult = '';
    let updateBoardRequestResult = '';
    if(request_idx.length === 0){
        //없으면
        //res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.POST_BOARD_REQUEST_ERROR));
        postBoardRequestQuery = `INSERT INTO board_request(name, link,request_cnt) VALUES(?,?,1)`;
        postBoardRequestResult  = await db.queryParam_Parse(postBoardRequestQuery,[name,link]);
    
    }else{
        const req_idx = request_idx[0].idx;
    
        updateBoardRequestQuery = `UPDATE board_request SET request_cnt = request_cnt+ 1 WHERE idx = ?`;
        updateBoardRequestResult  = await db.queryParam_Parse(updateBoardRequestQuery,[req_idx]);
    
    }

        //user_request에 넣기

        let postUserBoardRequestQuery = `INSERT INTO user_board_request(user_idx,board_request_idx) VALUES(?,?)`;
        let postUserBoardRequestResult  = await db.queryParam_Parse(postUserBoardRequestQuery,[req.decoded.user_idx,request_idx[0].idx]);

        if(!postUserBoardRequestResult && !postBoardRequestResult && !updateBoardRequestResult){
            res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.POST_BOARD_REQUEST_ERROR));
        }else{
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.POST_BOARD_REQUEST_SUCCESS));
        }
});


//게시판 요청 완료 창 Okdk
router.get('/request/:boardRequestIdx',async (req, res) => {
    const {boardRequestIdx} = req. params;
    let getBoardRequestFinishedQuery  = "SELECT * FROM board_request WHERE idx = ?";


    const getBoardRequestFinishedResult = await db.queryParam_Parse(getBoardRequestFinishedQuery,[boardRequestIdx]);

    //쿼리문의 결과가 실패이면 null을 반환한다
    if (!getBoardRequestFinishedResult || getBoardRequestFinishedResult[0].length === 0) { //쿼리문이 실패했을 때
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.GET_BOARD_SEARCH_ERROR));
    } else { //쿼리문이 성공했을 때
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.GET_BOARD_SEARCH_SUCCESS,getBoardRequestFinishedResult[0]));
    }
});

module.exports = router;
