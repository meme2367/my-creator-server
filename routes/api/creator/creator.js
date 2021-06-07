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


router.post('/', authUtil.isAdmin, upload.single('img'), (req, res) => {
    const { name, youtube_subscriber_cnt, youtube_view_cnt, contents, channel_id } = req.body;
    const profileUrl = req.file.location;
    const params = [name, profileUrl, youtube_subscriber_cnt, youtube_view_cnt, contents, channel_id];

    if (!name || !profileUrl || !youtube_subscriber_cnt || !youtube_view_cnt || !contents || !channel_id) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }
    const postCreatorQuery = "INSERT INTO creator(name, profile_url, youtube_subscriber_cnt, youtube_view_cnt,contents, channel_id) VALUES(?, ?, ?, ?, ?, ?)";
    const postCreatorsResult = db.queryParam_Parse(postCreatorQuery, params, function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_INSERT_ERROR));
        } else {
            res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_INSERT_SUCCESS));
        }
    });
});

router.put('/:creatorIdx', authUtil.isAdmin, upload.single('img'), (req, res) => {
    const { creatorIdx } = req.params;

    const { name, youtube_subscriber_cnt, youtube_view_cnt, contents, channel_id } = req.body;
    const profileUrl = req.file.location;
	
    if (!creatorIdx || (!name || !req.file || !youtube_subscriber_cnt || !youtube_view_cnt || !contents || !channel_id)) {
        res.status(200).send(defaultRes.successFalse(statusCode.BAD_REQUEST, resMessage.OUT_OF_VALUE));
    }

    let putCreatorQuery = "UPDATE creator SET ";
    if (name) putCreatorQuery += ` name = '${name}',`;
    if (req.file) putCreatorQuery += ` profile_url = '${profileUrl}',`;
    if (youtube_subscriber_cnt) putCreatorQuery += ` youtube_subscriber_cnt = '${youtube_subscriber_cnt}',`;
    if (youtube_view_cnt) putCreatorQuery += ` youtube_view_cnt = '${youtube_view_cnt}',`;
    if (contents) putCreatorQuery += ` contents = '${contents}',`;
    if (channel_id) putCreatorQuery += ` channel_id = '${channel_id}',`;
    putCreatorQuery = putCreatorQuery.slice(0, putCreatorQuery.length - 1);
    putCreatorQuery += " WHERE idx = ? ";

    db.queryParam_Parse(putCreatorQuery, [creatorIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_UPDATE_ERROR));
        } else {
            res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_UPDATE_SUCCESS));
        }
    });
});

router.delete('/:creatorIdx', authUtil.isAdmin, async (req, res) => {
    const { creatorIdx } = req.params;

    const deleteCreatorQuery = "DELETE FROM creator WHERE idx = ?";
    const deleteCreatorResult = await db.queryParam_Parse(deleteCreatorQuery, [creatorIdx]);

    if (!deleteCreatorResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_DELETE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_DELETE_SUCCESS));
    }
});


router.get('/:creatorIdx/popularvideo/three', async (req, res) => {
    const { creatorIdx } = req.params;
    const getPopularVideoQuery = `SELECT v.*, c.channel_id 
                            FROM video v 
                            INNER JOIN creator c ON v.creator_idx = c.idx 
                            WHERE c.idx = '${creatorIdx}' AND v.if_hot = 1
                            ORDER BY v.insert_time DESC LIMIT 3`;
    const getPopularVideoResult = await db.queryParam_Parse(getPopularVideoQuery, [creatorIdx]);

    if (!getPopularVideoResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_POPULARVIDEO_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_POPULARVIDEO_SELECT_SUCCESS, getPopularVideoResult[0]));
    }
});

router.get('/:creatorIdx/newvideo/three', async (req, res) => {
    const { creatorIdx } = req.params;

    const getNewVideoQuery =  `SELECT v.*, c.channel_id 
                            FROM video v 
                            INNER JOIN creator c ON v.creator_idx = c.idx 
                            WHERE c.idx = '${creatorIdx}' AND v.if_new = 1
                            ORDER BY v.insert_time DESC LIMIT 3`;
    const getNewVideoResult = await db.queryParam_Parse(getNewVideoQuery, [creatorIdx]);

    if (!getNewVideoResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_NEWVIDEO_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_NEWVIDEO_SELECT_SUCCESS, getNewVideoResult[0]));
    }
});

