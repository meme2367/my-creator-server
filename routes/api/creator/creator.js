
var express = require('express');
var router = express.Router();

const upload = require('../../../config/multer');
const defaultRes = require('../../../module/utils/utils');
const statusCode = require('../../../module/utils/statusCode');
const resMessage = require('../../../module/utils/responseMessage');
const db = require('../../../module/utils/pool');
const authUtil = require('../../../module/utils/authUtils');
const moment = require('moment');
const jwtUtil = require('../../../module/utils/jwt');

//4. 크리에이터 프로필 조회
//크리에이터명 프로필사진 크리에이터설명 카테고리(먹방2위)  즐겨찾는유저(팬게시판 좋아요) 구독자 누적조회수 
//랭크 등급, 업적등급
//팬게시판 여부
//랭킹 경험치, 업적 경험치(마스터일땐 경험치 없다)
//랭킹 이미지,업적 이미지!!!! 등급 이미지!!!!!!!!!!!
//순위
//카테고리 먹방 2위!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
router.get('/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;

    const getCreatorPrifileQuery = `SELECT c.*,h.name AS 'category', bc.creator_idx AS 'is_board' 
    FROM (( (creator c INNER JOIN creator_category cc ON c.idx = cc.creator_idx) 
    INNER JOIN hashtag h ON h.idx = cc.hashtag_idx)
    INNER JOIN board_creator bc ON bc.creator_idx = c.idx) WHERE c.idx = ?`;
    const getCreatorPrifileResult = await db.queryParam_Parse(getCreatorPrifileQuery, [creatorIdx]);

    if (!getCreatorPrifileResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_SELECT_PROFILE_SUCCESS, getCreatorPrifileResult));
    }
});




//크리에이터 프로필의 스탯조회
//토탈 3.6점해야함!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//192명 참여
//스탯5개

router.get('/stat/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;

    const getCreatorPrifileQuery = `SELECT cs.idx,cs.creator_idx,
    COUNT(cs.user_idx) AS'stat_vote_cnt',AVG(cs.stat1) AS'stat1',AVG(cs.stat2)AS'stat2',AVG(cs.stat3)AS'stat3',
    AVG(cs.stat4)AS'stat4',AVG(cs.stat5)AS'stat5'
    FROM creator_stat cs WHERE cs.creator_idx = `;
    const getCreatorPrifileResult = await db.queryParam_Parse(getCreatorPrifileQuery, [creatorIdx]);

    if (!getCreatorPrifileResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_SELECT_PROFILE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_SELECT_PROFILE_SUCCESS, getCreatorPrifileResult));
    }
});


//크리에이터 프로필의 스탯 등록(능력평점 참여)
//5개 중 하나라도 미입력시 미입력나오게!!!!!!
//크리에이터 설명 해시태그 #먹방 #대식가는 나중에
//크리에이터 프로필의 스탯 등록 (해쉬태그 등록)
//해쉬태그 설명!!!!!!!!!!! 단어 하나!!!!!!!!!!!!!!!!!!!!!!












//5. 크리에이터 영상 조회 
router.get('/:creatorIdx/popularvideo', async (req, res) => {
    const { creatorIdx } = req.params;

    const getPopularVideoQuery = "SELECT * FROM popular_video WHERE creator_idx = ?";
    const getPopularVideoResult = await db.queryParam_Parse(getPopularVideoQuery, [creatorIdx]);

    if (!getPopularVideoResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_POPULARVIDEO_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_POPULARVIDEO_SELECT_SUCCESS, getPopularVideoResult));
    }
});


//7. 구독자수별 차트 조회 ok
router.get('/famous', async (req, res) => {
    const getFollowerQuery = "SELECT idx FROM creator ORDER BY follower_cnt DESC";
    const getFollowerResult = await db.queryParam_Parse(getFollowerQuery);

    if (!getFollowerResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.FOLLOWER_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.FOLLOWER_SELECT_SUCCESS, getFollowerResult));
    }
});

