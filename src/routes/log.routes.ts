import express from "express";
import { pool } from "../db/db.js";

const router = express.Router();

router.get("/logs", async(req,res)=>{

    try{

        const {
            upstream,
            status,
            from
        } = req.query;


        let query = `
            SELECT *
            FROM requests_log
            WHERE 1=1
        `;


        const values:any[]=[];


        if(upstream){

            values.push(upstream);

            query += `
            AND upstream=$${values.length}
            `;
        }


        if(status){

            values.push(Number(status));

            query += `
            AND status_code=$${values.length}
            `;
        }


        if(from){

            values.push(from);

            query += `
            AND timestamp >= $${values.length}
            `;
        }


        query += `
        ORDER BY timestamp DESC
        LIMIT 100
        `;


        const result =
            await pool.query(
                query,
                values
            );


        res.json({
            count:
                result.rows.length,

            logs:
                result.rows
        });


    }
    catch(error:any){

        res.status(500).json({
            message:error.message
        });
    }

});


export default router;