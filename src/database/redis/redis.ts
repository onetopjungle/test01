import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Kết nối với Redis
const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || "",
    db: 0,
});

export default redis;
