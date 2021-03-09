const cron = require('node-cron');
const request = require('request');
const db = require('../module/utils/pool');
const youtube_config = require('../config/youtube_config');

const baseUrl = youtube_config.BASE_URL;
const apiKey = youtube_config.API_KEY;


// 이제 하루 지났으니 '오늘 랭크'는 '어제 랭크'로~
// 어제 랭크 <- 오늘 랭크
cron.schedule('0 0 0 * * *', () => {
    const updateLastAllQuery = `UPDATE creator_rank SET last_category_view_rank = current_category_view_rank
                                                        , last_all_view_rank = current_all_view_rank
                                                        , last_category_subs_rank = current_category_subs_rank
                                                        , last_all_subs_rank = current_all_subs_rank;`;
    const updateLastDayHotQuery = `UPDATE creator_dayhot_rank SET last_all_subs_rank = cur_all_subs_rank
                                                        , last_category_subs_rank = cur_category_subs_rank
                                                        , last_all_view_rank = cur_all_view_rank
                                                        , last_category_view_rank = cur_category_view_rank;`;
    const updateLastAllResult = db.queryParam_None(updateLastAllQuery)
        .then(result => {
            console.log('then1');
            console.log(result);
        })
        .catch(err => {
            console.log(err);
        });
    const updateLastDayHotResult = db.queryParam_None(updateLastDayHotQuery)
        .then(result => {
            console.log('then2');
            console.log(result);
        })
        .catch(err => {
            console.log(err);
        });
});

// 유튜브에서 새로운 데이터 크롤링
cron.schedule('0 1 0 * * *', () => {
    const selectCreatorQuery = "SELECT idx, name, channel_id FROM creator";
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                // console.log(row);
                const query = `part=snippet,statistics&id=${row.channel_id}&key=${apiKey}`;
                const requestUrl = baseUrl + query;
                httpGet(row.idx, requestUrl);
            });
        })
        .catch(err => {
            console.log(err);
        });
})

// 전체-일간-구독자
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = "SELECT idx, youtube_subscriber_cnt, last_subscriber_cnt FROM creator c;";
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                let thisDiff = row.youtube_subscriber_cnt - row.last_subscriber_cnt;
                rows.forEach(row2 => {
                    let tempDiff = row2.youtube_subscriber_cnt - row2.last_subscriber_cnt;
                    if(tempDiff > thisDiff){
                        rank++;
                    }
                });
                const update_query = `UPDATE creator_dayhot_rank SET cur_all_subs_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
        })
        .catch(err => {
            console.log(err);
        });
})

// 전체-일간-조회수
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = "SELECT idx, youtube_view_cnt, last_view_cnt FROM creator c;";
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                let thisDiff = row.youtube_view_cnt - row.last_view_cnt;
                rows.forEach(row2 => {
                    let tempDiff = row2.youtube_view_cnt - row2.last_view_cnt;
                    if(tempDiff > thisDiff){
                        rank++;
                    }
                });
                const update_query = `UPDATE creator_dayhot_rank SET cur_all_view_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
        })
        .catch(err => {
            console.log(err);
        });
})


// 카테고리-일간-구독자  creator_dayhot_rank     last_category_subs_rank cur_category_subs_rank
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = 
    `SELECT idx, youtube_subscriber_cnt, last_subscriber_cnt, category_idx
    FROM creator c INNER JOIN creator_category ON c.idx = creator_category.creator_idx;`;
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                let thisDiff = row.youtube_subscriber_cnt - row.last_subscriber_cnt;
                rows.forEach(row2 => {
                    if (row.category_idx === row2.category_idx) {
                        let tempDiff = row2.youtube_subscriber_cnt - row2.last_subscriber_cnt;
                        if (tempDiff > thisDiff) {
                            rank++;
                        }
                    }
                });
                const update_query = `UPDATE creator_dayhot_rank SET cur_category_subs_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
            // console.log(update_query);
        })
        .catch(err => {
            console.log(err);
        });
})


// 카테고리-일간-조회수  creator_dayhot_rank     last_category_view_rank cur_category_view_rank
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = `SELECT idx, youtube_view_cnt, last_view_cnt, category_idx
    FROM creator c INNER JOIN creator_category ON c.idx = creator_category.creator_idx;`;
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                let thisDiff = row.youtube_view_cnt - row.last_view_cnt;
                rows.forEach(row2 => {
                    if (row.category_idx === row2.category_idx) {
                        let tempDiff = row2.youtube_view_cnt - row2.last_view_cnt;
                        if (tempDiff > thisDiff) {
                            rank++;
                        }
                    }
                });
                const update_query = `UPDATE creator_dayhot_rank SET cur_category_view_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
            // console.log(update_query);
        })
        .catch(err => {
            console.log(err);
        });
})

