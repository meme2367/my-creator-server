//dbConfig 에서는 mysql 모듈이 아닌 promise-mysql 모듈을 사용합니다!
//async/await 문법을 사용하기 위해서죠.
//dbConfig 파일을 확인해주세요

const pool = require('../../config/db_config');

module.exports = { // 두 개의 메소드 module화
    queryParam_None: async(...args) => { // (...args) expression은 arrow function 사
        const query = args[0];
        let result;

        console.log(query);

        try {
            var connection = await pool.getConnection(); // connection을 pool에서 하나 가져온다.
            result = await connection.query(query); // query문의 결과 || null 값이 result에 들어간다.

        } catch (err) {
            console.log(err);
            connection.rollback(() => {});
            next(err);
        } finally {
            connection.release(); // waterfall 에서는 connection.release()를 사용했지만, 이 경우 pool.releaseConnection(connection) 을 해준다.
            return result;
        }

    },
    queryParam_Arr: async(...args) => {
        const query = args[0];
        const value = args[1]; // array
        let result;

        try {
            var connection = await pool.getConnection(); // connection을 pool에서 하나 가져온다.
            result = await connection.query(query, value); // 두 번째 parameter에 배열 => query문에 들어갈 runtime 시 결정될 value
        } catch (err) {
            console.log(err);
            connection.rollback(() => {});
            next(err);
        } finally {
            pool.releaseConnection(connection); // waterfall 에서는 connection.release()를 사용했지만, 이 경우 pool.releaseConnection(connection) 을 해준다.
            return result;
        }
    },
    queryParam_Parse: async(inputquery, inputvalue, cb) => {
        const query = inputquery;
        const value = inputvalue;
        let result;

        try {
            var connection = await pool.getConnection(); 

            result = await connection.query(query, value) || null;
            console.log(query);
        } catch (err) {
		    console.log(err);
            connection.rollback(() => {});
            next(err);
        } finally {
            connection.release();
            if(cb){
                cb(result);
            }
            return result;
        }
    },
    Transaction: async(...args) => {
        let result = "Success";

        try {
            var connection = await pool.getConnection();
            await connection.beginTransaction();

            await args[0](connection, ...args);
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            console.log("mysql error! err log =>" + err);
            result = undefined;
        } finally {
            connection.release();
            return result;
        }
    }
};