//8. 특정 크리에이터 구독자수 조회 ok
router.get('/followers/:creatorIdx', async (req, res) => {
    const { creatorIdx } = req.params;

    const getCreatorFollowerQuery = "SELECT follower_cnt FROM creator WHERE idx = ?";
    const getCreatorFollowerResult = await db.queryParam_Parse(getCreatorFollowerQuery, [creatorIdx]);

    if (!getCreatorFollowerResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_FOLLOWER_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_FOLLOWER_SELECT_SUCCESS, getCreatorFollowerResult));
    }
});

//9. 크리에이터 검색 ok
router.get('/search', async (req, res) => {
    const { name } = req.query;

    const getCreatorSearchQuery = "SELECT * FROM creator WHERE name = ?";
    const getCreatorSearchResult = await db.queryParam_Parse(getCreatorSearchQuery, [name]);

    if (!getCreatorSearchResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_NAME_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_NAME_SELECT_SUCCESS, getCreatorSearchResult));
    }
});


//10. 해시태그별 크리에이터 목록 조회  ok
//수정!!!!!!!!!!!!!!!!!!!!!!!!!!
router.get('/search/hashtag', async (req, res) => {
    const { hashtag } = req.query;

    const getHashtagIdxQuery = "SELECT idx FROM hashtag WHERE name = ?";
    const getHashtagIdxResult = await db.queryParam_Parse(getHashtagIdxQuery, [hashtag]);

    const GetHashtagIdx = getHashtagIdxResult[0].idx;
    console.log(GetHashtagIdx);

    if (!getHashtagIdxResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.HASHTAG_SELECT_ERROR));
    } else {
        const getCreatorHashtagQuery = "SELECT creator_idx FROM creator_hashtag WHERE hashtag_idx = ?";
        const getCreatorHashtagResult = await db.queryParam_Parse(getCreatorHashtagQuery, [GetHashtagIdx]);

        if (!getCreatorHashtagResult) {
            console.log(getCreatorHashtagResult);
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_HASHTAG_SELECT_ERROR));
        } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_HASHTAG_SELECT_SUCCESS, getCreatorHashtagResult));
        }
    }
});


// //11. 카테고리별 크리에이터 목록 조회 ok 
//수정!!!!!!!!!!!!!!!!!!!!!!!!!!
// // *** authUtil.isAdmin 추가해야함.!!!!!!!!!!!!!!!!!!!!!!!!!
router.get('/search/category', async (req, res) => {
    const { category } = req.query;

    const getCategoryIdxQuery = "SELECT idx FROM hashtag WHERE name = ?";
    const getCategoryIdxResult = await db.queryParam_Parse(getCategoryIdxQuery, [category]);

    const GetCategoryIdx = getCategoryIdxResult[0].idx;
    console.log(GetCategoryIdx);

    if (!getCategoryIdxResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CATEGORY_SELECT_ERROR));
    } else {
        const getCreatorCategoryQuery = "SELECT creator_idx FROM creator_category WHERE hashtag_idx = ?";
        const getCreatorCategoryResult = await db.queryParam_Parse(getCreatorCategoryQuery, [GetCategoryIdx]);

        if (!getCreatorCategoryResult) {
            console.log(getCreatorCategoryResult);
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_CATEGORY_SELECT_ERROR));
        } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_CATEGORY_SELECT_SUCCESS, getCreatorCategoryResult));
        }
    }
});


// //12. 크리에이터 해시태그 추가 -> test해야함
// // *** authUtil.isAdmin 추가해야함.!!!!!!!!!!!!!!!!!!!!!!!!!
router.post('/:creatorIdx/hashtag/:hashtagIdx', (req, res) => {
    const { creatorIdx, hashtagIdx } = req.params;

    const postCreatorHashtagQuery = "INSERT INTO creator_hashtag (creator_idx, hashtag_idx) VALUES(?, ?)";
    const postCreatorHashtagResult = db.queryParam_Parse(postCreatorHashtagQuery, [creatorIdx, hashtagIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_HASHTAG_INSERT_ERROR));
        } else {
            res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_HASHTAG_INSERT_SUCCESS));
        }
    });
});


//CREATOR_HASHTAG_DELETE_SUCCESS

