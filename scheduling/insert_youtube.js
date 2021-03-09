const request = require('request');
const db = require('../module/utils/pool');
const youtube_config = require('../config/youtube_config');
var fs = require("fs");

const crawledData = 'youtube_link.json';
const baseUrl = youtube_config.BASE_URL;
const apiKey = youtube_config.API_KEY;

const links = openJson(crawledData);
console.log(links);

links.forEach(link => {
    const channelId = link.url.replace('http://www.youtube.com/channel/','');
    const query = `part=snippet,statistics&id=${channelId}&key=${apiKey}`;
    const requestUrl = baseUrl + query;
    httpGet(requestUrl);
});

function httpGet(url) {
    request(url, {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        if(body.items && body.items[0]){
            const {snippet, statistics, id} = body.items[0];

            insertNew(snippet, statistics, id);
        }else{
            console.log(body);
        }
    });
}

function openJson(path){
    console.log("\n *START* \n");
    const content = fs.readFileSync(path);
    return JSON.parse(content).link;
}

function insertNew(snippet, statistics, id){
    const {title, description, publishedAt, thumbnails} = snippet;
    const {viewCount, subscriberCount, videoCount} = statistics;
    const thumbnail = thumbnails.medium.url;
    const createTime = publishedAt.replace('Z','');

    console.log(title);
    // console.log(description);
    // console.log(createTime);
    // console.log(thumbnail);
    // console.log(viewCount);
    // console.log(subscriberCount);
    // console.log(videoCount);

    const params = [title, description, createTime, subscriberCount, viewCount, thumbnail, id];
    const insertCreatorQuery = "INSERT INTO creator(name, contents, create_time, youtube_subscriber_cnt, youtube_view_cnt, profile_url, channel_id)\
    VALUES(?,?,?,?,?,?,?)";
    const insertCreatorsResult = db.queryParam_Parse(insertCreatorQuery, params)
    .then((result,reject)=>{
        console.log('then');
        console.log(result);
    })
    .catch(err=>{
        console.log(err);
    });
}