router.get('/all/subscribe/allrank', async (req, res) => {
    const getCratorAllRankQuery =
        `SELECT cr.last_all_subs_rank, cr.current_all_subs_rank AS ranking,
    c.profile_url, c.name AS creatorName, c.idx,
    c.youtube_subscriber_cnt, fg.img_url, ccc.name AS categoryName
    FROM creator c
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx
    INNER JOIN category ccc ON ccc.idx = cc.category_idx
    INNER JOIN follower_grade fg ON fg.idx = c.follower_grade_idx
    INNER JOIN creator_rank cr ON c.idx = cr.creator_idx
    ORDER BY ranking ASC LIMIT 100`;
    const getCratorAllRankResult = await db.queryParam_None(getCratorAllRankQuery);
    const result = getCratorAllRankResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_all_subs_rank - result[i].ranking;
        result[i]['upDown'] = upDown;
    }

    if (!getCratorAllRankResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_ALL_ALLSUBSCRIBE_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_ALL_ALLSUBSCRIBE_SELECT_SUCCESS, getCratorAllRankResult[0]));
    }
});

router.get('/all/subscribe/hotrank', async (req, res) => {
    const getCategoryIdxQuery =
    `SELECT cr.last_all_subs_rank, cr.cur_all_subs_rank AS ranking,
    c.profile_url, c.idx, c.name AS creatorName, c.youtube_subscriber_cnt, fg.img_url, ccc.name AS categoryName
    FROM creator c
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx
    INNER JOIN category ccc ON ccc.idx = cc.category_idx
    INNER JOIN follower_grade fg ON fg.idx = c.follower_grade_idx
    INNER JOIN creator_dayhot_rank cr ON c.idx = cr.creator_idx
    ORDER BY ranking ASC LIMIT 100`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_all_subs_rank - result[i].ranking;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_ALL_DAYHOTSUBSCRIBE_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_ALL_DAYHOTSUBSCRIBE_SUCCESS, getCreatorCategoryResult[0]));
    }
});


router.get('/all/view/allrank', async (req, res) => {
    const getCategoryIdxQuery = `SELECT cr.last_all_view_rank, cr.current_all_view_rank AS ranking, c.idx,
    c.profile_url, c.name AS creatorName, c.youtube_view_cnt, vg.img_url, ccc.name AS categoryName
    FROM creator c
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx
    INNER JOIN category ccc ON ccc.idx = cc.category_idx
    INNER JOIN view_grade vg ON vg.idx = c.view_grade_idx
    INNER JOIN creator_rank cr ON c.idx = cr.creator_idx
    ORDER BY ranking ASC LIMIT 100`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_all_view_rank - result[i].ranking;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_ALL_ALLVIEW_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_ALL_ALLVIEW_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});


router.get('/all/view/hotrank', async (req, res) => {
    const getCategoryIdxQuery = `SELECT cr.last_all_view_rank, cr.cur_all_view_rank AS ranking, c.idx,
    c.profile_url, c.name AS creatorName, c.youtube_view_cnt, vg.img_url, ccc.name AS categoryName
    FROM creator c
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx
    INNER JOIN category ccc ON ccc.idx = cc.category_idx
    INNER JOIN view_grade vg ON vg.idx = c.view_grade_idx
    INNER JOIN creator_dayhot_rank cr ON c.idx = cr.creator_idx
    ORDER BY ranking ASC LIMIT 100`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_all_view_rank - result[i].ranking;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_ALL_DAYHOTVIEW_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_ALL_DAYHOTVIEW_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});

router.get('/:categoryIdx/subscribe/allrank', async (req, res) => {
    const { categoryIdx } = req.params;

    const getCategoryIdxQuery = `SELECT cr.last_category_subs_rank, cr.current_category_subs_rank, c.idx, 
    ROW_NUMBER() OVER( ORDER BY cr.current_category_subs_rank  asc ) AS ranking,
    c.profile_url, c.name AS creatorName, c.youtube_subscriber_cnt, fg.img_url, ccc.name AS categoryName
    FROM creator c
    INNER JOIN creator_category cc ON cc.creator_idx = c.idx
    INNER JOIN category ccc ON ccc.idx = cc.category_idx
    INNER JOIN follower_grade fg ON fg.idx = c.follower_grade_idx
    INNER JOIN creator_rank cr ON c.idx = cr.creator_idx
    WHERE ccc.idx = '${categoryIdx}'
    ORDER BY c.youtube_subscriber_cnt DESC LIMIT 50`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_category_subs_rank - result[i].cur_category_subs_rank;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_ALLSUBSCRIBE_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_ALLSUBSCRIBE_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});