// //13. 크리에이터 해시태그 삭제 -> test해야함
// // *** authUtil.isAdmin 추가해야함.!!!!!!!!!!!!!!!!!!!!!!!!!
//아무것도 삭제되지 않았을 경우 메시지 보내기!!!!1
router.delete('/:creatorIdx/hashtag/:hashtagIdx', async (req, res) => {
    const { creatorIdx, hashtagIdx } = req.params;
    const params = [creatorIdx, hashtagIdx];

    const deleteCreatorHashtagQuery = "DELETE FROM creator WHERE creator_idx = ? AND hashtag_idx = ?";
    const deleteCreatorHashtagResult = await db.queryParam_Parse(deleteCreatorHashtagQuery, params);

    if (!deleteCreatorHashtagResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_DELETE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_DELETE_SUCCESS));
    }
});

// //14. 크리에이터 카테고리 추가 -> test해야함
// // *** authUtil.isAdmin 추가해야함.!!!!!!!!!!!!!!!!!!!!!!!!!
router.post('/:creatorIdx/category/:categoryIdx', (req, res) => {
    const { creatorIdx, categoryIdx } = req.params;

    const postCreatorCategoryQuery = "INSERT INTO creator_hashtag (creator_idx, hashtag_idx) VALUES(?, ?)";
    const postCreatorCategoryResult = db.queryParam_Parse(postCreatorCategoryQuery, [creatorIdx, categoryIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_INSERT_ERROR));
        } else {
            res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_INSERT_SUCCESS));
        }
    });
});

// //15. 크리에이터 카테고리 삭제 -> test해야함
// // *** authUtil.isAdmin 추가해야함.!!!!!!!!!!!!!!!!!!
router.delete('/:creatorIdx/category/:categoryIdx', async(req, res) => {
    const { creatorIdx, categoryIdx } = req.params;
    const params = [creatorIdx, categoryIdx];

    const deleteCreatorHashtagQuery = "DELETE FROM creator WHERE creator_idx = ? AND hashtag_idx = ?";
    const deleteCreatorHashtagResult = await db.queryParam_Parse(deleteCreatorHashtagQuery, params);

    if (!deleteCreatorHashtagResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_DELETE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_DELETE_SUCCESS));
    }
});


// //16. 누적 조회수별 조회 (일일)
// router.get('/creators/view/today', async(req, res) => {
//     const {creatorIdx} = req.params;

//쿼리작성 참고
// Select DATEPART(dd, order_dt), count(order_no) From 주문테이블
// group by DATEPART(dd, order_dt)
// order by DATEPART(dd, order_dt)

//     const getCommentsQuery = "SELECT * FROM comment WHERE episode_idx = ?";
//     const getCommentsResult = await db.queryParam_Parse(getCommentsQuery, [creatorIdx]);

//     if (!getCommentsResult) {
//         res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.COMMENT_SELECT_ERROR));
//     } else {
//         res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.COMMENT_SELECT_SUCCESS, getCommentsResult));
//     }
// });

// //17. 누적 조회수별 조회 (월별)
// router.get('/creators/view/month', async(req, res) => {
//     const {creatorIdx} = req.params;

//쿼리작성 참고
// Select DATEPART(mm, order_dt), count(order_no) From 주문테이블
// group by DATEPART(mm, order_dt)
// order by DATEPART(mm, order_dt)


//     const getCommentsQuery = "SELECT * FROM comment WHERE episode_idx = ?";
//     const getCommentsResult = await db.queryParam_Parse(getCommentsQuery, [creatorIdx]);

//     if (!getCommentsResult) {
//         res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.COMMENT_SELECT_ERROR));
//     } else {
//         res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.COMMENT_SELECT_SUCCESS, getCommentsResult));
//     }
// });

// //18. 누적 조회수별 조회 (전체)
// router.get('/creators/view/all', async(req, res) => {
//     const {creatorIdx} = req.params;


//쿼리작성 참고
// Select DATEPART(yy, order_dt), count(order_no) From 주문테이블
// group by DATEPART(yy, order_dt)
// order by DATEPART(yy, order_dt) 


//     const getCommentsQuery = "SELECT * FROM comment WHERE episode_idx = ?";
//     const getCommentsResult = await db.queryParam_Parse(getCommentsQuery, [creatorIdx]);

//     if (!getCommentsResult) {
//         res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.COMMENT_SELECT_ERROR));
//     } else {
//         res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.COMMENT_SELECT_SUCCESS, getCommentsResult));
//     }
// });

module.exports = router;
