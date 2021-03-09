const cron = require('node-cron');
const request = require('request');
const db = require('../module/utils/pool');

const fs = require('fs');
const csv = require('csv-parser');


// 매일 24시에 NewVideo 크롤링 csv 파일 읽고,  Insert 

cron.schedule('0 0 * * *', () => {
//6열
    var dataArray= fs.readFileSync('../newoutput.csv', 'utf8').toString().split("\n");
    //var dataArray = data.split("\n"); //Be careful if you are in a \r\n world... 
    // Your array contains ['ID', 'D11', ... ] 
//for문
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
            
                      
        //hotcsv파일            

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



// 매일 24시에 HOToutput.csv 파일 읽고,  Insert
cron.schedule('0 0 * * *', () => {
//6열
      var dataArray= fs.readFileSync('../hotoutput.csv', 'utf8').toString().split("\n");
    //var dataArray = data.split("\n"); //Be careful if you are in a \r\n world... 
    // Your array contains ['ID', 'D11', ... ] 

//for문
    for(var i = 0;i<dataArray.length;i++){
        strArray = dataArray[i].split(',');

        console.log("strArray");
        console.log(strArray);
        console.log("dataArray");
        console.log(dataArray[i]);
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
            console.log("getchannelId");
            
          
            
        //hotcsv파일            

            if(!getCreatorIdxResult || getCreatorIdxResult.length == 0){
                console.log("creator_idx");
                console.log(getCreatorIdxResult);
            }else{
                var creator_idx = JSON.parse(JSON.stringify(getCreatorIdxResult[0][0])).idx;
                console.log(creator_idx);//4659
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


//그리고 어제 날짜 데이터들 delete
cron.schedule('0 0 * * *', () => {
	//select * FROM crecre.video WHERE insert_time <= date_format(now()-1,'%Y-%m-%d %h:%i');
	//DELETE FROM crecre.video WHERE insert_time <= date_format(now()-1,'%Y-%m-%d %h:%i');

        let getVideoIdxQuery= `SELECT idx FROM crecre.video WHERE insert_time <= date_format(now()-1,'%Y-%m-%d %h:%i')`;  
        const getVideoIdxResult = db.queryParam_None(getVideoIdxQuery)
        .then(result => {


            const deleteCreatorVideoQuery = `DELETE FROM crecre.video WHERE insert_time <= date_format(now()-1,'%Y-%m-%d %h:%i')`;
            const deleteCreatorVideoResult = db.queryParam_None(deleteCreatorVideoQuery)
            .then(res=> {
                console.log('then');
                console.log(res);
            })
            .catch(error => {
                console.log(error);
            });

        })
        .catch(err => {
        console.log(err);
        });

    }