router.get('/:categoryIdx/subscribe/hotrank', async (req, res) => {
    const { categoryIdx } = req.params;
    const getCategoryIdxQuery = `SELECT cr.last_category_subs_rank, cr.cur_category_subs_rank, c.idx,
    ROW_NUMBER() OVER( ORDER BY cr.cur_category_subs_rank  asc ) AS ranking,
        c.profile_url, c.name AS creatorName, c.youtube_subscriber_cnt-c.last_subscriber_cnt AS youtube_subscriber_cnt, fg.img_url, ccc.name AS categoryName
        FROM creator c
        INNER JOIN creator_category cc ON cc.creator_idx = c.idx
        INNER JOIN category ccc ON ccc.idx = cc.category_idx
        INNER JOIN follower_grade fg ON fg.idx = c.follower_grade_idx
        INNER JOIN creator_dayhot_rank cr ON c.idx = cr.creator_idx
        WHERE ccc.idx = '${categoryIdx}'
        ORDER BY ranking ASC LIMIT 50`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_category_subs_rank - result[i].cur_category_subs_rank;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_DAYHOTSUBSCRIBE_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_DAYHOTSUBSCRIBE_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});


router.get('/:categoryIdx/view/allrank', async (req, res) => {
    const { categoryIdx } = req.params;
    const getCategoryIdxQuery = `SELECT cr.last_category_view_rank, cr.current_category_view_rank, c.idx,
    ROW_NUMBER() OVER( ORDER BY c.youtube_view_cnt DESC) AS ranking,
        c.profile_url, c.name AS creatorName, c.youtube_view_cnt, vg.img_url, ccc.name AS categoryName
        FROM creator c
        INNER JOIN creator_category cc ON cc.creator_idx = c.idx
        INNER JOIN category ccc ON ccc.idx = cc.category_idx
        INNER JOIN view_grade vg ON vg.idx = c.view_grade_idx
        INNER JOIN creator_rank cr ON c.idx = cr.creator_idx
        WHERE ccc.idx = '${categoryIdx}'
        ORDER BY c.youtube_view_cnt DESC LIMIT 50`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_category_view_rank - result[i].current_category_view_rank;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_ALLVIEW_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_ALLVIEW_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});


router.get('/:categoryIdx/view/hotrank', async (req, res) => {
    const { categoryIdx } = req.params;
    const getCategoryIdxQuery = `SELECT cr.last_category_view_rank, cr.cur_category_view_rank, c.idx,
    RANK() OVER( ORDER BY cr.cur_category_view_rank  asc ) AS ranking,
        c.profile_url, c.name AS creatorName, c.youtube_view_cnt - c.last_view_cnt AS youtube_view_cnt, vg.img_url, ccc.name AS categoryName
        FROM creator c
        INNER JOIN creator_category cc ON cc.creator_idx = c.idx
        INNER JOIN category ccc ON ccc.idx = cc.category_idx
        INNER JOIN view_grade vg ON vg.idx = c.view_grade_idx
        INNER JOIN creator_dayhot_rank cr ON c.idx = cr.creator_idx
        WHERE ccc.idx = '${categoryIdx}'
        ORDER BY ranking ASC LIMIT 50`;
    const getCreatorCategoryResult = await db.queryParam_None(getCategoryIdxQuery);
    const result = getCreatorCategoryResult[0];

    let upDown;
    for (var i = 0; i < result.length; i++) {
        upDown = result[i].last_category_view_rank - result[i].cur_category_view_rank;
        result[i]['upDown'] = upDown;
    }

    if (!getCreatorCategoryResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_DAYHOTVIEW_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_DAYHOTVIEW_SELECT_SUCCESS, getCreatorCategoryResult[0]));
    }
});
	




