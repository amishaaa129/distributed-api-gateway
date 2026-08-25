import { pool } from "../db/db.ts";


async function seed(){

    for(let i=0;i<1000;i++){

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
            "GET",
            "/api/orders",
            i%2===0
                ? "orders"
                : "users",
            i%10===0
                ? 500
                : 200,
            Math.floor(
                Math.random()*100
            ),
            20,
            200
        ]);

    }


    console.log(
        "1000 logs inserted"
    );

    process.exit();

}


seed();