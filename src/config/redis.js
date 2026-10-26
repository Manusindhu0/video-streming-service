import "dotenv/config";
import Redis from "ioredis";

export const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required for BullMQ
});

export default redisClient;
