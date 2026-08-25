import { pool } from "../db/db.ts";

interface RequestLog {
    method:string;
    path:string;
    upstream:string;
    statusCode:number;
    latency:number;
    reqSize:number;
    resSize:number;
}

export async function logRequest(
    data:RequestLog
){

    await pool.query(
        `
        INSERT INTO requests_log
        (
            method,
            path,
            upstream,
            status_code,
            latency_ms,
            req_body_size,
            res_body_size
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
            data.method,
            data.path,
            data.upstream,
            data.statusCode,
            data.latency,
            data.reqSize,
            data.resSize
        ]
    );

}