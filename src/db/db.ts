import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const connectDB = async () => {
    try {
        await pool.query("SELECT NOW()");
        console.log("Connected to PostgreSQL");
    } catch (err) {
        console.error("DB Connection Error:", err);
    }
};

export { connectDB, pool };