// 전체-전체-구독자
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = "SELECT idx, youtube_subscriber_cnt FROM creator c;";
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                rows.forEach(row2 => {
                    if(row2.youtube_subscriber_cnt > row.youtube_subscriber_cnt){
                        rank++;
                    }
                });
                const update_query = `UPDATE creator_rank SET current_all_subs_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
        })
        .catch(err => {
            console.log(err);
        });
})

// 전체-전체-조회수
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = "SELECT idx, youtube_view_cnt FROM creator c;";
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                rows.forEach(row2 => {
                    if(row2.youtube_view_cnt > row.youtube_view_cnt){
                        rank++;
                    }
                });
                const update_query = `UPDATE creator_rank SET current_all_view_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
        })
        .catch(err => {
            console.log(err);
        });
})


// 카테고리-전체-구독자 creator_rank last_category_subs_rank current_category_subs_rank
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = `SELECT idx, youtube_subscriber_cnt, last_subscriber_cnt, category_idx
    FROM creator c INNER JOIN creator_category ON c.idx = creator_category.creator_idx;`;
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                rows.forEach(row2 => {
                    if (row.category_idx === row2.category_idx) {
                        if (row2.youtube_subscriber_cnt > row.youtube_subscriber_cnt) {
                            rank++;
                        }
                    }
                });
                const update_query = `UPDATE creator_rank SET current_category_subs_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
            // console.log(update_query);
        })
        .catch(err => {
            console.log(err);
        });
})


// 카테고리-전체-조회수  creator_rank테이블 last_category_view_rank current_category_view_rank
cron.schedule('0 3 0 * * *', () => {
    const selectCreatorQuery = `SELECT idx, youtube_view_cnt, last_view_cnt, category_idx
    FROM creator c INNER JOIN creator_category ON c.idx = creator_category.creator_idx;`;
    const selectCreatorsResult = db.queryParam_None(selectCreatorQuery)
        .then(result => {
            return result[0];
        })
        .then(rows => {
            rows.forEach(row => {
                let rank = 1;
                rows.forEach(row2 => {
                    if (row.category_idx === row2.category_idx) {
                        if (row2.youtube_view_cnt > row.youtube_view_cnt) {
                            rank++;
                        }
                    }
                });
                const update_query = `UPDATE creator_rank SET current_category_view_rank = ${rank} WHERE creator_idx = ${row.idx}; `;
                const updateLastResult = db.queryParam_None(update_query);
            });
            // console.log(update_query);
        })
        .catch(err => {
            console.log(err);
        });
})

function httpGet(idx, url) {
        request(url, {
            json: true
        }, (err, res, body) => {
            if (err) {
                return console.log(err);
            }
            if (body.items[0]) {
                const { snippet, statistics } = body.items[0];

                update(snippet, statistics, idx);
            }
        });
    }

function update(snippet, statistics, idx) {
        const { title, description, publishedAt, thumbnails } = snippet;
        const { viewCount, subscriberCount, videoCount } = statistics;
        const thumbnail = thumbnails.medium.url;
        const createTime = publishedAt.replace('Z', '');
        const params = [title, description, createTime, viewCount, subscriberCount, viewCount, subscriberCount, idx];

        //today_youtube_view_cnt , today_youtube_subscriber_cnt
        const updateCreatorQuery = 
        `UPDATE creator SET name=?, contents=?, create_time=?, 
        last_view_cnt = youtube_view_cnt, last_subscriber_cnt = youtube_subscriber_cnt, youtube_view_cnt=?, youtube_subscriber_cnt=?,
                view_grade_idx = (SELECT idx FROM view_grade vg WHERE vg.view_cnt <= ? ORDER BY idx DESC LIMIT 1),
                follower_grade_idx = (SELECT idx FROM follower_grade fg WHERE fg.follower_cnt <= ? ORDER BY idx DESC LIMIT 1)
                WHERE idx=?`;
        const updateCreatorsResult = db.queryParam_Parse(updateCreatorQuery, params)
            .then(result => {
                console.log('then');
                console.log(result);
            })
            .catch(err => {
                console.log(err);
            });
    }