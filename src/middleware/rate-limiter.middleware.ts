import { pool } from "../db/db.js";
import redis from "../db/redis.js";

const WINDOW = Number(process.env.RATE_LIMIT_WINDOW);
const LIMIT = Number(process.env.RATE_LIMIT_MAX);

const rateLimiter = async(req,res,next) => {
    try {
        const apiKey = req.header("X-API-Key");
    
        if(!apiKey){
            return res.status(401).json({
                    message: "API key missing"
                });
        }
    
        const keyResult = await pool.query(`select * from api_keys where api_key = $1`,[apiKey]);
    
        if(keyResult.rows.length===0){
            return res.status(401).json({
                    message: "Invalid API key"
                });
        }
    
        const redisKey = `rate_limit:${apiKey}`;
        const now = Date.now();
        const windowStart = now-WINDOW*1000;
        const transaction = redis.multi();
    
        transaction.zRemRangeByScore(redisKey,0,windowStart);
        
        transaction.zAdd(redisKey,[
            {
                score: now,
                value: `${now}-${Math.random()}`
            }
        ]);
    
        transaction.zCard(redisKey);
    
        transaction.expire(redisKey,WINDOW);
    
        const result = await transaction.exec();
    
        const requestCount = Number(result?.[2]); //result of transaction.zCard
    
        if (requestCount > LIMIT) {
            return res.status(429).json({
                message: "Rate limit exceeded"
            });
        }
        next();
    } catch (error:any) {
        return res.status(500).json({
            message: error.message
        });
    }
}

export default rateLimiter;