router.get('/allcreatorcnt', async (req, res) => {
    const getCreatorSearchQuery = "SELECT count(idx) AS creatorAllCnt FROM creator";
    const getCreatorSearchResult = await db.queryParam_None(getCreatorSearchQuery);

    if (!getCreatorSearchResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_NAME_SELECT_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_NAME_SELECT_SUCCESS, getCreatorSearchResult[0]));
    }
});

router.get('/creatorSearch', async (req, res) => {
   const { name } = req.query;
   const getCreatorSearchQuery = `SELECT c.profile_url, c.name AS creatorName, c.youtube_subscriber_cnt,
                                   fg.img_url, ccc.name AS categoryName, c.idx
                                   FROM creator c
                                   INNER JOIN follower_grade fg ON c.follower_grade_idx = fg.idx
                                   INNER JOIN creator_category cc ON cc.creator_idx = c.idx
                                   INNER JOIN category ccc ON ccc.idx = cc.category_idx
                                   WHERE c.name LIKE '%${name}%'`;
   const getCreatorSearchResult = await db.queryParam_None(getCreatorSearchQuery);
   if (!getCreatorSearchResult) {
       res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_NAME_SELECT_ERROR));
   } else {
       res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_NAME_SELECT_SUCCESS, getCreatorSearchResult[0]));
   }
});


router.post('/:creatorIdx/hashtag/:hashtagIdx', authUtil.isAdmin, async (req, res) => {
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

router.delete('/:creatorIdx/hashtag/:hashtagIdx', authUtil.isAdmin, async (req, res) => {
    const { creatorIdx, hashtagIdx } = req.params;

    const deleteCreatorHashtagQuery = "DELETE FROM creator_hashtag WHERE creator_idx = ? AND hashtag_idx = ?";
    const deleteCreatorHashtagResult = db.queryParam_Parse(deleteCreatorHashtagQuery, [creatorIdx, hashtagIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_HASHTAG_DELETE_ERROR));
        } else {
            res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_HASHTAG_DELETE_SUCCESS));
        }
    });
});


router.post('/:creatorIdx/category/:categoryIdx', authUtil.isAdmin, (req, res) => {
    const { creatorIdx, categoryIdx } = req.params;

    const postCreatorCategoryQuery = "INSERT INTO creator_category (creator_idx, category_idx) VALUES(?, ?)";
    const postCreatorCategoryResult = db.queryParam_Parse(postCreatorCategoryQuery, [creatorIdx, categoryIdx], function (result) {
        if (!result) {
            res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_INSERT_ERROR));
        } else {
            res.status(201).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_INSERT_SUCCESS));
        }
    });
});

router.delete('/:creatorIdx/category/:categoryIdx', authUtil.isAdmin, async (req, res) => {
    const { creatorIdx, categoryIdx } = req.params;
    const params = [creatorIdx, categoryIdx];

    const deleteCreatorHashtagQuery = "DELETE FROM creator_category WHERE creator_idx = ? AND category_idx = ?";
    const deleteCreatorHashtagResult = await db.queryParam_Parse(deleteCreatorHashtagQuery, params);

    if (!deleteCreatorHashtagResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_CATEGORY_DELETE_ERROR));
    } else {
        res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_CATEGORY_DELETE_SUCCESS));
    }
});

router.get('/chart/hot', async (req, res) => {
    const getCreatorSearchQuery = `SELECT c.idx AS creatorIdx, c.name AS creatorName, c.current_search_cnt AS searchCnt, 
    cr.current_realtime_search_rank AS ranking, cr.last_realtime_search_rank - cr.current_realtime_search_rank AS updown
    FROM creator c LEFT JOIN creator_rank cr ON c.idx = cr.creator_idx
    GROUP BY c.idx
    ORDER BY c.current_search_cnt DESC
    LIMIT 10;`;
    const getCreatorSearchResult = await db.queryParam_None(getCreatorSearchQuery);
    if (!getCreatorSearchResult) {
    res.status(200).send(defaultRes.successFalse(statusCode.INTERNAL_SERVER_ERROR, resMessage.CREATOR_LIST_BY_NAME_SELECT_ERROR));
    } else {
    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.CREATOR_LIST_BY_NAME_SELECT_SUCCESS, getCreatorSearchResult[0]));
    }
});

module.exports = router;

