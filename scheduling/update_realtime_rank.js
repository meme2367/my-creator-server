const cron = require('node-cron');
const db = require('../module/utils/pool');

// 이제 하루 지났으니 '오늘 랭크'는 '어제 랭크'로~
// 어제 랭크 <- 오늘 랭크
cron.schedule('*/20 * * * * *', () => {
    const selectSearchCountQuery = 
    `SELECT c.idx, cs.cnt 
    FROM creator c 
        LEFT JOIN (SELECT creator_idx, 
            COUNT(*) AS cnt FROM creator_search WHERE search_time >= date_add(now(), interval -1 day) 
    GROUP BY creator_idx) cs ON c.idx = cs.creator_idx 
    ORDER BY cs.cnt DESC;`;
    const selectSearchCountResult = db.queryParam_None(selectSearchCountQuery)
        .then(result => {
            if(result){
                const datas = result[0];
                
                datas.forEach(data1 => {
                    let rank = 1;
                    datas.forEach(data2 => {
                        if(data1.cnt < data2.cnt){
                            rank++;
                        }
                    });
                    if(!data1.cnt){
                        data1.cnt = 0;
                    }
                    const updateSearchCountRankQuery = 
                    `UPDATE creator_rank 
                    SET last_realtime_search_rank = current_realtime_search_rank, current_realtime_search_rank = ${rank} 
                    WHERE creator_idx = ${data1.idx};`;
                    const updateSearchCountRankResult = db.queryParam_None(updateSearchCountRankQuery);
                    const updateCurrentSearchCountQuery = 
                    `UPDATE creator
                    SET current_search_cnt = ${data1.cnt} 
                    WHERE idx = ${data1.idx};`;
                    // console.log(updateCurrentSearchCountQuery);
                    const updateCurrentSearchCountResult = db.queryParam_None(updateCurrentSearchCountQuery);
                });
            }
        })
        .catch(err => {
            console.log(err);
        });
});