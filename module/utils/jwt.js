var randtoken = require('rand-token');
const jwt = require('jsonwebtoken');
const secretOrPrivateKey = "jwtSecretKey!";
// 원래 expiresIn은 30분이나 1시간으로 잡는게 적당하지만,
// 실습이니 그냥 14일로 잡음
const options = {
    algorithm: "HS256",
    expiresIn: "14d",
    issuer: "yang"
};

const refreshOptions = {
    algorithm: "HS256",
    expiresIn: "28d",
    issuer: "yang"
};

module.exports = {
    sign: (user) => {

        const payload = {
            user_idx: user[0].idx,
            grade: user[0].grade,
            name: user[0].name
        };
        const result = {
            token: jwt.sign(payload, secretOrPrivateKey, options),
            refreshToken: randtoken.uid(256)
        };
        //refreshToken을 만들 때에도 다른 키를 쓰는게 좋다.

        return result;
    },
    verify: (token) => {
        let decoded;
        try {
            decoded = jwt.verify(token, secretOrPrivateKey);
        } catch (err) {
            if (err.message === 'jwt expired') {
                console.log('expired token');
                return -3;
            } else if (err.message === 'invalid token') {
                console.log('invalid token');
                return -2;
            } else {
                console.log("invalid token");
                return -2;
            }
        }
        return decoded;
    },
    refresh: (user) => {
        const payload = {
            user_idx: user[0].idx,
            grade: user[0].grade,
            name: user[0].name
        };

        return jwt.sign(payload, secretOrPrivateKey, options);
    }
};